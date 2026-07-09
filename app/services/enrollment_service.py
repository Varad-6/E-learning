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
                existing.expires_at = datetime.now(timezone.utc) + parse_duration(course.duration)
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

        expires_at = datetime.now(timezone.utc) + parse_duration(course.duration)
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
        return db.query(CourseEnrollment).filter(CourseEnrollment.user_id == user_id).all()

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

        db.commit()
        db.refresh(progress)

        # Check if all active content items in the course have been completed
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

        if total_contents > 0 and completed_contents >= total_contents:
            enrollment.status = "completed"
            enrollment.completed_at = datetime.now(timezone.utc)
            db.commit()

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

