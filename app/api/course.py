from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.models.course import Course
from app.models.role import Role
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse
)
from app.services.course_service import CourseService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/courses", tags=["Courses"])

@router.get(
    "",
    response_model=CourseListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Courses",
    description="Retrieve a list of courses with optional pagination and status filtering."
)
def list_courses(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    courses = CourseService.list_courses(db, current_user=current_user, skip=skip, limit=limit, status_filter=status_filter)
    
    # Apply the same scope filtering to total count for correct pagination metadata
    roles = [r.name for r in current_user.roles]
    is_global_admin = any(r in roles for r in ["ADMIN", "SYSTEM_ADMIN", "HR_ADMIN"]) or (current_user.department and current_user.department.code in ["HR", "HR_ADMIN"])
    is_manager = any(r in roles for r in ["MANAGER", "COURSE_MANAGER"])

    total_count = db.query(Course)
    if not is_global_admin:
        from sqlalchemy import or_, and_
        if is_manager:
            total_count = total_count.filter(
                or_(
                    Course.created_by == current_user.id,
                    Course.department_id == current_user.department_id
                )
            )
        else:
            total_count = total_count.filter(
                or_(
                    Course.created_by == current_user.id,
                    and_(
                        Course.status.in_(["approved", "published"]),
                        Course.department_id == current_user.department_id
                    )
                )
            )
        
    if status_filter:
        total_count = total_count.filter(Course.status == status_filter)
    total = total_count.count()
    return CourseListResponse(courses=courses, total=total)

@router.get(
    "/available",
    response_model=CourseListResponse,
    status_code=200,
    summary="Get Available Courses for Current Employee",
    description="Returns all published courses visible to the current user in their department, regardless of enrollment status. This is the correct 'Available Courses' browse endpoint."
)
def get_available_courses(
    department_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_, and_
    
    # Extract user roles
    user_roles = [r.name for r in current_user.roles]
    is_admin = "SYSTEM_ADMIN" in user_roles or "HR_ADMIN" in user_roles
    
    query = db.query(Course).filter(
        Course.is_published == True,
        Course.status.in_(["approved", "published"])
    )
    
    if is_admin:
        # Admins see all courses by default, or filtered by department if specified
        if department_id is not None:
            query = query.filter(
                or_(
                    Course.department_id == department_id,
                    Course.department_id.is_(None)
                )
            )
    else:
        # Non-admins see only courses in their department (or unscoped company-wide courses)
        # We ignore client-supplied department_id for security of non-admins
        query = query.filter(
            or_(
                Course.department_id == current_user.department_id,
                Course.department_id.is_(None)
            )
        )
        
    courses = query.all()
    return CourseListResponse(courses=courses, total=len(courses))


@router.get(
    "/{course_id}",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Course",
    description="Retrieve details of a course by its ID."
)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_course(db, course_id=course_id)

@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Course",
    description="Create a new course. Restricted to System Admin, Course Manager."
)
def create_course(
    request: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.create_course(db, request=request, user_id=current_user.id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="CREATE_COURSE",
        target=course.course_code or str(course.id),
        details=f"Created course: '{course.title}'"
    )
    return course

@router.put(
    "/{course_id}",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Course",
    description="Update course details. Restricted to System Admin, Course Manager."
)
def update_course(
    course_id: UUID,
    request: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.update_course(db, course_id=course_id, request=request)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="UPDATE_COURSE",
        target=course.course_code or str(course.id),
        details=f"Updated course details for: '{course.title}'"
    )
    return course

@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Course",
    description="Delete a course. Restricted to System Admin and Course Manager."
)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.get_course(db, course_id=course_id)
    CourseService.delete_course(db, course_id=course_id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="DELETE_COURSE",
        target=course.course_code or str(course_id),
        details=f"Deleted course: '{course.title}'"
    )
    return None

@router.post(
    "/{course_id}/publish",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish Course",
    description="Publish an approved course. Restricted to System Admin and Course Manager."
)
def publish_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.publish_course(db, course_id=course_id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="PUBLISH_COURSE",
        target=course.course_code or str(course.id),
        details=f"Published course: '{course.title}'"
    )
    return course

@router.post(
    "/{course_id}/submit-for-approval",
    status_code=status.HTTP_200_OK,
    summary="Submit Course for Approval",
    description="Submit a draft course for review and approval."
)
def submit_for_approval(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = CourseService.submit_for_approval(db, course_id=course_id, user_id=current_user.id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="SUBMIT_COURSE_APPROVAL",
        target=course.course_code or str(course.id),
        details=f"Submitted course '{course.title}' for manager approval"
    )
    
    # 🟢 Trigger notifications
    # Creator notification
    NotificationService.create_notification(
        db,
        user_id=course.creator_id,
        type="course_submitted",
        title="Course Submitted for Approval",
        message=f"Your course '{course.title}' has been submitted for review.",
        related_entity_id=course.id
    )
    
    # Manager notification
    if course.department_id:
        managers = db.query(User).join(User.roles).filter(
            User.department_id == course.department_id,
            Role.name == "COURSE_MANAGER"
        ).all()
        for mgr in managers:
            NotificationService.create_notification(
                db,
                user_id=mgr.id,
                type="course_pending",
                title="New Course Pending Approval",
                message=f"Course '{course.title}' by {current_user.first_name} {current_user.last_name} is pending your approval.",
                related_entity_id=course.id
            )
    return course

@router.post(
    "/{course_id}/approve",
    status_code=status.HTTP_200_OK,
    summary="Approve Course",
    description="Approve a pending course approval request. Restricted to System Admin and Course Manager."
)
def approve_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.approve_course(db, course_id=course_id, reviewer_id=current_user.id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="APPROVE_COURSE",
        target=course.course_code or str(course.id),
        details=f"Approved course: '{course.title}'"
    )
    
    # 🟢 Trigger notifications
    # Creator notification
    NotificationService.create_notification(
        db,
        user_id=course.creator_id,
        type="course_approved",
        title="Course Approved! 🎉",
        message=f"Your course '{course.title}' has been approved and published by the managers.",
        related_entity_id=course.id
    )
    return course

@router.post(
    "/{course_id}/reject",
    status_code=status.HTTP_200_OK,
    summary="Reject Course",
    description="Reject a pending course approval request with a reason. Restricted to System Admin and Course Manager."
)
def reject_course(
    course_id: UUID,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.reject_course(
        db, course_id=course_id, reviewer_id=current_user.id, rejection_reason=rejection_reason
    )
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="REJECT_COURSE",
        target=course.course_code or str(course.id),
        details=f"Rejected course '{course.title}'. Reason: {rejection_reason}"
    )
    
    # 🟢 Trigger notifications
    # Creator notification
    NotificationService.create_notification(
        db,
        user_id=course.creator_id,
        type="course_rejected",
        title="Course Rejected ❌",
        message=f"Your course '{course.title}' was rejected. Reason: {rejection_reason}",
        related_entity_id=course.id
    )
    return course
