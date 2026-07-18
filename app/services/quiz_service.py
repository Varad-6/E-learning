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
    def verify_quiz_access(db: Session, user: User, quiz: Quiz) -> None:
        """Enforce sequential lock and enrollment checks on quiz access for learners."""
        user_roles = [r.name for r in user.roles]
        if "SYSTEM_ADMIN" in user_roles or "COURSE_MANAGER" in user_roles:
            return # Admins/Managers bypass lock checks

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

        # Enforce sequential lock
        module = db.query(CourseModule).filter(CourseModule.id == quiz.module_id).first()
        if module:
            course_id = module.course_id
            modules_list = db.query(CourseModule).filter(CourseModule.course_id == course_id).all()
            
            def get_tier_rank(tier: str) -> int:
                t = tier.lower() if tier else ""
                if t == "intermediate": return 1
                elif t == "advanced": return 2
                return 0

            modules_list.sort(key=lambda m: (get_tier_rank(m.tier), m.sequence_no))
            
            mod_index = next((i for i, m in enumerate(modules_list) if m.id == module.id), -1)
            if mod_index > 0:
                prev_mod = modules_list[mod_index - 1]
                from app.models.module_content import ModuleContent
                from app.models.user_course_progress import UserCourseProgress
                
                total_prev_contents = db.query(ModuleContent).filter(
                    ModuleContent.module_id == prev_mod.id, 
                    ModuleContent.is_active == True
                ).count()
                completed_prev_contents = db.query(UserCourseProgress).filter(
                    UserCourseProgress.enrollment_id == enrollment.id,
                    UserCourseProgress.module_id == prev_mod.id,
                    UserCourseProgress.completed == True
                ).count()

                if completed_prev_contents < total_prev_contents:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Quiz is locked. You must complete the previous module '{prev_mod.title}' first."
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

        questions = quiz.questions
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This quiz does not contain any questions."
            )

        total_points = sum(q.points for q in questions)
        obtained_points = 0

        import json
        for q in questions:
            q_id_str = str(q.id)
            user_ans = request.answers.get(q_id_str)
            if not user_ans:
                continue

            q_type = getattr(q, 'question_type', 'mcq')
            is_correct = False
            if q_type == 'notes':
                is_correct = True
            elif q_type == 'msq':
                try:
                    correct_set = set(json.loads(q.correct_answer))
                    user_set = set(json.loads(user_ans))
                    correct_clean = {s.strip().lower() for s in correct_set}
                    user_clean = {s.strip().lower() for s in user_set}
                    is_correct = (correct_clean == user_clean)
                except Exception:
                    is_correct = (user_ans.strip().lower() == q.correct_answer.strip().lower())
            else:
                is_correct = (user_ans.strip().lower() == q.correct_answer.strip().lower())

            if is_correct:
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

        import json
        for q in questions:
            q_id_str = str(q.id)
            user_ans = attempt.answers.get(q_id_str)
            if not user_ans:
                continue

            q_type = getattr(q, 'question_type', 'mcq')
            is_correct = False
            if q_type == 'notes':
                is_correct = True
            elif q_type == 'msq':
                try:
                    correct_set = set(json.loads(q.correct_answer))
                    user_set = set(json.loads(user_ans))
                    correct_clean = {s.strip().lower() for s in correct_set}
                    user_clean = {s.strip().lower() for s in user_set}
                    is_correct = (correct_clean == user_clean)
                except Exception:
                    is_correct = (user_ans.strip().lower() == q.correct_answer.strip().lower())
            else:
                is_correct = (user_ans.strip().lower() == q.correct_answer.strip().lower())

            if is_correct:
                correct_count += 1

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

