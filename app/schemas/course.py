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
    PUBLISHED = "published"
    ARCHIVED = "archived"

class ModuleContentCreate(BaseModel):
    title: str = Field(..., description="Title of the module content")
    content_type: str = Field(..., description="Type of content (e.g., video, document, quiz, article)")
    file_path: Optional[str] = Field(None, description="Path or URL to the content file")
    duration_seconds: Optional[int] = Field(None, description="Duration in seconds if applicable")
    sequence_no: int = Field(..., description="Display order sequence number")
    is_active: bool = Field(True, description="Whether this content is active")
    value: Optional[str] = Field(None, description="Value/text content of the block")
    label: Optional[str] = Field(None, description="Label for download or button attachments")

class ModuleContentResponse(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    content_type: str
    file_path: Optional[str] = None
    duration_seconds: Optional[int] = None
    sequence_no: int
    is_active: bool
    value: Optional[str] = None
    label: Optional[str] = None

    class Config:
        from_attributes = True

class CourseModuleCreate(BaseModel):
    title: str = Field(..., description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: int = Field(..., description="Display order sequence number")
    tier: str = Field(..., description="Tier name: beginner, intermediate, advanced")

class CourseModuleResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    sequence_no: int
    tier: str
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
    duration: Optional[str] = Field(None, description="Duration of the course")
    priority: Optional[str] = Field(None, description="Priority of the course")
    is_mandatory: bool = Field(False, description="Whether the course is mandatory")

class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, description="Unique code identifying the course")
    title: Optional[str] = Field(None, description="Title of the course")
    description: Optional[str] = Field(None, description="Detailed description of the course")
    difficulty_level: Optional[str] = Field(None, description="Difficulty level (e.g., beginner, intermediate, advanced)")
    department_id: Optional[UUID] = Field(None, description="Associated department ID")
    is_published: Optional[bool] = Field(None, description="Whether the course is published")
    status: Optional[CourseStatus] = Field(None, description="Status of the course")
    duration: Optional[str] = Field(None, description="Duration of the course")
    priority: Optional[str] = Field(None, description="Priority of the course")
    is_mandatory: Optional[bool] = Field(None, description="Whether the course is mandatory")

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
    duration: Optional[str] = None
    priority: Optional[str] = None
    creator_name: Optional[str] = None
    creator_role: Optional[str] = None
    department_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_mandatory: bool = False
    published_at: Optional[datetime] = None
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
    tier: str = Field(..., description="Tier name: beginner, intermediate, advanced")

class ModuleUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: Optional[int] = Field(None, description="Display order sequence number")
    tier: Optional[str] = Field(None, description="Tier name: beginner, intermediate, advanced")

class ModuleResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    sequence_no: int
    tier: str
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
    value: Optional[str] = Field(None, description="Value/text content of the block")
    label: Optional[str] = Field(None, description="Label for download or button attachments")


class ReorderItem(BaseModel):
    id: UUID = Field(..., description="ID of the item to reorder")
    sequence_no: int = Field(..., description="New sequence number / display order")


class ReorderRequest(BaseModel):
    items: List[ReorderItem] = Field(..., description="List of items with their new sequences")

