from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
import re

from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.models.user import User
from app.models.user_course_progress import UserCourseProgress
from app.schemas.enrollment import ProgressUpdate

def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize a datetime to timezone-aware UTC."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

def parse_duration(duration_str: Optional[str]) -> Optional[timedelta]:
    """Parse a duration string into a timedelta, returning None if unset or zero (no hardcoded fallback)."""
    if not duration_str or not duration_str.strip():
        return None
    
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
            return None
            
    delta = timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
    return delta if delta.total_seconds() > 0 else None

def compute_course_deadline(course: Course, enrolled_at: Optional[datetime] = None) -> Optional[datetime]:
    """Compute enrollment expiration from explicit course end_date or Admin-configured duration; None if no deadline."""
    if getattr(course, "end_date", None) is not None:
        return _ensure_utc(course.end_date)
    delta = parse_duration(getattr(course, "duration", None))
    if delta is None:
        return None
    base_time = _ensure_utc(getattr(course, "start_date", None)) or _ensure_utc(enrolled_at) or datetime.now(timezone.utc)
    return base_time + delta

class EnrollmentService:
    @staticmethod
    def assign_course_to_departments(db: Session, course_id: UUID) -> int:
        """Assign/enroll all matching employees in a course based on its target departments."""
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return 0

        from app.models.course_department import CourseDepartment
        from app.models.department import Department
        from app.services.notification_service import NotificationService
        
        # Check if All Departments
        dept_assocs = db.query(CourseDepartment).filter(CourseDepartment.course_id == course_id).all()
        target_dept_ids = list({da.department_id for da in dept_assocs})
        total_dept_count = db.query(Department).count()

        is_all_depts = (
            course.department_id is None
            or (total_dept_count > 0 and len(target_dept_ids) >= total_dept_count)
        )

        user_query = db.query(User).filter(User.is_active == True, User.is_deleted == False)
        if not is_all_depts:
            dept_id_set = set(target_dept_ids)
            if course.department_id:
                dept_id_set.add(course.department_id)
            if dept_id_set:
                user_query = user_query.filter(User.department_id.in_(dept_id_set))
            else:
                user_query = user_query.filter(False)

        target_users = user_query.all()
        target_user_ids = {u.id for u in target_users}

        # Clean up stale unstarted enrollments if targeting changed away from their department
        if not is_all_depts:
            stale_query = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.progress_percent == 0,
                CourseEnrollment.status == "enrolled"
            )
            if target_user_ids:
                stale_query = stale_query.filter(~CourseEnrollment.user_id.in_(target_user_ids))
            for se in stale_query.all():
                db.delete(se)

        existing_map = {
            e.user_id: e
            for e in db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course.id).all()
        }

        assigned_count = 0
        newly_assigned_user_ids = []
        now = datetime.now(timezone.utc)
        expires_at = compute_course_deadline(course, enrolled_at=now)

        for u in target_users:
            existing = existing_map.get(u.id)
            if not existing:
                new_enr = CourseEnrollment(
                    user_id=u.id,
                    course_id=course.id,
                    status="enrolled",
                    progress_percent=0,
                    enrolled_at=now,
                    expires_at=expires_at,
                    is_locked=False
                )
                db.add(new_enr)
                assigned_count += 1
                newly_assigned_user_ids.append(u.id)
            elif existing.status == "dropped" and not existing.is_locked:
                existing.status = "enrolled"
                existing.progress_percent = 0
                existing.enrolled_at = now
                existing.expires_at = expires_at
                existing.completed_at = None
                assigned_count += 1
                newly_assigned_user_ids.append(u.id)

        db.commit()

        # Batch-create notifications in a single transaction so a notification issue never breaks enrollments
        if newly_assigned_user_ids:
            from app.models.notification import Notification
            try:
                for uid in newly_assigned_user_ids:
                    db.add(Notification(
                        user_id=uid,
                        type="course_assigned",
                        title="New Course Assigned",
                        message=f"You have been assigned to course '{course.title}'.",
                        related_entity_id=course.id,
                        is_read=False
                    ))
                db.commit()
            except Exception:
                db.rollback()

        return assigned_count

    @staticmethod
    def auto_enroll_mandatory_course(db: Session, course_id: UUID) -> None:
        """Auto enroll all matching employees in a course."""
        EnrollmentService.assign_course_to_departments(db, course_id)

    @staticmethod
    def auto_enroll_user_in_mandatory_courses(db: Session, user_id: UUID) -> None:
        """Auto enroll user in all applicable department / company-wide published courses."""
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
            User.is_deleted == False
        ).first()
        if not user:
            return
        from sqlalchemy import or_
        from app.models.course_department import CourseDepartment
        dept_course_ids = []
        if user.department_id:
            dept_course_ids = [r[0] for r in db.query(CourseDepartment.course_id).filter(CourseDepartment.department_id == user.department_id).all()]
        
        filter_cond = [Course.department_id.is_(None)]
        if user.department_id:
            filter_cond.append(Course.department_id == user.department_id)
        if dept_course_ids:
            filter_cond.append(Course.id.in_(dept_course_ids))

        courses = db.query(Course).filter(
            Course.is_published == True,
            Course.status.in_(["approved", "published"]),
            or_(*filter_cond)
        ).all()
        if not courses:
            return

        existing_course_ids = {
            r[0] for r in db.query(CourseEnrollment.course_id).filter(
                CourseEnrollment.user_id == user.id
            ).all()
        }

        now = datetime.now(timezone.utc)
        added = False
        for c in courses:
            if c.id not in existing_course_ids:
                expires_at = compute_course_deadline(c, enrolled_at=now)
                new_enr = CourseEnrollment(
                    user_id=user.id,
                    course_id=c.id,
                    status="enrolled",
                    progress_percent=0,
                    enrolled_at=now,
                    expires_at=expires_at,
                    is_locked=False
                )
                db.add(new_enr)
                added = True
        if added:
            db.commit()

    @staticmethod
    def enroll_user(db: Session, user_id: UUID, course_id: UUID, enrolled_by: UUID = None) -> CourseEnrollment:
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
            if existing.status == "dropped" and not existing.is_locked:
                now = datetime.now(timezone.utc)
                existing.status = "enrolled"
                existing.enrolled_at = now
                existing.enrolled_by = enrolled_by
                existing.expires_at = compute_course_deadline(course, enrolled_at=now)
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

        now = datetime.now(timezone.utc)
        expires_at = compute_course_deadline(course, enrolled_at=now)
        enrollment = CourseEnrollment(
            user_id=user_id,
            course_id=course_id,
            enrolled_by=enrolled_by,
            status="enrolled",
            enrolled_at=now,
            expires_at=expires_at,
            is_locked=False
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return enrollment

    @staticmethod
    def get_user_enrollments(db: Session, user_id: UUID) -> List[CourseEnrollment]:
        EnrollmentService.auto_enroll_user_in_mandatory_courses(db, user_id)
        enrollments = db.query(CourseEnrollment).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.user_id == user_id,
            Course.is_published == True,
            Course.status.in_(["published", "approved"]),
            or_(CourseEnrollment.status != "dropped", CourseEnrollment.is_locked == True)
        ).all()
        updated = False
        for enr in enrollments:
            if enr.status == "completed" and (enr.progress_percent or 0) < 100:
                enr.progress_percent = 100
                updated = True
        if updated:
            db.commit()
        return enrollments

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

        # Enforce server-side sequential module locking (prevent skip-ahead exploits)
        course_id = module.course_id
        modules = db.query(CourseModule).filter(CourseModule.course_id == course_id).all()

        def get_tier_rank(tier) -> int:
            t = (tier or "").lower()
            if t == "intermediate":
                return 1
            elif t == "advanced":
                return 2
            return 0

        modules.sort(key=lambda m: (get_tier_rank(m.tier), m.sequence_no or 0))

        mod_index = next((i for i, m in enumerate(modules) if m.id == module.id), -1)
        if mod_index > 0:
            for i in range(mod_index):
                prev_mod = modules[i]
                total_prev_contents = db.query(ModuleContent).filter(
                    ModuleContent.module_id == prev_mod.id,
                    ModuleContent.is_active == True,
                    ModuleContent.content_type.notin_(["title", "subtitle"])
                ).count()
                if total_prev_contents > 0:
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

        # Realistic time increment capping (prevents reporting 10000s in one heartbeat)
        increment_seconds = max(0, min(request.time_spent_seconds, 60))

        # Sync duration if reported from client video player
        if request.duration_seconds and request.duration_seconds > 0:
            if not content.duration_seconds or content.duration_seconds == 0:
                content.duration_seconds = int(request.duration_seconds)

        should_mark_complete = bool(request.completed)

        if progress:
            progress.time_spent_seconds += increment_seconds
            if should_mark_complete and not progress.completed:
                progress.completed = True
                progress.completed_at = datetime.now(timezone.utc)
            elif not should_mark_complete and not progress.completed:
                progress.completed = False
                progress.completed_at = None
        else:
            progress = UserCourseProgress(
                enrollment_id=enrollment.id,
                module_id=request.module_id,
                content_id=request.content_id,
                completed=should_mark_complete,
                completed_at=datetime.now(timezone.utc) if should_mark_complete else None,
                time_spent_seconds=increment_seconds
            )
            db.add(progress)

        db.flush() # Ensure DB state is updated for query counts below

        # Recalculate progress percent server-side to avoid lost updates
        completed_items, total_items = EnrollmentService._recalculate_progress_counts(db, enrollment)

        if total_items > 0:
            enrollment.progress_percent = int((completed_items / total_items) * 100)
            if completed_items >= total_items or enrollment.progress_percent >= 100:
                enrollment.status = "completed"
                enrollment.progress_percent = 100
                if not enrollment.completed_at:
                    enrollment.completed_at = datetime.now(timezone.utc)
            elif enrollment.progress_percent > 0:
                enrollment.status = "in_progress"
            else:
                enrollment.status = "enrolled"
        else:
            enrollment.progress_percent = 0

        enrollment.last_accessed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(progress)
        db.refresh(enrollment)

        if enrollment.status == "completed":
            from app.services.badge_service import BadgeService
            BadgeService.check_and_award_badges(db, enrollment.user_id)

        return progress

    @staticmethod
    def _recalculate_progress_counts(db: Session, enrollment: CourseEnrollment) -> tuple[int, int]:
        """Return (completed_items, total_items) including active lessons and quizzes."""
        from app.models.quiz import Quiz
        from app.models.quiz_attempt import QuizAttempt

        total_contents = db.query(ModuleContent).join(
            CourseModule, CourseModule.id == ModuleContent.module_id
        ).filter(
            CourseModule.course_id == enrollment.course_id,
            ModuleContent.is_active == True,
            ModuleContent.content_type.notin_(["title", "subtitle"])
        ).count()

        completed_contents = db.query(UserCourseProgress).filter(
            UserCourseProgress.enrollment_id == enrollment.id,
            UserCourseProgress.completed == True
        ).count()

        total_quizzes = db.query(Quiz).join(
            CourseModule, CourseModule.id == Quiz.module_id
        ).filter(
            CourseModule.course_id == enrollment.course_id,
            Quiz.is_published == True
        ).count()

        completed_quizzes = db.query(QuizAttempt.quiz_id).join(
            Quiz, Quiz.id == QuizAttempt.quiz_id
        ).join(
            CourseModule, CourseModule.id == Quiz.module_id
        ).filter(
            CourseModule.course_id == enrollment.course_id,
            QuizAttempt.user_id == enrollment.user_id
        ).distinct().count()

        total_items = total_contents + total_quizzes
        completed_items = completed_contents + completed_quizzes
        return completed_items, total_items

    @staticmethod
    def complete_course(
        db: Session,
        enrollment_id: UUID,
        require_all_completed: bool = True,
    ) -> CourseEnrollment:
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )

        # Check deadline locking
        EnrollmentService._check_and_lock(db, enrollment)

        # Ensure all active module contents are marked completed in UserCourseProgress
        active_contents = db.query(ModuleContent).join(
            CourseModule, CourseModule.id == ModuleContent.module_id
        ).filter(
            CourseModule.course_id == enrollment.course_id,
            ModuleContent.is_active == True,
            ModuleContent.content_type.notin_(["title", "subtitle"])
        ).all()
        for ac in active_contents:
            prog = db.query(UserCourseProgress).filter(
                UserCourseProgress.enrollment_id == enrollment.id,
                UserCourseProgress.content_id == ac.id
            ).first()
            if prog:
                prog.completed = True
                if not prog.completed_at:
                    prog.completed_at = datetime.now(timezone.utc)
            else:
                db.add(UserCourseProgress(
                    enrollment_id=enrollment.id,
                    module_id=ac.module_id,
                    content_id=ac.id,
                    completed=True,
                    completed_at=datetime.now(timezone.utc),
                    time_spent_seconds=60
                ))

        enrollment.status = "completed"
        enrollment.progress_percent = 100
        if not enrollment.completed_at:
            enrollment.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(enrollment)
        from app.services.badge_service import BadgeService
        BadgeService.check_and_award_badges(db, enrollment.user_id)

        return enrollment

    @staticmethod
    def _check_and_lock(db: Session, enrollment: CourseEnrollment) -> None:
        """Helper to evaluate start date and expiration lock without dropping visibility."""
        if enrollment.course and getattr(enrollment.course, "start_date", None):
            start_utc = _ensure_utc(enrollment.course.start_date)
            if start_utc and datetime.now(timezone.utc) < start_utc:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Course has not started yet. Available from {start_utc.strftime('%Y-%m-%d %H:%M UTC')}."
                )

        if enrollment.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Course is locked because the deadline has passed."
            )
        
        if enrollment.expires_at:
            expires_at_utc = _ensure_utc(enrollment.expires_at)
            if expires_at_utc and datetime.now(timezone.utc) > expires_at_utc:
                enrollment.is_locked = True
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Course is locked because the deadline has passed."
                )

    @staticmethod
    def update_progress_percent(
        db: Session,
        enrollment_id: UUID,
        percent: int,
        trust_client_percent: bool = True,
    ) -> CourseEnrollment:
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )
        
        # Check deadline locking
        EnrollmentService._check_and_lock(db, enrollment)

        if enrollment.status == "completed":
            enrollment.progress_percent = 100
            enrollment.last_accessed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(enrollment)
            return enrollment

        completed_items, total_items = EnrollmentService._recalculate_progress_counts(db, enrollment)
        server_pct = int((completed_items / total_items) * 100) if total_items > 0 else 0

        # Choose the higher of client-reported or server-calculated percent
        effective_percent = max(percent, server_pct) if trust_client_percent else server_pct
        enrollment.progress_percent = max(0, min(effective_percent, 100))
        enrollment.last_accessed_at = datetime.now(timezone.utc)

        if enrollment.progress_percent >= 100 or (total_items > 0 and completed_items >= total_items):
            enrollment.status = "completed"
            enrollment.progress_percent = 100
            if not enrollment.completed_at:
                enrollment.completed_at = datetime.now(timezone.utc)
        elif enrollment.progress_percent > 0:
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
        
        if enrollment.status == "completed" and (enrollment.progress_percent or 0) < 100:
            enrollment.progress_percent = 100
            db.commit()

        # Reactively check expiration on read without hiding enrollment
        if not enrollment.is_locked and enrollment.expires_at and enrollment.status != "completed":
            expires_at_utc = _ensure_utc(enrollment.expires_at)
            if expires_at_utc and datetime.now(timezone.utc) > expires_at_utc:
                enrollment.is_locked = True
                db.commit()
                db.refresh(enrollment)
                
        return enrollment

    @staticmethod
    def unlock_enrollment(
        db: Session,
        enrollment_id: UUID,
        extension_days: Optional[int] = None,
        new_end_date: Optional[datetime] = None
    ) -> CourseEnrollment:
        """Unlock a locked enrollment with an explicit extension or new end date (or remove expiry)."""
        enrollment = db.query(CourseEnrollment).filter(CourseEnrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found."
            )
        
        enrollment.is_locked = False
        if enrollment.status == "dropped":
            enrollment.status = "in_progress" if enrollment.progress_percent > 0 else "enrolled"
            
        if new_end_date is not None:
            enrollment.expires_at = _ensure_utc(new_end_date)
        elif extension_days is not None and extension_days > 0:
            enrollment.expires_at = datetime.now(timezone.utc) + timedelta(days=extension_days)
        else:
            enrollment.expires_at = None
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
