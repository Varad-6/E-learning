from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from uuid import UUID
from typing import List
import uuid
from app.models.user_badge import UserBadge
from app.models.badge_tier import BadgeTier
from app.models.course_enrollment import CourseEnrollment
from app.models.course import Course
from app.models.user import User
from app.services.audit_service import AuditService

DEFAULT_BADGE_TIERS = [
    ("Bronze III", 1, "bronze_3", 1, 60),
    ("Bronze II", 2, "bronze_2", 2, 60),
    ("Bronze I", 3, "bronze_1", 3, 60),
    ("Silver III", 4, "silver_3", 4, 60),
    ("Silver II", 5, "silver_2", 5, 60),
    ("Silver I", 6, "silver_1", 6, 60),
    ("Gold III", 7, "gold_3", 7, 60),
    ("Gold II", 8, "gold_2", 8, 60),
    ("Gold I", 9, "gold_1", 9, 60),
    ("Ruby Crest", 10, "ruby_crest", 10, 60),
    ("Amethyst III", 11, "amethyst_3", 11, 60),
    ("Amethyst II", 12, "amethyst_2", 12, 60),
    ("Amethyst I", 13, "amethyst_1", 13, 60),
    ("Emerald III", 14, "emerald_3", 14, 60),
    ("Emerald II", 15, "emerald_2", 15, 60),
    ("Emerald I", 16, "emerald_1", 16, 60),
    ("Sapphire III", 17, "sapphire_3", 17, 60),
    ("Sapphire II", 18, "sapphire_2", 18, 60),
    ("Sapphire I", 19, "sapphire_1", 19, 60),
    ("Diamond Crest", 20, "diamond_crest", 20, 60),
]


class BadgeService:
    @staticmethod
    def ensure_badge_tiers(db: Session) -> List[BadgeTier]:
        """Ensure the progression badge tiers exist in the database if table is empty."""
        tiers = db.query(BadgeTier).order_by(BadgeTier.tier_order.asc()).all()
        if tiers:
            return tiers

        for name, tier_order, icon_asset_ref, courses_req, min_score in DEFAULT_BADGE_TIERS:
            db.add(
                BadgeTier(
                    id=uuid.uuid4(),
                    name=name,
                    tier_order=tier_order,
                    icon_asset_ref=icon_asset_ref,
                    courses_required_cumulative=courses_req,
                    min_score_percent=min_score,
                )
            )
        db.commit()
        return db.query(BadgeTier).order_by(BadgeTier.tier_order.asc()).all()

    @staticmethod
    def check_and_award_badges(db: Session, user_id: UUID) -> List[UserBadge]:
        """Check course completion milestones and award badges dynamically based on configured DB tiers."""
        BadgeService.ensure_badge_tiers(db)

        completed_count = db.query(CourseEnrollment).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.user_id == user_id,
            or_(CourseEnrollment.status == "completed", CourseEnrollment.progress_percent >= 100),
            or_(Course.is_published == True, Course.status.in_(["published", "approved"]))
        ).count()

        # Calculate average score percentage across quizzes and exams
        from app.models.exam import ExamSubmission, ExamGrade
        from app.models.quiz_attempt import QuizAttempt

        avg_quiz = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.user_id == user_id).scalar()
        avg_exam = db.query(func.avg(ExamGrade.overall_score * 10)).join(
            ExamSubmission, ExamGrade.submission_id == ExamSubmission.id
        ).filter(
            ExamSubmission.user_id == user_id,
            ExamSubmission.status == "graded"
        ).scalar()

        scores = []
        if avg_quiz is not None:
            scores.append(float(avg_quiz))
        if avg_exam is not None:
            scores.append(float(avg_exam))

        user_score_pct = (sum(scores) / len(scores)) if scores else 100.0

        # Fetch all eligible tiers meeting both completed courses count and score threshold
        eligible_tiers = db.query(BadgeTier).filter(
            BadgeTier.courses_required_cumulative <= completed_count,
            or_(
                BadgeTier.min_score_percent == None,
                BadgeTier.min_score_percent <= user_score_pct
            )
        ).all()

        awarded = []
        for tier in eligible_tiers:
            exists = db.query(UserBadge).filter(
                UserBadge.user_id == user_id,
                UserBadge.badge_tier_id == tier.id
            ).first()

            if not exists:
                new_badge = UserBadge(
                    user_id=user_id,
                    badge_tier_id=tier.id
                )
                db.add(new_badge)
                awarded.append(new_badge)

        if awarded:
            db.commit()

            # Log badge earnings in Database Audit Logs
            user = db.query(User).filter(User.id == user_id).first()
            actor_email = user.email if user else "student@lms.com"
            actor_code = user.employee_code if user else "EMP"
            for b in awarded:
                db.refresh(b)
                tier_name = b.badge_tier.name if b.badge_tier else "Achievement Badge"
                AuditService.create_entry(
                    db=db,
                    actor="system_daemon",
                    action="EARN_BADGE",
                    target=actor_code,
                    details=f"Employee {actor_email} earned achievement badge: '{tier_name}'"
                )
                from app.services.notification_service import NotificationService
                NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    type="badge_earned",
                    title="New Badge Earned! 🏆",
                    message=f"Congratulations! You earned the '{tier_name}' badge milestone.",
                    related_entity_type="badge",
                    related_entity_id=b.id
                )

        return awarded

    @staticmethod
    def get_user_badges(db: Session, user_id: UUID) -> List[UserBadge]:
        """Get all badges earned by a user ordered by progression tier sequence."""
        # Always run check-and-award first to ensure sync
        BadgeService.check_and_award_badges(db, user_id=user_id)
        return db.query(UserBadge).join(
            BadgeTier, UserBadge.badge_tier_id == BadgeTier.id
        ).filter(
            UserBadge.user_id == user_id
        ).order_by(
            BadgeTier.tier_order.asc()
        ).all()
