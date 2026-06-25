import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base

class ModuleContent(Base):
    __tablename__ = "module_contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content_type = Column(String, nullable=False)  # video, document, quiz, article
    file_path = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    sequence_no = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    module = relationship("CourseModule", back_populates="contents")
    progress_records = relationship("UserCourseProgress", back_populates="content", cascade="all, delete-orphan")
