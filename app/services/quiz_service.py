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
            is_published=request.is_published
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
                    options=q_req.options,
                    correct_answer=q_req.correct_answer,
                    explanation=q_req.explanation,
                    points=q_req.points
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
            points=request.points
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def submit_attempt(db: Session, user_id: UUID, request: QuizAttemptCreate) -> QuizAttempt:
        quiz = db.query(Quiz).filter(Quiz.id == request.quiz_id).first()
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {request.quiz_id} not found."
            )

        # Check if user is enrolled in the course containing this quiz
        enrollment = db.query(CourseEnrollment).join(
            CourseModule, CourseModule.course_id == CourseEnrollment.course_id
        ).filter(
            CourseEnrollment.user_id == user_id,
            CourseModule.id == quiz.module_id,
            CourseEnrollment.status != "dropped"
        ).first()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not enrolled in the course corresponding to this quiz."
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
            q_id_str = str(q.id)
            user_ans = request.answers.get(q_id_str)
            if user_ans and user_ans.strip().lower() == q.correct_answer.strip().lower():
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
        correct_count = 0

        for q in questions:
            q_id_str = str(q.id)
            user_ans = attempt.answers.get(q_id_str)
            if user_ans and user_ans.strip().lower() == q.correct_answer.strip().lower():
                correct_count += 1

        return QuizResult(
            attempt_id=attempt.id,
            score=attempt.score,
            passed=attempt.passed,
            total_questions=len(questions),
            correct_answers_count=correct_count,
            passing_score=quiz.passing_score
        )
