from datetime import datetime, timezone, timedelta
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import re

from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.models.user import User
from app.models.user_course_progress import UserCourseProgress
from app.schemas.enrollment import ProgressUpdate

def parse_duration(duration_str: str) -> timedelta:
    if not duration_str:
        return timedelta(days=3)  # default fallback
    
    duration_str = duration_str.strip().lower()
    days, hours, minutes, seconds = 0, 0, 0, 0
    
    day_match = re.search(r'(\d+)\s*d', duration_str)
    hour_match = re.search(r'(\d+)\s*h', duration_str)
    min_match = re.search(r'(\d+)\s*m', duration_str)
    sec_match = re.search(r'(\d+)\s*s', duration_str)
    
    if not any([day_match, hour_match, min_match, sec_match]):
        if 'day' in duration_str:
            day_match = re.search(r'(\d+)', duration_str)
        elif 'hour' in duration_str:
            hour_match = re.search(r'(\d+)', duration_str)
        elif 'minute' in duration_str or 'min' in duration_str:
            min_match = re.search(r'(\d+)', duration_str)
        elif 'second' in duration_str or 'sec' in duration_str:
            sec_match = re.search(r'(\d+)', duration_str)
            
    if day_match:
        days = int(day_match.group(1))
    if hour_match:
        hours = int(hour_match.group(1))
    if min_match:
        minutes = int(min_match.group(1))
    if sec_match:
        seconds = int(sec_match.group(1))
        
    if days == 0 and hours == 0 and minutes == 0 and seconds == 0:
        try:
            hours = int(duration_str)
        except ValueError:
            return timedelta(days=3)
            
    return timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)

