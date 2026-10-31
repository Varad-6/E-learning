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
    tier: Optional[str] = Field("all_levels", description="Tier name (optional)")

class CourseModuleResponse(BaseModel):
    id: UUID
    course_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    sequence_no: int
    tier: Optional[str] = "all_levels"
    created_at: datetime
    contents: List[ModuleContentResponse] = []

    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    course_code: str = Field(..., description="Unique code identifying the course")
    title: str = Field(..., description="Title of the course")
    description: Optional[str] = Field(None, description="Detailed description of the course")
    difficulty_level: Optional[str] = Field("all_levels", description="Difficulty level (optional)")
    department_id: Optional[UUID] = Field(None, description="Associated primary department ID")
    department_ids: Optional[List[UUID]] = Field(None, description="List of assigned department IDs")
    is_all_departments: Optional[bool] = Field(False, description="Whether the course is assigned to all departments")
    duration: Optional[str] = Field(None, description="Duration of the course")
    priority: Optional[str] = Field(None, description="Priority of the course")
    is_mandatory: bool = Field(False, description="Whether the course is mandatory")
    video_url: Optional[str] = Field(None, description="Introductory or overview YouTube video URL")
    assigned_module_ids: Optional[List[UUID]] = Field(None, description="List of existing module IDs to assign")

class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, description="Unique code identifying the course")
    title: Optional[str] = Field(None, description="Title of the course")
    description: Optional[str] = Field(None, description="Detailed description of the course")
    difficulty_level: Optional[str] = Field(None, description="Difficulty level (e.g., beginner, intermediate, advanced)")
    department_id: Optional[UUID] = Field(None, description="Associated primary department ID")
    department_ids: Optional[List[UUID]] = Field(None, description="List of assigned department IDs")
    is_all_departments: Optional[bool] = Field(None, description="Whether the course is assigned to all departments")
    is_published: Optional[bool] = Field(None, description="Whether the course is published")
    status: Optional[CourseStatus] = Field(None, description="Status of the course")
    duration: Optional[str] = Field(None, description="Duration of the course")
    priority: Optional[str] = Field(None, description="Priority of the course")
    is_mandatory: Optional[bool] = Field(None, description="Whether the course is mandatory")
    video_url: Optional[str] = Field(None, description="Introductory or overview YouTube video URL")
    assigned_module_ids: Optional[List[UUID]] = Field(None, description="List of existing module IDs to assign")

class CourseResponse(BaseModel):
    id: UUID
    course_code: str
    title: str
    description: Optional[str] = None
    difficulty_level: Optional[str] = "all_levels"
    is_published: bool
    created_by: Optional[UUID] = None
    department_id: Optional[UUID] = None
    department_ids: List[UUID] = []
    is_all_departments: bool = False
    status: str
    duration: Optional[str] = None
    priority: Optional[str] = None
    creator_name: Optional[str] = None
    creator_role: Optional[str] = None
    department_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_mandatory: bool = False
    video_url: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    modules: List[CourseModuleResponse] = []
    can_delete: bool = False
    can_edit: bool = False

    class Config:
        from_attributes = True

class CourseListResponse(BaseModel):
    courses: List[CourseResponse]
    total: int

class ModuleCreate(BaseModel):
    course_id: Optional[UUID] = Field(None, description="ID of the course this module belongs to")
    title: str = Field(..., description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: int = Field(..., description="Display order sequence number")
    tier: Optional[str] = Field("all_levels", description="Tier name (optional)")

class ModuleUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Title of the course module")
    description: Optional[str] = Field(None, description="Detailed description of the module")
    sequence_no: Optional[int] = Field(None, description="Display order sequence number")
    tier: Optional[str] = Field(None, description="Tier name: beginner, intermediate, advanced")
    course_id: Optional[UUID] = Field(None, description="Course ID to link")

class ModuleAssignRequest(BaseModel):
    module_ids: List[UUID] = Field(..., description="List of module IDs to assign to the course")

class ModuleResponse(BaseModel):
    id: UUID
    course_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    sequence_no: int
    tier: Optional[str] = "all_levels"
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

class MyCourseItem(BaseModel):
    id: UUID
    enrollment_id: UUID
    course_code: str
    title: str
    description: Optional[str] = None
    duration: Optional[str] = None
    difficulty_level: Optional[str] = None
    department_name: Optional[str] = None
    department_id: Optional[UUID] = None
    is_mandatory: bool = False
    total_modules: int = 0
    completed_modules: int = 0
    progress_percent: int = 0
    status: str = "not_started"  # not_started, in_progress, completed
    enrolled_at: datetime
    last_accessed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    next_module_id: Optional[UUID] = None
    next_module_title: Optional[str] = None

class MyCoursesSummary(BaseModel):
    total_assigned: int = 0
    not_started: int = 0
    in_progress: int = 0
    completed: int = 0
    total_enrolled: int = 0

class MyCoursesResponse(BaseModel):
    courses: List[MyCourseItem]
    summary: MyCoursesSummary

class CatalogCourseItem(BaseModel):
    id: UUID
    course_code: str
    title: str
    description: Optional[str] = None
    duration: Optional[str] = None
    difficulty_level: Optional[str] = None
    department_name: Optional[str] = None
    department_id: Optional[UUID] = None
    is_mandatory: bool = False
    is_published: bool = True
    created_at: datetime
    total_modules: int = 0
    enrollment_id: Optional[UUID] = None
    user_status: str = "not_enrolled"  # not_enrolled, assigned, not_started, in_progress, completed
    progress_percent: int = 0
    last_accessed_at: Optional[datetime] = None
    creator_name: Optional[str] = None
    created_by: Optional[UUID] = None
    can_delete: bool = False
    can_edit: bool = False

class CatalogResponse(BaseModel):
    courses: List[CatalogCourseItem]
    total: int
    page: int = 1
    page_size: int = 50
    categories: List[str] = []

class CourseDetailModule(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    sequence_no: int
    tier: Optional[str] = "all_levels"
    contents_count: int = 0
    completed: bool = False

class CourseDetailResponse(BaseModel):
    id: UUID
    course_code: str
    title: str
    description: Optional[str] = None
    duration: Optional[str] = None
    difficulty_level: Optional[str] = "all_levels"
    department_name: Optional[str] = None
    department_id: Optional[UUID] = None
    is_mandatory: bool = False
    is_published: bool = True
    status: str = "published"
    video_url: Optional[str] = None
    created_at: datetime
    creator_name: Optional[str] = None
    created_by: Optional[UUID] = None
    total_modules: int = 0
    enrollment_id: Optional[UUID] = None
    user_status: str = "not_enrolled"
    progress_percent: int = 0
    last_accessed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    modules: List[CourseDetailModule] = []
    can_delete: bool = False
    can_edit: bool = False

class CourseLearnerResponse(BaseModel):
    user_id: UUID
    enrollment_id: UUID
    employee_code: str
    name: str
    email: str
    department_name: Optional[str] = "General"
    status: str
    progress_percent: int
    time_spent_seconds: int = 0
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None


