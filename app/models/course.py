import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    difficulty_level = Column(String, nullable=False)  # e.g., beginner, intermediate, advanced
    is_published = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="draft", nullable=False)  # draft, pending, approved, rejected
    duration = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="created_courses")
    department = relationship("Department", back_populates="courses")
    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    approvals = relationship("CourseApproval", back_populates="course", cascade="all, delete-orphan")

    @property
    def creator_name(self) -> str:
        if self.creator:
            return f"{self.creator.first_name} {self.creator.last_name}"
        return "Unknown Creator"

    @property
    def creator_role(self) -> str:
        if self.creator and self.creator.roles:
            # Return manager/department head if the database role is MANAGER
            r_name = self.creator.roles[0].name
            if r_name == "MANAGER":
                return "Department Head"
            return r_name.title()
        return "Employee"

    @property
    def department_name(self) -> str:
        if self.department:
            return self.department.name
        return "General"

    @property
    def rejection_reason(self) -> str:
        if self.approvals:
            # Sort approvals to find the latest review
            sorted_approvals = sorted(self.approvals, key=lambda a: a.submitted_at, reverse=True)
            if sorted_approvals[0].status == "rejected" and sorted_approvals[0].rejection_reason:
                return sorted_approvals[0].rejection_reason
        return ""
