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
    courses = CourseService.list_courses(db, skip=skip, limit=limit, status_filter=status_filter)
    total_count = db.query(Course)
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
    description="Create a new course. Restricted to Admins and Managers."
)
def create_course(
    request: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return CourseService.create_course(db, request=request, user_id=current_user.id)

@router.put(
    "/{course_id}",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Course",
    description="Update course details. Restricted to Admins and Managers."
)
def update_course(
    course_id: UUID,
    request: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return CourseService.update_course(db, course_id=course_id, request=request)

@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Course",
    description="Delete a course. Restricted to Admins and Managers."
)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    CourseService.delete_course(db, course_id=course_id)
    return None

@router.post(
    "/{course_id}/publish",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish Course",
    description="Publish an approved course. Restricted to Admins and Managers."
)
def publish_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return CourseService.publish_course(db, course_id=course_id)

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
    return CourseService.submit_for_approval(db, course_id=course_id, user_id=current_user.id)

@router.post(
    "/{course_id}/approve",
    status_code=status.HTTP_200_OK,
    summary="Approve Course",
    description="Approve a pending course approval request. Restricted to Admins."
)
def approve_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    return CourseService.approve_course(db, course_id=course_id, reviewer_id=current_user.id)

@router.post(
    "/{course_id}/reject",
    status_code=status.HTTP_200_OK,
    summary="Reject Course",
    description="Reject a pending course approval request with a reason. Restricted to Admins."
)
def reject_course(
    course_id: UUID,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    return CourseService.reject_course(
        db, course_id=course_id, reviewer_id=current_user.id, rejection_reason=rejection_reason
    )
