from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.badge import UserBadgeResponse, BadgeTierBase
from app.services.badge_service import BadgeService

router = APIRouter(prefix="/api/badges", tags=["Badges"])
users_router = APIRouter(prefix="/api/users", tags=["Users"])

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

@router.get(
    "/tiers",
    response_model=List[BadgeTierBase],
    status_code=status.HTTP_200_OK,
    summary="Get All Badge Tiers",
    description="Retrieve the configured progression track tiers and requirements."
)
def get_badge_tiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.badge_tier import BadgeTier
    return db.query(BadgeTier).order_by(BadgeTier.tier_order.asc()).all()

@users_router.get(
    "/{user_id}/badges",
    response_model=List[UserBadgeResponse],
    status_code=status.HTTP_200_OK,
    summary="Get User Earned Badges By ID",
    description="Retrieve all achievement badges earned by a specific user."
)
def get_user_badges_by_id(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BadgeService.get_user_badges(db, user_id=user_id)
