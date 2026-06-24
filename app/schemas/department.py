from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class DepartmentCreate(BaseModel):
    name: str = Field(..., description="Name of the department")
    code: str = Field(..., description="Unique department code")
    description: Optional[str] = Field(None, description="Detailed description of the department")

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the department")
    code: Optional[str] = Field(None, description="Unique department code")
    description: Optional[str] = Field(None, description="Detailed description of the department")

class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
