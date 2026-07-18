from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class UserBadgeBase(BaseModel):
    badge_name: str
    step: int

class UserBadgeResponse(UserBadgeBase):
    id: UUID
    user_id: UUID
    earned_at: datetime

    class Config:
        from_attributes = True
