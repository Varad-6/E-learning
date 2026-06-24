from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from uuid import UUID
from app.schemas.user import UserResponse

class UserCreate(BaseModel):
    employee_code: str = Field(..., description="Unique employee code of the user")
    first_name: str = Field(..., description="First name of the user")
    last_name: str = Field(..., description="Last name of the user")
    email: EmailStr = Field(..., description="Email address of the user")
    password: str = Field(..., description="Plaintext initial password for the user")
    department_id: Optional[UUID] = Field(None, description="ID of the department to assign the user to")
    roles: Optional[List[str]] = Field(default=["EMPLOYEE"], description="List of role names (e.g. ADMIN, MANAGER, EMPLOYEE)")

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, description="First name of the user")
    last_name: Optional[str] = Field(None, description="Last name of the user")
    email: Optional[EmailStr] = Field(None, description="Email address of the user")
    department_id: Optional[UUID] = Field(None, description="ID of the department to assign the user to")
    is_active: Optional[bool] = Field(None, description="Whether the user account is active")
    is_deleted: Optional[bool] = Field(None, description="Whether the user is marked as deleted")
    must_change_password: Optional[bool] = Field(None, description="Whether the user must change password on next login")

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

class RoleAssignmentRequest(BaseModel):
    user_id: UUID = Field(..., description="ID of the user to assign roles to")
    roles: List[str] = Field(..., description="List of role names to assign to the user")
