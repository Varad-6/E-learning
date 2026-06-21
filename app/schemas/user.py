from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class RoleResponse(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    department_id: Optional[UUID] = None
    is_active: bool
    is_deleted: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
