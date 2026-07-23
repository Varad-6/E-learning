from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class DashboardCourseItem(BaseModel):
    id: UUID
    enrollment_id: UUID
    course_code: str
    title: str
    department_tag: str
    progress_percent: int
    due_date: Optional[datetime] = None
    urgency_level: str  # "red", "amber", "neutral"

class DashboardAvailableCourseItem(BaseModel):
    id: UUID
    course_code: str
    title: str
    description: Optional[str] = None
    duration: Optional[str] = None

class DashboardExamItem(BaseModel):
    id: UUID
    exam_id: UUID
    exam_title: str
    course_title: str
    course_code: Optional[str] = None
    due_date: Optional[datetime] = None
    duration_minutes: int
    status: str

class DashboardProgress(BaseModel):
    completed: int
    total: int
    percent: float

class NextBadgeMilestone(BaseModel):
    tier_name: Optional[str] = None
    courses_remaining: int

class MyRank(BaseModel):
    position: Optional[int] = None
    department: str
    badge_tier: Optional[str] = None

class RecentActivityItem(BaseModel):
    id: UUID
    type: str
    title: str
    message: str
    created_at: datetime
    is_read: bool

class CourseCategoryTile(BaseModel):
    department_id: UUID
    department_name: str
    department_code: str
    course_count: int
    color_token: str

class EmployeeDashboardResponse(BaseModel):
    mandatory_courses: List[DashboardCourseItem]
    assigned_courses: List[DashboardCourseItem]
    available_courses: List[DashboardAvailableCourseItem]
    overall_progress: DashboardProgress
    next_badge_milestone: NextBadgeMilestone
    upcoming_exams: List[DashboardExamItem]
    my_rank: MyRank
    recent_activity: List[RecentActivityItem]
    course_categories: List[CourseCategoryTile]
    exam_score_trend: Optional[List[Dict[str, Any]]] = None
    category_progress: Optional[List[Dict[str, Any]]] = None
