import uuid
from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base

class BadgeTier(Base):
    __tablename__ = "badge_tiers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    tier_order = Column(Integer, nullable=False, unique=True) # order of progression (1 to 20)
    icon_asset_ref = Column(String, nullable=False) # e.g. "bronze_1", "ruby_crest"
    courses_required_cumulative = Column(Integer, nullable=False) # cumulative threshold

    # Relationships
    user_badges = relationship("UserBadge", back_populates="badge_tier", cascade="all, delete-orphan")
