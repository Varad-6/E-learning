from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_db, RequireRoles
from app.models.user import User
from app.schemas.admin import UserCreate, UserUpdate, UserListResponse, RoleAssignmentRequest, AdminUserResponse
from app.services.admin_service import AdminService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User",
    description="Create a new user profile with default configurations. Restricted to System Admin and HR Admin."
)
def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN"))
):
    import uuid
    from app.models.role_history import RoleHistory

    # Server-side role authorization check
    caller_roles = [r.name for r in current_user.roles]
    requested_roles = [r.upper() for r in (request.roles or ["EMPLOYEE"])]
    
    # If caller is not SYSTEM_ADMIN/HR_ADMIN, deny non-employee role assignment
    if "SYSTEM_ADMIN" not in caller_roles and "HR_ADMIN" not in caller_roles:
        if any(r in ["SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"] for r in requested_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only System Admins and HR Admins can assign Manager or Admin roles."
            )

    user = AdminService.create_user(db, request=request)
    
    # Record initial role history entry
    primary_role = requested_roles[0] if requested_roles else "EMPLOYEE"
    history = RoleHistory(
        id=uuid.uuid4(),
        user_id=user.id,
        previous_role="NONE",
        new_role=primary_role,
        changed_by=current_user.id,
        reason="Initial account provisioning"
    )
    db.add(history)
    db.commit()

    AuditService.log_model_event(user, event_type="CREATE", performed_by=current_user.id)

    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="USER_CREATE",
        target=user.employee_code,
        details=f"Created user {user.first_name} {user.last_name} ({user.email}) with role '{primary_role}' in department {user.department_id or 'none'}"
    )
    
    # Trigger provisioning notification for the new user
    NotificationService.create_notification(
        db,
        user_id=user.id,
        type="provisioning",
        title="Welcome to Kaizen LMS! 👋",
        message="Your corporate e-learning profile has been successfully provisioned.",
        related_entity_type="user",
        related_entity_id=user.id
    )

    # Trigger notification for Department Manager & HR (only if user has a department)
    if user.department_id:
        NotificationService.notify_department_managers_and_hr(
            db=db,
            department_id=user.department_id,
            type="user_created",
            title="New Team Member Joined",
            message=f"New user provisioned: {user.first_name} {user.last_name} ({user.employee_code}).",
            related_entity_type="user",
            related_entity_id=user.id
        )

    # Trigger notification for System Admins
    NotificationService.notify_system_admins(
        db=db,
        type="user_created",
        title="New User Created",
        message=f"System-wide user creation: {user.first_name} {user.last_name} ({user.email}).",
        related_entity_type="user",
        related_entity_id=user.id
    )
    return user

@router.put(
    "/users/{user_id}",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User",
    description="Update user account information and statuses. Restricted to System Admin and HR Admin."
)
def update_user(
    user_id: UUID,
    request: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN"))
):
    user_roles = [r.name for r in current_user.roles]
    is_akanksha = (
        current_user.email == "akanksha.k@abhiyantatech.com" or 
        current_user.employee_code == "AIS226" or 
        "SYSTEM_ADMIN" in user_roles
    )
    if not is_akanksha:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only Akanksha Kumbhar has permission to edit employee info and designation."
        )

    user = AdminService.update_user(db, user_id=user_id, request=request)
    details_list = []
    if request.is_active is not None:
        details_list.append(f"is_active={request.is_active}")
    if request.is_deleted is not None:
        details_list.append(f"is_deleted={request.is_deleted}")
    details = f"Updated user properties: {', '.join(details_list)}" if details_list else "Updated user profile"

    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="USER_UPDATE",
        target=user.employee_code,
        details=details
    )
    AuditService.log_model_event(user, event_type="UPDATE", performed_by=current_user.id)
    return user

@router.get(
    "/users",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Users",
    description="Retrieve a paginated list of non-deleted users. Restricted to System Admin and HR Admin."
)
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN"))
):
    users = AdminService.list_users(db, skip=skip, limit=limit)
    total = db.query(User).filter(User.is_deleted == False).count()
    return UserListResponse(users=users, total=total)

@router.post(
    "/users/{user_id}/roles",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign User Roles",
    description="Assign user roles. Restricted to System Admin."
)
def assign_role(
    user_id: UUID,
    request: RoleAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN"))
):
    if request.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID in path must match User ID in request body."
        )
    user = AdminService.assign_role(db, request=request)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="ROLE_UPDATE",
        target=user.email,
        details=f"Assigned roles: {', '.join(request.roles)}"
    )
    AuditService.log_model_event(user, event_type="UPDATE", performed_by=current_user.id)
    
    # 🟢 Trigger account roles update notification
    NotificationService.create_notification(
        db,
        user_id=user.id,
        type="role_update",
        title="Account Privileges Updated 🔐",
        message=f"Your account roles have been updated to: {', '.join(request.roles)}",
        related_entity_id=user.id
    )
    return user

@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete User",
    description="Soft-delete a user profile by setting is_deleted=True and is_active=False. Restricted to System Admin and HR Admin."
)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )
    
    # Store fields before deletion to avoid DetachedInstanceError
    user_email = user.email
    user_code = user.employee_code
    user_name = f"{user.first_name} {user.last_name}"

    # Eager load relationships before deleting
    for rel_name in ["roles", "enrollments", "quiz_attempts", "badges", "notifications", "department"]:
        if hasattr(user, rel_name):
            rel_val = getattr(user, rel_name)
            if rel_name == "enrollments" and rel_val:
                for enroll in rel_val:
                    _ = enroll.progress_records

    # Write deletion event to Backup DB
    AuditService.log_model_event(user, event_type="DELETE", performed_by=current_user.id)

    # Hard delete from Live DB
    db.delete(user)
    db.commit()

    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="USER_DELETE",
        target=user_code,
        details=f"Hard-deleted user {user_name} ({user_email})"
    )
    return {"message": f"User {user_email} successfully deleted.", "user_id": str(user_id)}

@router.post(
    "/generate-employee-emails",
    status_code=status.HTTP_200_OK,
    summary="Generate Corporate Email IDs For Employees",
    description="Automatically provision and standardize corporate email IDs for all employees."
)
def generate_employee_emails(
    domain: str = "kaizen.com",
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN"))
):
    updated = AdminService.generate_employee_emails(db, domain=domain)
    AuditService.create_entry(
        db=db,
        actor=current_user.email,
        action="BULK_GENERATE_EMAILS",
        target=domain,
        details=f"Generated corporate emails for {len(updated)} employees under @{domain}"
    )
    return {
        "message": f"Successfully generated corporate emails for {len(updated)} employees.",
        "updated_count": len(updated),
        "updated_users": updated
    }
