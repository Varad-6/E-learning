from collections import defaultdict, deque
import threading
import time
from typing import Deque, Dict
from fastapi import HTTPException, Request, status

from app.core.config import settings


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter with bounded bucket cleanup."""

    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_cleanup = time.monotonic()

    def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        if (settings.ENVIRONMENT or "").strip().lower() == "test":
            return
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            if now - self._last_cleanup > 300:
                stale_keys = [k for k, q in self._buckets.items() if not q or q[-1] < cutoff]
                for k in stale_keys:
                    del self._buckets[k]
                self._last_cleanup = now

            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= max_requests:
                retry_after = max(1, int(bucket[0] + window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again shortly.",
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


rate_limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP respecting X-Forwarded-For from reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit(key_prefix: str, max_requests: int, window_seconds: int):
    """FastAPI dependency factory enforcing per-IP sliding-window rate limits."""
    def _dependency(request: Request) -> None:
        client_ip = get_client_ip(request)
        rate_limiter.check(f"{key_prefix}:{client_ip}", max_requests=max_requests, window_seconds=window_seconds)

    return _dependency
