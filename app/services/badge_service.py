from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.models.user_badge import UserBadge
from app.models.course_enrollment import CourseEnrollment
from app.models.user import User
from app.services.audit_service import AuditService

BADGES = {
    1: "Novice Explorer",
    2: "Pathway Learner",
    3: "Skill Builder",
    4: "Knowledge Seeker",
    5: "Pro Practitioner",
    6: "Subject Specialist",
    7: "Elite Achiever",
    8: "Master Mentor",
    9: "Continuous Improver",
    10: "Grandmaster of Kaizen"
}

class BadgeService:
    @staticmethod
    def check_and_award_badges(db: Session, user_id: UUID) -> List[UserBadge]:
        """Check course completion milestones and award badges dynamically."""
        completed_count = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.status == "completed"
        ).count()

        if completed_count <= 0:
            return []

        max_step = min(completed_count, 10)
        awarded = []
        
        for step in range(1, max_step + 1):
            # Check if this badge level is already awarded
            exists = db.query(UserBadge).filter(
                UserBadge.user_id == user_id,
                UserBadge.step == step
            ).first()
            
            if not exists:
                badge_name = BADGES[step]
                new_badge = UserBadge(
                    user_id=user_id,
                    badge_name=badge_name,
                    step=step
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
                AuditService.create_entry(
                    db=db,
                    actor="system_daemon",
                    action="EARN_BADGE",
                    target=actor_code,
                    details=f"Employee {actor_email} earned achievement badge: '{b.badge_name}' (Level {b.step})"
                )
                
            for b in awarded:
                db.refresh(b)
                
        return awarded

    @staticmethod
    def get_user_badges(db: Session, user_id: UUID) -> List[UserBadge]:
        """Get all badges earned by a user ordered by step/level."""
        # Always run a check-and-award first to ensure sync
        BadgeService.check_and_award_badges(db, user_id=user_id)
        return db.query(UserBadge).filter(UserBadge.user_id == user_id).order_by(UserBadge.step.asc()).all()
