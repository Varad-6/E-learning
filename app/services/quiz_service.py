from datetime import datetime, timezone
from typing import Dict
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.course_enrollment import CourseEnrollment
from app.models.course_module import CourseModule
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.user import User
from app.schemas.quiz import QuizCreate, QuizQuestionCreate, QuizAttemptCreate, QuizResult

class QuizService:
    @staticmethod
    def create_quiz(db: Session, request: QuizCreate) -> Quiz:
        # Check module exists
        module = db.query(CourseModule).filter(CourseModule.id == request.module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course module with ID {request.module_id} not found."
            )

        quiz = Quiz(
            module_id=request.module_id,
            title=request.title,
            passing_score=request.passing_score,
            time_limit_minutes=request.time_limit_minutes,
            is_published=request.is_published,
            is_optional=request.is_optional
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)

        # Create any questions provided in the request
        if request.questions:
            for q_req in request.questions:
                question = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=q_req.question_text,
                    options=q_req.options if q_req.options is not None else [],
                    correct_answer=q_req.correct_answer if q_req.correct_answer is not None else "",
                    explanation=q_req.explanation,
                    points=q_req.points,
                    question_type=q_req.question_type or "mcq",
                    is_required=q_req.is_required if hasattr(q_req, "is_required") else False
                )
                db.add(question)
            db.commit()
            db.refresh(quiz)

        return quiz

    @staticmethod
    def create_question(db: Session, quiz_id: UUID, request: QuizQuestionCreate) -> QuizQuestion:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {quiz_id} not found."
            )

        question = QuizQuestion(
            quiz_id=quiz_id,
            question_text=request.question_text,
            options=request.options,
            correct_answer=request.correct_answer,
            explanation=request.explanation,
            points=request.points,
            question_type=request.question_type or "mcq",
            is_required=request.is_required if hasattr(request, 'is_required') else False
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def verify_quiz_access(db: Session, user: User, quiz: Quiz) -> None:
        """Enrollment check on quiz access for learners (all modules and quizzes optional/accessible)."""
        user_roles = [r.name for r in user.roles]
        if any(r in user_roles for r in ["SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER", "ADMIN"]):
            return # Admins/Managers bypass checks

        # Check enrollment
        enrollment = db.query(CourseEnrollment).join(
            CourseModule, CourseModule.course_id == CourseEnrollment.course_id
        ).filter(
            CourseEnrollment.user_id == user.id,
            CourseModule.id == quiz.module_id,
            CourseEnrollment.status != "dropped"
        ).first()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not enrolled in the course corresponding to this quiz."
            )

    @staticmethod
    def submit_attempt(db: Session, user_id: UUID, request: QuizAttemptCreate) -> QuizAttempt:
        quiz = db.query(Quiz).filter(Quiz.id == request.quiz_id).first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {request.quiz_id} not found."
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check enrollment and sequential locks
        QuizService.verify_quiz_access(db, user=user, quiz=quiz)

        existing_attempt = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == request.quiz_id,
            QuizAttempt.user_id == user_id
        ).first()
        if existing_attempt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted this quiz."
            )

        questions = quiz.questions
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This quiz does not contain any questions."
            )

        total_points = sum(q.points for q in questions)
        obtained_points = 0

        for q in questions:
            user_ans = (request.answers or {}).get(str(q.id))
            if QuizService._is_question_correct(q, user_ans):
                obtained_points += q.points

        score_pct = (obtained_points / total_points) * 100.0 if total_points > 0 else 0.0
        passed = score_pct >= quiz.passing_score

        attempt = QuizAttempt(
            user_id=user_id,
            quiz_id=request.quiz_id,
            score=score_pct,
            passed=passed,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            answers=request.answers
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def _normalize_choice(val: str, options: list) -> str:
        """Resolve single letter ('A', 'B', ...) or option index to normalized option text when possible."""
        cleaned = (val or "").strip()
        if len(cleaned) == 1 and cleaned.upper().isalpha() and options:
            idx = ord(cleaned.upper()) - 65
            if 0 <= idx < len(options):
                return str(options[idx]).strip().lower()
        if cleaned.isdigit() and options:
            idx = int(cleaned)
            if 0 <= idx < len(options):
                return str(options[idx]).strip().lower()
        return cleaned.lower()

    @staticmethod
    def _is_question_correct(q: QuizQuestion, user_ans) -> bool:
        if user_ans is None or (isinstance(user_ans, str) and not user_ans.strip()):
            return False
        import json
        q_type = getattr(q, 'question_type', 'mcq')
        options = q.options or []
        if q_type == 'notes':
            return True
        if q_type == 'msq':
            try:
                corr_raw = json.loads(q.correct_answer) if isinstance(q.correct_answer, str) else q.correct_answer
                user_raw = json.loads(user_ans) if isinstance(user_ans, str) else user_ans
                corr_set = {QuizService._normalize_choice(str(s), options) for s in (corr_raw or [])}
                user_set = {QuizService._normalize_choice(str(s), options) for s in (user_raw or [])}
                return bool(corr_set) and corr_set == user_set
            except Exception:
                return QuizService._normalize_choice(str(user_ans), options) == QuizService._normalize_choice(str(q.correct_answer), options)
        return QuizService._normalize_choice(str(user_ans), options) == QuizService._normalize_choice(str(q.correct_answer), options)

    @staticmethod
    def calculate_score(db: Session, quiz_attempt_id: UUID) -> QuizResult:
        attempt = db.query(QuizAttempt).filter(QuizAttempt.id == quiz_attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz attempt with ID {quiz_attempt_id} not found."
            )

        quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz associated with attempt not found."
            )

        questions = quiz.questions
        correct_count = sum(
            1 for q in questions
            if QuizService._is_question_correct(q, (attempt.answers or {}).get(str(q.id)))
        )

        return QuizResult(
            attempt_id=attempt.id,
            score=attempt.score,
            passed=attempt.passed,
            total_questions=len(questions),
            correct_answers_count=correct_count,
            passing_score=quiz.passing_score
        )

    @staticmethod
    def get_quiz(db: Session, quiz_id: UUID) -> Quiz:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {quiz_id} not found."
            )
        return quiz

    @staticmethod
    def get_quiz_by_module(db: Session, module_id: UUID) -> Quiz:
        quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No quiz found for module ID {module_id}."
            )
        return quiz

    @staticmethod
    def delete_quiz_by_module(db: Session, module_id: UUID) -> None:
        quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first()
        if quiz:
            db.delete(quiz)
            db.commit()

