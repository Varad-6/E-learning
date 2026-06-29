from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class EnrollmentStatus(str, Enum):
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"

class EnrollmentCreate(BaseModel):
    course_id: UUID = Field(..., description="ID of the course to enroll in")
    user_id: Optional[UUID] = Field(None, description="ID of the user enrolling. Defaults to current user if omitted.")

class EnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    status: EnrollmentStatus
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    enrolled_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProgressUpdate(BaseModel):
    module_id: UUID = Field(..., description="ID of the course module")
    content_id: UUID = Field(..., description="ID of the module content")
    completed: bool = Field(..., description="Completion status")
    time_spent_seconds: int = Field(0, ge=0, description="Time spent in seconds on this content")

class UserProgressResponse(BaseModel):
    id: UUID
    enrollment_id: UUID
    module_id: UUID
    content_id: UUID
    completed: bool
    completed_at: Optional[datetime] = None
    time_spent_seconds: int

    class Config:
        from_attributes = True
