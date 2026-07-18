from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.models.course import Course
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse
)
from app.services.course_service import CourseService
from app.services.audit_service import AuditService

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
    total_count = db.query(Course)
    if "SYSTEM_ADMIN" not in roles:
        from sqlalchemy import or_, and_
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
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
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
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
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
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
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
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
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
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
):
    course = CourseService.approve_course(db, course_id=course_id, reviewer_id=current_user.id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="APPROVE_COURSE",
        target=course.course_code or str(course.id),
        details=f"Approved course: '{course.title}'"
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
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER"))
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
    return course
