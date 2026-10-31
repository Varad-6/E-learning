from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List

from app.core.dependencies import (
    get_db, get_current_user, RequireRoles,
    can_user_delete_course, can_user_edit_course, is_admin_user
)
from app.models.user import User
from app.models.course import Course
from app.models.role import Role
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseResponse, CourseListResponse,
    ModuleResponse, ModuleAssignRequest, MyCoursesResponse, CatalogResponse, CourseDetailResponse,
    CourseLearnerResponse
)
from app.services.course_service import CourseService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/courses", tags=["Courses"])
root_router = APIRouter(tags=["Courses & Learning (Root)"])

@router.get(
    "/my-courses",
    response_model=MyCoursesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Courses",
    description="Retrieve assigned and enrolled courses for current user with module progress."
)
def get_my_courses_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_my_courses(db, current_user=current_user)

@root_router.get(
    "/my-courses",
    response_model=MyCoursesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Courses (Root)",
    description="Retrieve assigned and enrolled courses for current user with module progress."
)
@root_router.get(
    "/api/my-courses",
    response_model=MyCoursesResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
def get_my_courses_root(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_my_courses(db, current_user=current_user)

@router.get(
    "/catalog",
    response_model=CatalogResponse,
    status_code=status.HTTP_200_OK,
    summary="Course Catalog",
    description="Retrieve course catalog with search, filter, sort and pagination."
)
def get_catalog_api(
    search: Optional[str] = None,
    category: Optional[str] = None,
    duration: Optional[str] = None,
    status: Optional[str] = None,
    sort: Optional[str] = "newest",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_catalog(
        db, current_user=current_user, search=search, category=category,
        duration=duration, status=status, sort=sort, skip=skip, limit=limit
    )

@root_router.get(
    "/courses",
    response_model=CatalogResponse,
    status_code=status.HTTP_200_OK,
    summary="Course Catalog (Root)",
    description="Root endpoint for course catalog with search, filter, sort and pagination."
)
def get_courses_catalog_root(
    search: Optional[str] = None,
    category: Optional[str] = None,
    duration: Optional[str] = None,
    status: Optional[str] = None,
    sort: Optional[str] = "newest",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_catalog(
        db, current_user=current_user, search=search, category=category,
        duration=duration, status=status, sort=sort, skip=skip, limit=limit
    )

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
    for c in courses:
        c.can_delete = can_user_delete_course(c, current_user)
        c.can_edit = can_user_edit_course(c, current_user)
    
    # Apply the same scope filtering to total count for correct pagination metadata
    roles = [r.name for r in current_user.roles]
    is_global_admin = any(r in roles for r in ["ADMIN", "SYSTEM_ADMIN", "HR_ADMIN"]) or (current_user.department and current_user.department.code in ["HR", "HR_ADMIN"])
    is_manager = any(r in roles for r in ["MANAGER", "COURSE_MANAGER"])

    total_count = db.query(Course)
    if not is_global_admin:
        from sqlalchemy import or_, and_
        total_count = total_count.filter(
            or_(
                Course.created_by == current_user.id,
                Course.status.in_(["approved", "published"])
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
    
    from app.models.course_department import CourseDepartment
    
    if not is_admin:
        dept_id = current_user.department_id
        if dept_id:
            dept_course_ids = [r[0] for r in db.query(CourseDepartment.course_id).filter(CourseDepartment.department_id == dept_id).all()]
            filters = [
                Course.department_id == dept_id,
                Course.department_id.is_(None)
            ]
            if dept_course_ids:
                filters.append(Course.id.in_(dept_course_ids))
            query = query.filter(or_(*filters))
    else:
        if department_id is not None:
            dept_course_ids = [r[0] for r in db.query(CourseDepartment.course_id).filter(CourseDepartment.department_id == department_id).all()]
            filters = [
                Course.department_id == department_id,
                Course.department_id.is_(None)
            ]
            if dept_course_ids:
                filters.append(Course.id.in_(dept_course_ids))
            query = query.filter(or_(*filters))
        
    courses = query.all()
    for c in courses:
        c.can_delete = can_user_delete_course(c, current_user)
        c.can_edit = can_user_edit_course(c, current_user)
    return CourseListResponse(courses=courses, total=len(courses))


@router.post(
    "/{course_id}/enroll",
    status_code=status.HTTP_200_OK,
    summary="Enroll in Course",
    description="Enroll current user in course."
)
def enroll_course_api(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = CourseService.enroll_course(db, course_id=course_id, current_user=current_user)
    return {
        "status": "success",
        "message": "Enrolled successfully",
        "enrollment_id": str(enrollment.id),
        "course_id": str(enrollment.course_id),
        "enrollment_status": enrollment.status
    }

@root_router.post(
    "/courses/{course_id}/enroll",
    status_code=status.HTTP_200_OK,
    summary="Enroll in Course (Root)",
    description="Enroll current user in course."
)
def enroll_course_root(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrollment = CourseService.enroll_course(db, course_id=course_id, current_user=current_user)
    return {
        "status": "success",
        "message": "Enrolled successfully",
        "enrollment_id": str(enrollment.id),
        "course_id": str(enrollment.course_id),
        "enrollment_status": enrollment.status
    }

@router.get(
    "/{course_id}",
    response_model=CourseDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Course",
    description="Retrieve details of a course by its ID."
)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_course_detail(db, course_id=course_id, current_user=current_user)

@router.get(
    "/{course_id}/learners",
    response_model=List[CourseLearnerResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Assigned Learners for a Course",
    description="Retrieve all employees enrolled or assigned to this course with their progress. Restricted to Managers and Admins."
)
def get_course_learners(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    return CourseService.get_course_learners(db, course_id=course_id)

@root_router.get(
    "/courses/{course_id}",
    response_model=CourseDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Course (Root)",
    description="Retrieve details of a course by its ID."
)
def get_course_root(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return CourseService.get_course_detail(db, course_id=course_id, current_user=current_user)

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
    course.can_delete = True
    course.can_edit = True
    AuditService.log_model_event(course, event_type="CREATE", performed_by=current_user.id)
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
    description="Update course details. Restricted to System Admin and the Course Creator."
)
def update_course(
    course_id: UUID,
    request: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = CourseService.get_course(db, course_id=course_id)
    if not can_user_edit_course(course, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the course creator or an administrator can edit this course."
        )
    updated_course = CourseService.update_course(db, course_id=course_id, request=request)
    updated_course.can_delete = can_user_delete_course(updated_course, current_user)
    updated_course.can_edit = True
    AuditService.log_model_event(updated_course, event_type="UPDATE", performed_by=current_user.id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="UPDATE_COURSE",
        target=updated_course.course_code or str(updated_course.id),
        details=f"Updated course details for: '{updated_course.title}'"
    )
    return updated_course

@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Course",
    description="Delete a course. Restricted to Admins and the Course Creator."
)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = CourseService.get_course(db, course_id=course_id)
    if not can_user_delete_course(course, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the course creator or an administrator can delete this course."
        )
    
    # Store code and title before deletion
    course_code = course.course_code or str(course_id)
    course_title = course.title

    # Eager load relationships before deleting
    for rel_name in ["modules", "enrollments", "approvals"]:
        if hasattr(course, rel_name):
            _ = getattr(course, rel_name)

    # Log deletion to Backup DB
    AuditService.log_model_event(course, event_type="DELETE", performed_by=current_user.id)

    CourseService.delete_course(db, course_id=course_id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="DELETE_COURSE",
        target=course_code,
        details=f"Deleted course: '{course_title}'"
    )
    return None

@root_router.delete(
    "/courses/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Course (Root)",
    description="Delete a course. Restricted to Admins and the Course Creator."
)
def delete_course_root(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_course(course_id=course_id, db=db, current_user=current_user)

@router.put(
    "/{course_id}/modules",
    response_model=List[ModuleResponse],
    status_code=status.HTTP_200_OK,
    summary="Assign Modules to Course",
    description="Assign existing modules to a course. Restricted to Admins and the Course Creator."
)
def assign_modules_to_course(
    course_id: UUID,
    request: ModuleAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = CourseService.get_course(db, course_id=course_id)
    if not can_user_edit_course(course, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the course creator or an administrator can assign modules to this course."
        )
    from app.services.module_service import ModuleService
    modules = ModuleService.assign_modules_to_course(db, course_id=course_id, module_ids=request.module_ids)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="ASSIGN_MODULES",
        target=str(course_id),
        details=f"Assigned {len(request.module_ids)} modules to course {course_id}"
    )
    return modules

@router.delete(
    "/{course_id}/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unassign Module from Course",
    description="Remove a module from a specific course. Restricted to Admins and the Course Creator."
)
def unassign_module_from_course(
    course_id: UUID,
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = CourseService.get_course(db, course_id=course_id)
    if not can_user_edit_course(course, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the course creator or an administrator can modify modules for this course."
        )
    from app.services.module_service import ModuleService
    ModuleService.unassign_module_from_course(db, course_id=course_id, module_id=module_id)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="UNASSIGN_MODULE",
        target=str(course_id),
        details=f"Unassigned module {module_id} from course {course_id}"
    )
    return None

@router.post(
    "/{course_id}/publish",
    response_model=CourseResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish Course",
    description="Publish an approved course. Restricted to Admins and the Course Creator."
)
def publish_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = CourseService.get_course(db, course_id=course_id)
    if not can_user_edit_course(course, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the course creator or an administrator can publish this course."
        )
    published = CourseService.publish_course(db, course_id=course_id)
    published.can_delete = can_user_delete_course(published, current_user)
    published.can_edit = True
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="PUBLISH_COURSE",
        target=published.course_code or str(published.id),
        details=f"Published course: '{published.title}'"
    )
    return published

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
    approval = CourseService.approve_course(db, course_id=course_id, reviewer_id=current_user.id)
    course = db.query(Course).filter(Course.id == course_id).first()
    course_title = course.title if course else "Course"
    course_code = (course.course_code or str(course_id)) if course else str(course_id)
    creator_id = course.created_by if course else None

    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="APPROVE_COURSE",
        target=course_code,
        details=f"Approved course: '{course_title}'"
    )
    
    # 🟢 Trigger notifications
    # Creator notification
    if creator_id:
        NotificationService.create_notification(
            db,
            user_id=creator_id,
            type="course_approved",
            title="Course Approved! 🎉",
            message=f"Your course '{course_title}' has been approved and published by the managers.",
            related_entity_id=course_id
        )
    return approval

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
    approval = CourseService.reject_course(
        db, course_id=course_id, reviewer_id=current_user.id, rejection_reason=rejection_reason
    )
    course = db.query(Course).filter(Course.id == course_id).first()
    course_title = course.title if course else "Course"
    course_code = (course.course_code or str(course_id)) if course else str(course_id)
    creator_id = course.created_by if course else None

    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="REJECT_COURSE",
        target=course_code,
        details=f"Rejected course '{course_title}'. Reason: {rejection_reason}"
    )
    
    # 🟢 Trigger notifications
    # Creator notification
    if creator_id:
        NotificationService.create_notification(
            db,
            user_id=creator_id,
            type="course_rejected",
            title="Course Rejected ❌",
            message=f"Your course '{course_title}' was rejected. Reason: {rejection_reason}",
            related_entity_id=course_id
        )
    return approval
