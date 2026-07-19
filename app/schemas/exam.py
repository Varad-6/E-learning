from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class ExamQuestionBase(BaseModel):
    question_text: str
    question_type: str  # short_answer, descriptive, file_upload

class ExamQuestionCreate(ExamQuestionBase):
    pass

class ExamQuestionResponse(ExamQuestionBase):
    id: UUID
    exam_id: UUID

    class Config:
        from_attributes = True

class ExamBase(BaseModel):
    title: str
    course_id: UUID
    department_id: UUID
    duration_minutes: int = 60
    is_published: bool = False
    status: str = "draft"

class ExamCreate(ExamBase):
    questions: List[ExamQuestionCreate]

class ExamResponse(ExamBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: datetime
    questions: List[ExamQuestionResponse] = []

    class Config:
        from_attributes = True

class ExamSubmissionCreate(BaseModel):
    answers: Dict[str, str]  # maps question_id to text response

class ExamSubmissionResponse(BaseModel):
    id: UUID
    exam_id: UUID
    user_id: UUID
    status: str
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    answers: Dict[str, Any]
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    department_name: Optional[str] = None
    exam_title: Optional[str] = None

    class Config:
        from_attributes = True

class ExamGradeCreate(BaseModel):
    scores: Dict[str, int]  # maps question_id to score 0-10
    overall_feedback: Optional[str] = None

class ExamGradeResponse(BaseModel):
    id: UUID
    submission_id: UUID
    scores: Dict[str, int]
    overall_feedback: Optional[str] = None
    graded_by: Optional[UUID] = None
    graded_at: datetime

    class Config:
        from_attributes = True

class ExamReviewResponse(BaseModel):
    id: UUID
    exam_id: UUID
    submitted_by: Optional[UUID] = None
    status: str
    reviewer_id: Optional[UUID] = None
    department_id: UUID
    rejection_reason: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    exam_title: Optional[str] = None
    creator_name: Optional[str] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True
