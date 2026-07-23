from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from app.models.notification import Notification

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: UUID,
        type: str,
        title: str,
        message: str,
        related_entity_id: Optional[UUID] = None
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_entity_id=related_entity_id
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def check_and_trigger_overdue_escalations(db: Session):
        try:
            from datetime import datetime, timezone
            from app.models.course_enrollment import CourseEnrollment
            from app.models.user import User
            from app.models.role import Role
            
            now = datetime.now(timezone.utc)
            
            # Find uncompleted, non-dropped enrollments that have passed their expires_at date
            expired_enrollments = db.query(CourseEnrollment).filter(
                CourseEnrollment.expires_at.isnot(None),
                CourseEnrollment.expires_at < now,
                CourseEnrollment.status != "completed",
                CourseEnrollment.status != "dropped",
                CourseEnrollment.progress_percent < 100
            ).all()
            
            for enrollment in expired_enrollments:
                # Check if we already generated overdue escalation notifications for this enrollment
                existing = db.query(Notification).filter(
                    Notification.type == "overdue_escalation",
                    Notification.related_entity_id == enrollment.id
                ).first()
                
                if existing:
                    continue
                
                # Retrieve course and employee details
                employee = enrollment.user
                course = enrollment.course
                if not employee or not course:
                    continue
                
                emp_name = f"{employee.first_name} {employee.last_name}"
                title = "Course Completion Overdue Escalation"
                message = f"Employee {emp_name} ({employee.employee_code}) has failed to complete the course '{course.title}' within the allocated timeline (due: {enrollment.expires_at.strftime('%Y-%m-%d %H:%M')})."
                
                # Fetch target users to notify:
                recipients = []
                
                # 1. Managers in employee's department (if department is set)
                if employee.department_id:
                    managers = db.query(User).join(User.roles).filter(
                        User.department_id == employee.department_id,
                        Role.name == "COURSE_MANAGER",
                        User.is_active == True,
                        User.is_deleted == False
                    ).all()
                    recipients.extend(managers)
                    
                # 2. All HR Admins
                hr_admins = db.query(User).join(User.roles).filter(
                    Role.name == "HR_ADMIN",
                    User.is_active == True,
                    User.is_deleted == False
                ).all()
                recipients.extend(hr_admins)
                
                # 3. All System Admins
                sys_admins = db.query(User).join(User.roles).filter(
                    Role.name == "SYSTEM_ADMIN",
                    User.is_active == True,
                    User.is_deleted == False
                ).all()
                recipients.extend(sys_admins)
                
                # Deduplicate recipients
                unique_recipients = {r.id: r for r in recipients}
                
                for r_id in unique_recipients.keys():
                    notif = Notification(
                        user_id=r_id,
                        type="overdue_escalation",
                        title=title,
                        message=message,
                        related_entity_id=enrollment.id
                    )
                    db.add(notif)
                    
            db.commit()
        except Exception as err:
            # Prevent failures from impacting normal operations
            print(f"Error checking overdue escalations: {err}")

    @staticmethod
    def get_user_notifications(db: Session, user_id: UUID) -> List[Notification]:
        NotificationService.check_and_trigger_overdue_escalations(db)
        return db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).all()

    @staticmethod
    def mark_as_read(db: Session, user_id: UUID, notification_id: UUID) -> Optional[Notification]:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notification:
            notification.is_read = True
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: UUID) -> int:
        unread = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).all()
        for notification in unread:
            notification.is_read = True
        db.commit()
        return len(unread)
