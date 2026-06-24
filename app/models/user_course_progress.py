import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base

class UserCourseProgress(Base):
    __tablename__ = "user_course_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("course_enrollments.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey("course_modules.id", ondelete="CASCADE"), nullable=False)
    content_id = Column(UUID(as_uuid=True), ForeignKey("module_contents.id", ondelete="CASCADE"), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_seconds = Column(Integer, default=0, nullable=False)

    # Relationships
    enrollment = relationship("CourseEnrollment", back_populates="progress_records")
    module = relationship("CourseModule", back_populates="progress_records")
    content = relationship("ModuleContent", back_populates="progress_records")
