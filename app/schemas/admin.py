import re
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
from uuid import UUID
from app.schemas.user import UserResponse, RoleResponse
from app.schemas.department import DepartmentResponse

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

class UserCreate(BaseModel):
    employee_code: str = Field(..., description="Unique employee code of the user")
    first_name: str = Field(..., description="First name of the user")
    last_name: str = Field(..., description="Last name of the user")
    email: EmailStr = Field(..., description="Email address of the user")
    password: str = Field(..., description="Plaintext initial password for the user")
    department_id: Optional[UUID] = Field(None, description="ID of the department to assign the user to")
    roles: Optional[List[str]] = Field(default=["EMPLOYEE"], description="List of role names (e.g. SYSTEM_ADMIN, HR_ADMIN, COURSE_MANAGER, EMPLOYEE)")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if v and not EMAIL_REGEX.match(v):
            raise ValueError("Email format is invalid. Domains ending in numbers or invalid suffixes (like .1com) are not allowed.")
        return v

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, description="First name of the user")
    last_name: Optional[str] = Field(None, description="Last name of the user")
    email: Optional[EmailStr] = Field(None, description="Email address of the user")
    department_id: Optional[UUID] = Field(None, description="ID of the department to assign the user to")
    is_active: Optional[bool] = Field(None, description="Whether the user account is active")
    is_deleted: Optional[bool] = Field(None, description="Whether the user is marked as deleted")
    must_change_password: Optional[bool] = Field(None, description="Whether the user must change password on next login")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v and not EMAIL_REGEX.match(v):
            raise ValueError("Email format is invalid. Domains ending in numbers or invalid suffixes (like .1com) are not allowed.")
        return v


class AdminUserResponse(UserResponse):
    roles: List[RoleResponse] = []
    department: Optional[DepartmentResponse] = None

class UserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int

class RoleAssignmentRequest(BaseModel):
    user_id: UUID = Field(..., description="ID of the user to assign roles to")
    roles: List[str] = Field(..., description="List of role names to assign to the user")

