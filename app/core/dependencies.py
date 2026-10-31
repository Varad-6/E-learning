from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from typing import List, Generator, Any

from app.database.session import SessionLocal
from app.core.security import decode_token
from app.models.user import User

# HTTPBearer extracts the Authorization header and yields its credentials
security = HTTPBearer(auto_error=True)

def get_db() -> Generator[Session, None, None]:
    """Dependency to provide a thread-local database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve the current validated user using an access token."""
    try:
        payload = decode_token(token.credentials, is_refresh=False)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials: User ID missing in claims",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid access token: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists. Please log in again.",
        )
    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deleted",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user

def is_admin_user(user: User) -> bool:
    """Check if the user holds an administrative role (SYSTEM_ADMIN, ADMIN, HR_ADMIN)."""
    roles = [r.name for r in user.roles]
    return any(r in roles for r in ["ADMIN", "SYSTEM_ADMIN", "HR_ADMIN"])

def can_user_delete_course(course: Any, user: User) -> bool:
    """
    Strict Course Deletion Rule:
    A course can be deleted ONLY by:
      a) a user with the Admin role, or
      b) the user who created that course (course.created_by == current user id).
    Everyone else (other creators, managers, employees) must NOT be able to delete.
    For legacy courses where created_by is None, only Admin can delete.
    """
    if is_admin_user(user):
        return True
    if getattr(course, "created_by", None) is not None:
        return str(course.created_by) == str(user.id)
    return False

def can_user_edit_course(course: Any, user: User) -> bool:
    """
    Strict Course Edit Rule:
    A course can be edited ONLY by:
      a) a user with the Admin role, or
      b) the user who created that course (course.created_by == current user id).
    For legacy courses where created_by is None, only Admin can edit.
    """
    if is_admin_user(user):
        return True
    if getattr(course, "created_by", None) is not None:
        return str(course.created_by) == str(user.id)
    return False

class RequireRoles:
    """Dependency wrapper to enforce role-based access control (RBAC)."""
    def __init__(self, *allowed_roles: str):
        self.allowed_roles = list(allowed_roles)

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_roles = [r.name for r in current_user.roles]
        if any(r in user_roles for r in ["ADMIN", "SYSTEM_ADMIN", "HR_ADMIN"]):
            return current_user
        # HR department managers pass endpoints permitting Admin/HR
        if ("ADMIN" in self.allowed_roles or "SYSTEM_ADMIN" in self.allowed_roles or "HR_ADMIN" in self.allowed_roles) and current_user.department and current_user.department.code in ["HR", "HR_ADMIN"] and "COURSE_MANAGER" in user_roles:
            return current_user
        if not any(role in user_roles for role in self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Requires roles {self.allowed_roles}",
            )
        return current_user
