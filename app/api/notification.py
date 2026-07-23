from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get(
    "",
    response_model=List[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Current User Notifications",
    description="Retrieve notifications for the logged-in user sorted newest first, with optional unread filter & limit."
)
def get_notifications(
    unread_only: bool = Query(False, description="Filter to only unread notifications"),
    limit: int = Query(20, ge=1, le=100, description="Max number of notifications to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return NotificationService.get_user_notifications(
        db,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )

@router.get(
    "/unread-count",
    status_code=status.HTTP_200_OK,
    summary="Get Unread Notification Count",
    description="Get real-time unread notification count for the logged-in user's bell badge."
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = NotificationService.get_unread_count(db, user_id=current_user.id)
    return {"unread_count": count}

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read (PATCH)"
)
@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read (PUT)"
)
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = NotificationService.mark_as_read(db, user_id=current_user.id, notification_id=notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found or access denied")
    return notification

@router.patch(
    "/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read (PATCH)"
)
@router.post(
    "/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read (POST)"
)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = NotificationService.mark_all_as_read(db, user_id=current_user.id)
    return {"message": "All notifications marked as read", "count": count}

@router.post(
    "/jobs/check-locks",
    status_code=status.HTTP_200_OK,
    summary="Trigger Course Expiry & Lock Warning Job"
)
def trigger_lock_check_job(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = NotificationService.check_course_locks_and_warn(db)
    return {"message": "Lock check job completed successfully", "results": res}

@router.post(
    "/jobs/weekly-digest",
    status_code=status.HTTP_200_OK,
    summary="Trigger Weekly Executive Digest Job"
)
def trigger_weekly_digest_job(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = NotificationService.generate_weekly_admin_digest(db)
    return {"message": "Weekly digest generated successfully", "count": res}
