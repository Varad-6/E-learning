from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_db, RequireRoles
from app.models.user import User
from app.schemas.admin import UserCreate, UserUpdate, UserListResponse, RoleAssignmentRequest, AdminUserResponse
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User",
    description="Create a new user profile with default configurations. Restricted to Admins."
)
def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    return AdminService.create_user(db, request=request)

@router.put(
    "/users/{user_id}",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User",
    description="Update user account information and statuses. Restricted to Admins."
)
def update_user(
    user_id: UUID,
    request: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    return AdminService.update_user(db, user_id=user_id, request=request)

@router.get(
    "/users",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Users",
    description="Retrieve a paginated list of non-deleted users. Restricted to Admins."
)
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    users = AdminService.list_users(db, skip=skip, limit=limit)
    total = db.query(User).filter(User.is_deleted == False).count()
    return UserListResponse(users=users, total=total)

@router.post(
    "/users/{user_id}/roles",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign User Roles",
    description="Assign user roles. Restricted to Admins."
)
def assign_role(
    user_id: UUID,
    request: RoleAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    if request.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID in path must match User ID in request body."
        )
    return AdminService.assign_role(db, request=request)
