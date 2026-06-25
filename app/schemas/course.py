from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class CourseStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ModuleContentCreate(BaseModel):
    title: str = Field(..., description="Title of the module content")
    content_type: str = Field(..., description="Type of content (e.g., video, document, quiz, article)")
    file_path: Optional[str] = Field(None, description="Path or URL to the content file")
    duration_seconds: Optional[int] = Field(None, description="Duration in seconds if applicable")
    sequence_no: int = Field(..., description="Display order sequence number")
    is_active: bool = Field(True, description="Whether this content is active")

class ModuleContentResponse(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    content_type: str
    file_path: Optional[str] = None
    duration_seconds: Optional[int] = None
    sequence_no: int
    is_active: bool

    class Config:
        from_attributes = True

class CourseModuleCreate(BaseModel):
    title: str = Field(..., description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: int = Field(..., description="Display order sequence number")

class CourseModuleResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    sequence_no: int
    created_at: datetime
    contents: List[ModuleContentResponse] = []

    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    course_code: str = Field(..., description="Unique code identifying the course")
    title: str = Field(..., description="Title of the course")
    description: Optional[str] = Field(None, description="Detailed description of the course")
    difficulty_level: str = Field(..., description="Difficulty level (e.g., beginner, intermediate, advanced)")
    department_id: Optional[UUID] = Field(None, description="Associated department ID")

class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, description="Unique code identifying the course")
    title: Optional[str] = Field(None, description="Title of the course")
    description: Optional[str] = Field(None, description="Detailed description of the course")
    difficulty_level: Optional[str] = Field(None, description="Difficulty level (e.g., beginner, intermediate, advanced)")
    department_id: Optional[UUID] = Field(None, description="Associated department ID")
    is_published: Optional[bool] = Field(None, description="Whether the course is published")
    status: Optional[CourseStatus] = Field(None, description="Status of the course")

class CourseResponse(BaseModel):
    id: UUID
    course_code: str
    title: str
    description: Optional[str] = None
    difficulty_level: str
    is_published: bool
    created_by: Optional[UUID] = None
    department_id: Optional[UUID] = None
    status: CourseStatus
    created_at: datetime
    updated_at: datetime
    modules: List[CourseModuleResponse] = []

    class Config:
        from_attributes = True

class CourseListResponse(BaseModel):
    courses: List[CourseResponse]
    total: int

class ModuleCreate(BaseModel):
    course_id: UUID = Field(..., description="ID of the course this module belongs to")
    title: str = Field(..., description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: int = Field(..., description="Display order sequence number")

class ModuleUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: Optional[int] = Field(None, description="Display order sequence number")

class ModuleResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    sequence_no: int
    created_at: datetime
    contents: List[ModuleContentResponse] = []

    class Config:
        from_attributes = True

class ModuleListResponse(BaseModel):
    modules: List[ModuleResponse]
    total: int

class ModuleContentUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Title of the module content")
    content_type: Optional[str] = Field(None, description="Type of content (e.g., video, document, quiz, article)")
    file_path: Optional[str] = Field(None, description="Path or URL to the content file")
    duration_seconds: Optional[int] = Field(None, description="Duration in seconds if applicable")
    sequence_no: Optional[int] = Field(None, description="Display order sequence number")
    is_active: Optional[bool] = Field(None, description="Whether this content is active")

