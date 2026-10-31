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
from app.api.module import check_module_write_permission

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes"])

@router.post(
    "",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Quiz",
    description="Create a new quiz. Restricted to Admins and the Course Creator."
)
def create_quiz(
    request: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    check_module_write_permission(db, request.module_id, current_user)
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
    quiz = QuizService.get_quiz(db, quiz_id=quiz_id)
    QuizService.verify_quiz_access(db, user=current_user, quiz=quiz)
    return quiz

@router.post(
    "/{quiz_id}/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Quiz Question",
    description="Add a new question to a quiz. Restricted to Admins and the Course Creator."
)
def create_question(
    quiz_id: UUID,
    request: QuizQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    quiz = QuizService.get_quiz(db, quiz_id=quiz_id)
    check_module_write_permission(db, quiz.module_id, current_user)
    return QuizService.create_question(db, quiz_id=quiz_id, request=request)

@router.post(
    "/{quiz_id}/attempt",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Quiz Attempt",
    description="Submit user answers for a quiz attempt and calculate score."
)
def submit_attempt(
    quiz_id: UUID,
    request: QuizAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify user has access to take this quiz
    quiz = QuizService.get_quiz(db, quiz_id=quiz_id)
    QuizService.verify_quiz_access(db, user=current_user, quiz=quiz)
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

@router.get(
    "/module/{module_id}",
    response_model=QuizResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Quiz by Module",
    description="Retrieve the quiz for a specific course module."
)
def get_quiz_by_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = QuizService.get_quiz_by_module(db, module_id=module_id)
    QuizService.verify_quiz_access(db, user=current_user, quiz=quiz)
    return quiz

@router.delete(
    "/module/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Quiz by Module",
    description="Delete a quiz and its questions for a course module. Restricted to Admins and the Course Creator."
)
def delete_quiz_by_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    check_module_write_permission(db, module_id, current_user)
    QuizService.delete_quiz_by_module(db, module_id=module_id)
    return None
