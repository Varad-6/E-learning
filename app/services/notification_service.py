import datetime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy import desc
from uuid import UUID
from typing import List, Optional, Dict, Any

from app.models.notification import Notification
from app.models.user import User
from app.models.role import Role
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.department import Department
from app.models.exam import ExamGrade, ExamSubmission


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: UUID,
        type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[UUID] = None
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: UUID,
        unread_only: bool = False,
        limit: int = 20
    ) -> List[Notification]:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(desc(Notification.created_at)).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> int:
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    @staticmethod
    def mark_as_read(db: Session, user_id: UUID, notification_id: UUID) -> Optional[Notification]:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notification:
            notification.is_read = True
            notification.read_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: UUID) -> int:
        unread = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).all()
        now = datetime.datetime.now(datetime.timezone.utc)
        for notification in unread:
            notification.is_read = True
            notification.read_at = now
        db.commit()
        return len(unread)

    @staticmethod
    def notify_department_managers_and_hr(
        db: Session,
        department_id: Optional[UUID],
        type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[UUID] = None
    ):
        """Notifies managers in the target department + all HR Admins and HR Managers."""
        recipients = set()
        
        # 1. Target department managers
        if department_id:
            dept_mgrs = db.query(User).join(User.roles).filter(
                User.department_id == department_id,
                Role.name.in_(["COURSE_MANAGER"])
            ).all()
            for m in dept_mgrs:
                recipients.add(m.id)

        # 2. All HR Admins and HR Managers
        hr_users = db.query(User).join(User.roles).filter(
            Role.name.in_(["HR_ADMIN"])
        ).all()
        for hr in hr_users:
            recipients.add(hr.id)

        # 3. Users in HR department
        hr_dept_users = db.query(User).join(Department).filter(Department.code == 'HR').all()
        for hr in hr_dept_users:
            recipients.add(hr.id)

        for rid in recipients:
            NotificationService.create_notification(
                db=db,
                user_id=rid,
                type=type,
                title=title,
                message=message,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id
            )

    @staticmethod
    def notify_system_admins(
        db: Session,
        type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[UUID] = None
    ):
        """Notifies all System Admins."""
        admins = db.query(User).join(User.roles).filter(Role.name == "SYSTEM_ADMIN").all()
        for admin in admins:
            NotificationService.create_notification(
                db=db,
                user_id=admin.id,
                type=type,
                title=title,
                message=message,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id
            )

    @staticmethod
    def check_course_locks_and_warn(db: Session) -> Dict[str, int]:
        """Job: Checks active enrollments approaching expiry or expired."""
        now = datetime.datetime.now(datetime.timezone.utc)
        enrollments = db.query(CourseEnrollment).filter(
            CourseEnrollment.status == 'active'
        ).all()
        
        warned_count = 0
        locked_count = 0

        for enr in enrollments:
            course = db.query(Course).filter(Course.id == enr.course_id).first()
            user = db.query(User).filter(User.id == enr.user_id).first()
            if not course or not user:
                continue

            max_days = course.duration_days or 20
            start_date = enr.created_at
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=datetime.timezone.utc)
            
            elapsed_days = (now - start_date).total_seconds() / 86400.0
            days_left = max_days - elapsed_days

            if days_left <= 0:
                # Lock course
                enr.status = 'locked'
                db.commit()
                locked_count += 1

                # Notify Employee
                NotificationService.create_notification(
                    db=db,
                    user_id=user.id,
                    type="course_locked",
                    title="Course Locked",
                    message=f"{course.title} has locked due to inactivity ({max_days}-day limit expired).",
                    related_entity_type="course",
                    related_entity_id=course.id
                )
                # Notify Manager & HR
                NotificationService.notify_department_managers_and_hr(
                    db=db,
                    department_id=user.department_id,
                    type="course_locked",
                    title="Employee Course Locked",
                    message=f"{user.full_name}'s course '{course.title}' has locked due to expiration.",
                    related_entity_type="course",
                    related_entity_id=course.id
                )
            elif days_left <= 2 and (enr.progress_percentage or 0) < 100:
                # Warn Employee (10% time remaining / 2 days left)
                warned_count += 1
                NotificationService.create_notification(
                    db=db,
                    user_id=user.id,
                    type="course_nearing_lock",
                    title="Course Nearing Lock",
                    message=f"{course.title} will lock in {int(days_left*24)} hours — currently {int(enr.progress_percentage or 0)}% complete.",
                    related_entity_type="course",
                    related_entity_id=course.id
                )

        return {"warned": warned_count, "locked": locked_count}

    @staticmethod
    def generate_weekly_admin_digest(db: Session) -> int:
        """Job: Generates weekly digest for System Admins on top-performing department & learner."""
        top_dept = db.query(
            Department.name,
            func.avg(ExamGrade.overall_score).label("avg_score")
        ).join(User, User.department_id == Department.id)\
         .join(ExamSubmission, ExamSubmission.user_id == User.id)\
         .join(ExamGrade, ExamGrade.submission_id == ExamSubmission.id)\
         .group_by(Department.name)\
         .order_by(desc("avg_score")).first()

        top_user = db.query(
            User.first_name,
            User.last_name,
            func.avg(ExamGrade.overall_score).label("avg_score")
        ).join(ExamSubmission, ExamSubmission.user_id == User.id)\
         .join(ExamGrade, ExamGrade.submission_id == ExamSubmission.id)\
         .group_by(User.id, User.first_name, User.last_name)\
         .order_by(desc("avg_score")).first()

        dept_str = f"{top_dept[0]} ({int(top_dept[1])}%)" if top_dept else "N/A"
        user_str = f"{top_user[0]} {top_user[1]} ({int(top_user[2])}%)" if top_user else "N/A"

        digest_msg = f"Weekly Executive Digest: Top Dept - {dept_str} | Top Performer - {user_str}."

        NotificationService.notify_system_admins(
            db=db,
            type="weekly_digest",
            title="Weekly Executive Digest",
            message=digest_msg,
            related_entity_type="system",
            related_entity_id=None
        )
        return 1
