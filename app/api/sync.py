import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.services.live_sync_service import LiveSyncService

router = APIRouter(prefix="/api/sync", tags=["Live Sync"])


@router.get("/version", summary="Get Current Live Sync Version")
def get_sync_version(current_user: User = Depends(get_current_user)):
    return JSONResponse(
        content=LiveSyncService.get_state(),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@router.get("/stream", summary="SSE Live Change Stream")
async def stream_sync_events(
    request: Request,
    token: Optional[str] = Query(None, description="JWT access token for EventSource authentication"),
):
    auth_header = request.headers.get("Authorization", "")
    raw_token = token
    if not raw_token and auth_header.lower().startswith("bearer "):
        raw_token = auth_header[7:].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required for live sync stream.",
        )

    try:
        payload = decode_token(raw_token, is_refresh=False)
        if not payload.get("user_id"):
            raise ValueError("Missing user_id")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )

    async def event_generator():
        q = LiveSyncService.subscribe()
        last_sent_version = LiveSyncService.get_state().get("version", 0)
        try:
            # Initial handshake payload
            initial = LiveSyncService.get_state()
            yield f"event: sync\ndata: {json.dumps(initial)}\n\n"
            ping_ticks = 0

            while True:
                if await request.is_disconnected():
                    break
                try:
                    state = await asyncio.wait_for(q.get(), timeout=1.5)
                    ver = state.get("version", 0)
                    if ver != last_sent_version:
                        last_sent_version = ver
                        yield f"event: sync\ndata: {json.dumps(state)}\n\n"
                        ping_ticks = 0
                except asyncio.TimeoutError:
                    # Also check shared cross-worker version file
                    current = LiveSyncService.get_state()
                    ver = current.get("version", 0)
                    if ver != last_sent_version:
                        last_sent_version = ver
                        yield f"event: sync\ndata: {json.dumps(current)}\n\n"
                        ping_ticks = 0
                    else:
                        ping_ticks += 1
                        if ping_ticks >= 12:
                            ping_ticks = 0
                            yield ": keepalive\n\n"
        finally:
            LiveSyncService.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
