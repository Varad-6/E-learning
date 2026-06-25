from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt
from app.schemas.quiz import (
    QuizCreate, QuizResponse, QuizQuestionCreate, QuizQuestionResponse,
    QuizAttemptCreate, QuizAttemptResponse, QuizResult
)
from app.services.quiz_service import QuizService

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])

@router.post(
    "",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Quiz",
    description="Create a new quiz. Restricted to Admins and Managers."
)
def create_quiz(
    request: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return QuizService.create_quiz(db, request=request)

@router.get(
    "/{quiz_id}",
    response_model=QuizResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Quiz",
    description="Retrieve quiz details by ID."
)
def get_quiz(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return QuizService.get_quiz(db, quiz_id=quiz_id)

@router.post(
    "/{quiz_id}/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Quiz Question",
    description="Add a new question to a quiz. Restricted to Admins and Managers."
)
def create_question(
    quiz_id: UUID,
    request: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return QuizService.create_question(db, quiz_id=quiz_id, request=request)

@router.post(
    "/{quiz_id}/attempt",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Quiz Attempt",
    description="Submit user answers for a quiz attempt."
)
def submit_attempt(
    quiz_id: UUID,
    request: QuizAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure request quiz_id matches path parameter quiz_id
    if request.quiz_id != quiz_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz ID in path must match Quiz ID in body."
        )
    return QuizService.submit_attempt(db, user_id=current_user.id, request=request)

@router.get(
    "/{quiz_id}/results",
    response_model=QuizResult,
    status_code=status.HTTP_200_OK,
    summary="Get Quiz Attempt Results",
    description="Get results and feedback from the user's latest attempt for a quiz."
)
def get_quiz_results(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure quiz exists
    QuizService.get_quiz(db, quiz_id=quiz_id)
    
    # Retrieve user's latest attempt for this quiz
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id
    ).order_by(QuizAttempt.started_at.desc()).first()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quiz attempt found for the current user."
        )

    return QuizService.calculate_score(db, quiz_attempt_id=attempt.id)