class EnrollmentService:
    @staticmethod
    def enroll_user(db: Session, user_id: UUID, course_id: UUID) -> CourseEnrollment:
        # Check course exists and is published
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )
        if not course.is_published:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot enroll in an unpublished course."
            )

        # Check user exists
        user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        # Check existing enrollment
        existing = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id
        ).first()

        if existing:
            if existing.status == "dropped":
                existing.status = "enrolled"
                existing.enrolled_at = datetime.now(timezone.utc)
                base_time = course.published_at if course.published_at is not None else datetime.now(timezone.utc)
                existing.expires_at = base_time + parse_duration(course.duration)
                existing.is_locked = False
                existing.completed_at = None
                db.commit()
                db.refresh(existing)
                return existing
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already enrolled in this course."
                )

        base_time = course.published_at if course.published_at is not None else datetime.now(timezone.utc)
        expires_at = base_time + parse_duration(course.duration)
        enrollment = CourseEnrollment(
            user_id=user_id,
            course_id=course_id,
            status="enrolled",
            enrolled_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            is_locked=False
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return enrollment

    @staticmethod
    def get_user_enrollments(db: Session, user_id: UUID) -> List[CourseEnrollment]:
        return db.query(CourseEnrollment).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.user_id == user_id,
            Course.status == "published"
        ).all()

    @staticmethod
    def update_progress(db: Session, user_id: UUID, request: ProgressUpdate) -> UserCourseProgress:
        # 1. Validate module exists
        module = db.query(CourseModule).filter(CourseModule.id == request.module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {request.module_id} not found."
            )

        # 2. Validate content exists and belongs to module
        content = db.query(ModuleContent).filter(
            ModuleContent.id == request.content_id
        ).first()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Content with ID {request.content_id} not found."
            )
        if content.module_id != request.module_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Content does not belong to the specified module."
            )

        # 3. Validate module belongs to enrolled course (and active enrollment exists)
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == module.course_id,
            CourseEnrollment.status != "dropped"
        ).first()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active course enrollment matching this course module not found."
            )

        # Check deadline locking
        EnrollmentService._check_and_lock(db, enrollment)

        # Enforce sequential lock
        course_id = module.course_id
        modules = db.query(CourseModule).filter(CourseModule.course_id == course_id).all()

        # Sort modules: Beginner -> Intermediate -> Advanced
        def get_tier_rank(tier: str) -> int:
            t = tier.lower() if tier else ""
            if t == "intermediate": return 1
            elif t == "advanced": return 2
            return 0 # beginner

        modules.sort(key=lambda m: (get_tier_rank(m.tier), m.sequence_no))

        mod_index = next((i for i, m in enumerate(modules) if m.id == module.id), -1)
        if mod_index > 0:
            prev_mod = modules[mod_index - 1]
            # Check if prev_mod is completed
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
                    detail=f"Module '{module.title}' is locked. You must complete '{prev_mod.title}' first."
                )

        # Update enrollment status to in_progress if currently enrolled
        if enrollment.status == "enrolled":
            enrollment.status = "in_progress"

        progress = db.query(UserCourseProgress).filter(
            UserCourseProgress.enrollment_id == enrollment.id,
            UserCourseProgress.module_id == request.module_id,
            UserCourseProgress.content_id == request.content_id
        ).first()

        if progress:
            progress.time_spent_seconds += request.time_spent_seconds
            if request.completed and not progress.completed:
                progress.completed = True
                progress.completed_at = datetime.now(timezone.utc)
            elif not request.completed:
                progress.completed = False
                progress.completed_at = None
        else:
            progress = UserCourseProgress(
                enrollment_id=enrollment.id,
                module_id=request.module_id,
                content_id=request.content_id,
                completed=request.completed,
                completed_at=datetime.now(timezone.utc) if request.completed else None,
                time_spent_seconds=request.time_spent_seconds
            )
            db.add(progress)

        db.flush() # Ensure DB state is updated for query counts below

        # Recalculate progress percent server-side to avoid lost updates
        total_contents = db.query(ModuleContent).join(
            CourseModule, CourseModule.id == ModuleContent.module_id
        ).filter(
            CourseModule.course_id == enrollment.course_id,
            ModuleContent.is_active == True
        ).count()

        completed_contents = db.query(UserCourseProgress).filter(
            UserCourseProgress.enrollment_id == enrollment.id,
            UserCourseProgress.completed == True
        ).count()

        if total_contents > 0:
            enrollment.progress_percent = int((completed_contents / total_contents) * 100)
            if completed_contents >= total_contents:
                enrollment.status = "completed"
                enrollment.completed_at = datetime.now(timezone.utc)
            elif enrollment.progress_percent > 0:
                enrollment.status = "in_progress"
            else:
                enrollment.status = "enrolled"
        else:
            enrollment.progress_percent = 0

        db.commit()
        db.refresh(progress)
        db.refresh(enrollment)

        if enrollment.status == "completed":
            from app.services.badge_service import BadgeService
            BadgeService.check_and_award_badges(db, enrollment.user_id)

        return progress

    @staticmethod
    def complete_course(db: Session, enrollment_id: UUID) -> CourseEnrollment:
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )

        # Check deadline locking
        EnrollmentService._check_and_lock(db, enrollment)

        if enrollment.status != "completed":
            enrollment.status = "completed"
            enrollment.completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(enrollment)
            from app.services.badge_service import BadgeService
            BadgeService.check_and_award_badges(db, enrollment.user_id)

        return enrollment

    @staticmethod
    def _check_and_lock(db: Session, enrollment: CourseEnrollment) -> None:
        """Helper to evaluate if a course enrollment has expired and locks it."""
        if enrollment.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Course is locked because the deadline has passed."
            )
        
        if enrollment.expires_at:
            expires_at_utc = enrollment.expires_at
            if expires_at_utc.tzinfo is None:
                expires_at_utc = expires_at_utc.replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) > expires_at_utc:
                enrollment.is_locked = True
                enrollment.status = "dropped" # mark inactive/dropped when expired
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Course is locked because the deadline has passed."
                )

    @staticmethod
    def update_progress_percent(db: Session, enrollment_id: UUID, percent: int) -> CourseEnrollment:
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )
        
        # Check deadline locking
        EnrollmentService._check_and_lock(db, enrollment)

        enrollment.progress_percent = percent
        if percent >= 100:
            enrollment.status = "completed"
            if not enrollment.completed_at:
                enrollment.completed_at = datetime.now(timezone.utc)
        elif percent > 0:
            enrollment.status = "in_progress"
        else:
            enrollment.status = "enrolled"
            
        db.commit()
        db.refresh(enrollment)

        if enrollment.status == "completed":
            from app.services.badge_service import BadgeService
            BadgeService.check_and_award_badges(db, enrollment.user_id)

        return enrollment

    @staticmethod
    def get_enrollment(db: Session, enrollment_id: UUID) -> CourseEnrollment:
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )
        
        # Reactively check expiration on read
        if not enrollment.is_locked and enrollment.expires_at:
            expires_at_utc = enrollment.expires_at
            if expires_at_utc.tzinfo is None:
                expires_at_utc = expires_at_utc.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at_utc:
                enrollment.is_locked = True
                enrollment.status = "dropped"
                db.commit()
                db.refresh(enrollment)
                
        return enrollment

    @staticmethod
    def unlock_enrollment(db: Session, enrollment_id: UUID, extension_days: int = 3) -> CourseEnrollment:
        """Unlock a locked enrollment and extend the expiration date."""
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )
        
        enrollment.is_locked = False
        # If it was marked dropped due to lock, reset to enrolled or in_progress
        if enrollment.status == "dropped":
            enrollment.status = "in_progress" if enrollment.progress_percent > 0 else "enrolled"
            
        enrollment.expires_at = datetime.now(timezone.utc) + timedelta(days=extension_days)
        db.commit()
        db.refresh(enrollment)
        return enrollment

    @staticmethod
    def get_department_roster(db: Session, department_id: UUID) -> List[dict]:
        """Retrieve the learning roster of all employees in a department, including progress and quiz scores."""
        from app.models.quiz_attempt import QuizAttempt
        from app.models.quiz import Quiz
        from app.models.course_module import CourseModule
        from app.models.course import Course

        users = db.query(User).filter(User.department_id == department_id, User.is_deleted == False).all()

        roster = []
        for user in users:
            # Check completed courses count (published only)
            completed_count = db.query(CourseEnrollment).join(
                Course, CourseEnrollment.course_id == Course.id
            ).filter(
                CourseEnrollment.user_id == user.id,
                CourseEnrollment.status == "completed",
                Course.status == "published"
            ).count()

            # Find newest active course enrollment (published only)
            active_enroll = db.query(CourseEnrollment).join(
                Course, CourseEnrollment.course_id == Course.id
            ).filter(
                CourseEnrollment.user_id == user.id,
                CourseEnrollment.status.in_(["enrolled", "in_progress"]),
                Course.status == "published"
            ).order_by(CourseEnrollment.enrolled_at.desc()).first()

            assigned_course = "None"
            progress_percent = 0
            if active_enroll:
                assigned_course = active_enroll.course.course_code if active_enroll.course else "Course"
                progress_percent = active_enroll.progress_percent

            # Fetch all quiz attempts (standalone or published-course-linked only)
            from sqlalchemy import or_
            attempts = db.query(QuizAttempt).join(
                Quiz, QuizAttempt.quiz_id == Quiz.id
            ).outerjoin(
                CourseModule, Quiz.module_id == CourseModule.id
            ).outerjoin(
                Course, CourseModule.course_id == Course.id
            ).filter(
                QuizAttempt.user_id == user.id,
                or_(
                    Course.id.is_(None),
                    Course.status == "published"
                )
            ).all()
            
            test_marks = []
            for att in attempts:
                course_code = "None"
                if att.quiz and att.quiz.module and att.quiz.module.course:
                    course_code = att.quiz.module.course.course_code

                test_marks.append({
                    "courseCode": course_code,
                    "testName": att.quiz.title if att.quiz else "Quiz",
                    "score": int(att.score)
                })

            full_name = f"{user.first_name} {user.last_name}".strip()

            # Get user's highest active badge tier
            from app.models.user_badge import UserBadge
            from app.models.badge_tier import BadgeTier
            highest_badge = db.query(UserBadge).join(
                BadgeTier, UserBadge.badge_tier_id == BadgeTier.id
            ).filter(
                UserBadge.user_id == user.id
            ).order_by(
                BadgeTier.tier_order.desc()
            ).first()
            badge_name = highest_badge.badge_tier.name if highest_badge else None

            roster.append({
                "id": user.id,
                "name": full_name,
                "code": user.employee_code,
                "email": user.email,
                "coursesTaken": completed_count,
                "assignedCourse": assigned_course,
                "progressPercent": progress_percent,
                "testMarks": test_marks,
                "badgeName": badge_name
            })

        return roster


