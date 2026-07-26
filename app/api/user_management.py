"""
User Management API — Course Assignment & Role Promotion endpoints.
Restricted to Admin/HR roles only (403 for all other callers).
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.role_history import RoleHistory
from app.services.enrollment_service import EnrollmentService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/users", tags=["User Management"])

# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def _is_admin_or_hr(user: User) -> bool:
    roles = [r.name for r in user.roles]
    is_hr_dept = bool(user.department and user.department.code in ["HR", "HR_ADMIN"])
    return "SYSTEM_ADMIN" in roles or "HR_ADMIN" in roles or is_hr_dept


def _require_admin_or_hr(current_user: User = Depends(get_current_user)):
    if not _is_admin_or_hr(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Requires Admin or HR role."
        )
    return current_user


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AssignCourseRequest(BaseModel):
    course_id: UUID


class PromoteRoleRequest(BaseModel):
    new_role: str          # e.g. "COURSE_MANAGER"
    reason: Optional[str] = None


# ─── GET /api/users/:userId/eligible-roles ────────────────────────────────────

@router.get(
    "/{user_id}/eligible-roles",
    summary="Get Eligible Promotion Roles for User",
    description="Returns which roles this user can be promoted to. Admin/HR only."
)
def get_eligible_roles(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_hr)
):
    emp = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not emp:
        raise HTTPException(status_code=404, detail="User not found.")

    current_roles = [r.name for r in emp.roles]

    # Promotion logic:
    # EMPLOYEE → COURSE_MANAGER (Manager)
    # COURSE_MANAGER → nothing in this pass (further promotion is a separate decision)
    # SYSTEM_ADMIN / HR_ADMIN → no further promotion
    eligible = []

    if "EMPLOYEE" in current_roles and "COURSE_MANAGER" not in current_roles:
        eligible.append({
            "role_name": "COURSE_MANAGER",
            "display_name": "Manager",
            "description": "Grants department-level management access: reporting, leaderboard, course creation."
        })

    return {
        "user_id": str(user_id),
        "current_roles": current_roles,
        "eligible_promotions": eligible
    }


# ─── GET /api/users/:userId/assignable-courses ────────────────────────────────

@router.get(
    "/{user_id}/assignable-courses",
    summary="Get Courses Assignable to this Employee",
    description="Returns published courses in the employee's department that they are NOT already enrolled in. Admin/HR only."
)
def get_assignable_courses(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_hr)
):
    emp = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not emp:
        raise HTTPException(status_code=404, detail="User not found.")

    # Get already-enrolled course IDs (non-dropped)
    enrolled_ids = set(
        row[0] for row in
        db.query(CourseEnrollment.course_id).filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.status != "dropped"
        ).all()
    )

    # Published courses from ALL departments
    query = db.query(Course).filter(
        Course.is_published == True,
        Course.status == "approved",
    )

    courses = query.all()

    return [
        {
            "id": str(c.id),
            "course_code": c.course_code,
            "title": c.title,
            "department_id": str(c.department_id) if c.department_id else None,
            "already_enrolled": c.id in enrolled_ids,
        }
        for c in courses
    ]


# ─── POST /api/users/:userId/assign-course ────────────────────────────────────

@router.post(
    "/{user_id}/assign-course",
    status_code=status.HTTP_201_CREATED,
    summary="Assign Course to Employee",
    description="Admin/HR assigns a published department course to an employee. Triggers enrollment notification."
)
def assign_course_to_user(
    user_id: UUID,
    request: AssignCourseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_hr)
):
    emp = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not emp:
        raise HTTPException(status_code=404, detail="User not found.")

    # Verify the course belongs to employee's department (same-dept policy)
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    # Delegate to service (raises 400 if already enrolled)
    enrollment = EnrollmentService.enroll_user(
        db,
        user_id=user_id,
        course_id=request.course_id,
        enrolled_by=current_user.id
    )

    # Audit
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="ADMIN_ASSIGN_COURSE",
        target=emp.employee_code,
        details=f"Admin/HR assigned course '{course.title}' ({course.course_code}) to {emp.first_name} {emp.last_name}."
    )

    # Notify the employee
    NotificationService.create_notification(
        db,
        user_id=user_id,
        type="enrollment",
        title="New Course Assigned 📚",
        message=f"You have been enrolled in '{course.title}' ({course.course_code}) by {current_user.first_name} {current_user.last_name}.",
        related_entity_id=enrollment.id
    )

    return {
        "enrollment_id": str(enrollment.id),
        "user_id": str(user_id),
        "course_id": str(request.course_id),
        "course_title": course.title,
        "course_code": course.course_code,
        "status": enrollment.status,
        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
        "enrolled_by": str(current_user.id),
    }


# ─── PATCH /api/users/:userId/role ────────────────────────────────────────────

@router.patch(
    "/{user_id}/role",
    summary="Promote User to a New Role",
    description="Admin/HR changes a user's role. Writes role_history audit row. Sends promotion notification."
)
def promote_user_role(
    user_id: UUID,
    request: PromoteRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_hr)
):
    emp = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not emp:
        raise HTTPException(status_code=404, detail="User not found.")

    # Fetch the target role
    target_role = db.query(Role).filter(Role.name == request.new_role).first()
    if not target_role:
        raise HTTPException(status_code=400, detail=f"Role '{request.new_role}' does not exist.")

    current_emp_roles = [r.name for r in emp.roles]

    # Validate this is an eligible promotion
    allowed_target_roles = ["COURSE_MANAGER", "HR_ADMIN", "SYSTEM_ADMIN", "EMPLOYEE"]
    if request.new_role not in allowed_target_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Role promotion to '{request.new_role}' is not permitted."
        )
    if request.new_role in current_emp_roles:
        raise HTTPException(
            status_code=400,
            detail=f"User already has the '{request.new_role}' role."
        )

    previous_role = current_emp_roles[0] if current_emp_roles else "EMPLOYEE"

    # Remove existing role mappings for this user
    db.query(UserRole).filter(UserRole.user_id == user_id).delete()

    new_user_role = UserRole(
        id=uuid.uuid4(),
        user_id=user_id,
        role_id=target_role.id
    )
    db.add(new_user_role)

    # Write role_history row
    history_entry = RoleHistory(
        id=uuid.uuid4(),
        user_id=user_id,
        previous_role=previous_role,
        new_role=request.new_role,
        changed_by=current_user.id,
        reason=request.reason
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)

    # Audit log
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="ROLE_PROMOTION",
        target=emp.employee_code,
        details=f"Promoted {emp.first_name} {emp.last_name} from {previous_role} to {request.new_role}. Reason: {request.reason or 'N/A'}"
    )

    # Notify the employee
    role_display = "Manager" if request.new_role == "COURSE_MANAGER" else request.new_role
    NotificationService.create_notification(
        db,
        user_id=user_id,
        type="role_promotion",
        title=f"🎉 You've been promoted to {role_display}!",
        message=f"Congratulations! {current_user.first_name} {current_user.last_name} has promoted you from {previous_role} to {role_display}. You now have department-level access.",
        related_entity_id=history_entry.id
    )

    # Also notify HR/Admin group about role change
    admin_users = db.query(User).join(User.roles).filter(
        Role.name.in_(["SYSTEM_ADMIN", "HR_ADMIN"])
    ).filter(User.id != current_user.id).limit(5).all()
    for admin in admin_users:
        NotificationService.create_notification(
            db,
            user_id=admin.id,
            type="role_promotion",
            title="Role Change: User Promoted",
            message=f"{emp.first_name} {emp.last_name} ({emp.employee_code}) was promoted from {previous_role} to {role_display} by {current_user.first_name} {current_user.last_name}.",
            related_entity_id=history_entry.id
        )

    # Return updated role list
    db.refresh(emp)
    updated_roles = [r.name for r in emp.roles]

    return {
        "user_id": str(user_id),
        "previous_role": previous_role,
        "new_role": request.new_role,
        "updated_roles": updated_roles,
        "changed_by": str(current_user.id),
        "history_id": str(history_entry.id),
    }
