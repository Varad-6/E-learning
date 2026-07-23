from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class BadgeTierBase(BaseModel):
    id: UUID
    name: str
    tier_order: int
    icon_asset_ref: str
    courses_required_cumulative: int

    class Config:
        from_attributes = True

class UserBadgeResponse(BaseModel):
    id: UUID
    user_id: UUID
    badge_tier_id: UUID
    earned_at: datetime
    badge_tier: BadgeTierBase

    class Config:
        from_attributes = True
