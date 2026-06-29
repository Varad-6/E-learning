import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="enrolled", nullable=False)  # enrolled, in_progress, completed, dropped
    progress_percent = Column(Integer, default=0, nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    progress_records = relationship("UserCourseProgress", back_populates="enrollment", cascade="all, delete-orphan")

    @property
    def course_code(self) -> str:
        if self.course:
            return self.course.course_code
        return ""

    @property
    def course_title(self) -> str:
        if self.course:
            return self.course.title
        return ""
