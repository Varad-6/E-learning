from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime

class QuizQuestionCreate(BaseModel):
    question_text: str = Field(..., description="Text of the question")
    options: List[str] = Field(..., description="List of options for the question")
    correct_answer: str = Field(..., description="Correct option corresponding to options list")
    explanation: Optional[str] = Field(None, description="Explanation for the correct answer")
    points: int = Field(1, ge=1, description="Points awarded for the correct answer")

class QuizQuestionResponse(BaseModel):
    id: UUID
    quiz_id: UUID
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None
    points: int

    class Config:
        from_attributes = True

class QuizCreate(BaseModel):
    module_id: UUID = Field(..., description="ID of the course module this quiz belongs to")
    title: str = Field(..., description="Title of the quiz")
    passing_score: int = Field(..., ge=0, description="Passing score (percentage or points)")
    time_limit_minutes: Optional[int] = Field(None, ge=1, description="Time limit for the quiz in minutes")
    is_published: bool = Field(False, description="Whether the quiz is published")
    questions: List[QuizQuestionCreate] = Field(default=[], description="List of questions in this quiz")

class QuizResponse(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    passing_score: int
    time_limit_minutes: Optional[int] = None
    is_published: bool
    questions: List[QuizQuestionResponse] = []

    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    quiz_id: UUID = Field(..., description="ID of the quiz being attempted")
    answers: Dict[str, str] = Field(..., description="Dictionary mapping question IDs (in UUID string form) to selected answers")

class QuizAttemptResponse(BaseModel):
    id: UUID
    user_id: UUID
    quiz_id: UUID
    score: float
    passed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: Dict[str, str]

    class Config:
        from_attributes = True

class QuizResult(BaseModel):
    attempt_id: UUID = Field(..., description="ID of the quiz attempt")
    score: float = Field(..., description="Score achieved (e.g. percentage or total points)")
    passed: bool = Field(..., description="Whether the user passed the quiz")
    total_questions: int = Field(..., description="Total number of questions in the quiz")
    correct_answers_count: int = Field(..., description="Number of correct answers")
    passing_score: int = Field(..., description="Passing score threshold")
