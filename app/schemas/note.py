from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserModuleNoteCreate(BaseModel):
    content: str = Field(..., description="Text content of the study/module note")

class UserModuleNoteUpdate(BaseModel):
    content: str = Field(..., description="Updated text content of the study/module note")

class UserModuleNoteResponse(BaseModel):
    id: UUID
    user_id: UUID
    module_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
