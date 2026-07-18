from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.badge import UserBadgeResponse
from app.services.badge_service import BadgeService

router = APIRouter(prefix="/api/badges", tags=["Badges"])

@router.get(
    "/my-badges",
    response_model=List[UserBadgeResponse],
    status_code=status.HTTP_200_OK,
    summary="Get My Earned Badges",
    description="Retrieve all achievement badges earned by the currently logged-in user."
)
def get_my_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BadgeService.get_user_badges(db, user_id=current_user.id)
