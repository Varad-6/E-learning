from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.models.user_badge import UserBadge
from app.models.badge_tier import BadgeTier
from app.models.course_enrollment import CourseEnrollment
from app.models.course import Course
from app.models.user import User
from app.services.audit_service import AuditService

class BadgeService:
    @staticmethod
    def check_and_award_badges(db: Session, user_id: UUID) -> List[UserBadge]:
        """Check course completion milestones and award badges dynamically based on configured tiers."""
        completed_count = db.query(CourseEnrollment).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.status == "completed",
            Course.status == "published"
        ).count()

        # Also count graded exam submissions
        from app.models.exam import ExamSubmission
        graded_exams = db.query(ExamSubmission).filter(
            ExamSubmission.user_id == user_id,
            ExamSubmission.status == "graded"
        ).count()

        total_milestones = completed_count + graded_exams

        # Fetch all eligible tiers
        eligible_tiers = db.query(BadgeTier).filter(
            BadgeTier.courses_required_cumulative <= total_milestones
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
