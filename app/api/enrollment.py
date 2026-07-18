from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.models.course_enrollment import CourseEnrollment
from app.schemas.enrollment import (
    EnrollmentCreate, EnrollmentResponse, ProgressUpdate, UserProgressResponse, RosterEmployeeResponse
)
from app.services.enrollment_service import EnrollmentService
from app.services.audit_service import AuditService
from app.services.badge_service import BadgeService

router = APIRouter(prefix="/api/enrollments", tags=["Enrollments"])

@router.post(
    "",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll in Course",
    description="Enroll a user in a published course. Users can enroll themselves, or System Admins/Course Managers can enroll others."
)
def enroll_user(
    request: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user_id = current_user.id
    if request.user_id and request.user_id != current_user.id:
        user_roles = [r.name for r in current_user.roles]
        if "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Cannot enroll other users."
            )
        target_user_id = request.user_id

    enrollment = EnrollmentService.enroll_user(db, user_id=target_user_id, course_id=request.course_id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="ASSIGN_COURSE",
        target=enrollment.user.employee_code,
        details=f"Enrolled in course: '{enrollment.course.title}' (Code: {enrollment.course_code})"
    )
    return enrollment

@router.get(
    "/my-courses",
    response_model=List[EnrollmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get My Enrollments",
    description="Retrieve all course enrollments for the logged-in user."
)
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return EnrollmentService.get_user_enrollments(db, user_id=current_user.id)

@router.get(
    "/roster",
    response_model=List[RosterEmployeeResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Department Learning Roster for Current Manager",
    description="Retrieve the roster of all employees in the current manager's department. Restricted to System Admin and Course Manager."
)
def get_current_manager_roster(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
):
    if not current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not assigned to any department."
        )
    return EnrollmentService.get_department_roster(db, department_id=current_user.department_id)

@router.get(
    "/{enrollment_id}",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Enrollment",
    description="Retrieve enrollment details by enrollment ID. Accessible by the enrolled user, System Admin, or Course Manager."
)
def get_enrollment(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = EnrollmentService.get_enrollment(db, enrollment_id=enrollment_id)
    
    # Permission check
    user_roles = [r.name for r in current_user.roles]
    if enrollment.user_id != current_user.id and "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot view other users' enrollments."
        )
    return enrollment

@router.put(
    "/{enrollment_id}/progress",
    response_model=UserProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Course Progress",
    description="Update user progress for a module content item in a course enrollment."
)
def update_progress(
    enrollment_id: UUID,
    request: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = EnrollmentService.get_enrollment(db, enrollment_id=enrollment_id)
    
    # Permission check: Only the enrolled user can update their progress
    if enrollment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot update progress for another user."
        )
    return EnrollmentService.update_progress(db, user_id=current_user.id, request=request)

@router.post(
    "/{enrollment_id}/complete",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete Course",
    description="Mark a course enrollment as completed. Accessible by the enrolled user, System Admin, or Course Manager."
)
def complete_course(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = EnrollmentService.get_enrollment(db, enrollment_id=enrollment_id)
    
    # Permission check
    user_roles = [r.name for r in current_user.roles]
    if enrollment.user_id != current_user.id and "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot modify completion status of another user's enrollment."
        )
    result = EnrollmentService.complete_course(db, enrollment_id=enrollment_id)
    BadgeService.check_and_award_badges(db, enrollment.user_id)
    return result

@router.put(
    "/{enrollment_id}/progress-percent",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update progress percentage",
    description="Directly update the completion percentage of a course enrollment."
)
def update_progress_percent(
    enrollment_id: UUID,
    percent: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = EnrollmentService.get_enrollment(db, enrollment_id=enrollment_id)
    if enrollment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot update progress for another user."
        )
    result = EnrollmentService.update_progress_percent(db, enrollment_id=enrollment_id, percent=percent)
    if percent >= 100:
        BadgeService.check_and_award_badges(db, enrollment.user_id)
    return result

@router.post(
    "/{enrollment_id}/unlock",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Unlock Course Enrollment",
    description="Unlock a locked course enrollment and grant a duration extension (defaults to 3 days). Restricted to System Admin and Course Manager."
)
def unlock_enrollment(
    enrollment_id: UUID,
    extension_days: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
):
    return EnrollmentService.unlock_enrollment(db, enrollment_id=enrollment_id, extension_days=extension_days)

