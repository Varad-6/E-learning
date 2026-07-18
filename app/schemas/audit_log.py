from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class AuditLogBase(BaseModel):
    actor: str
    action: str
    target: str
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogResponse(AuditLogBase):
    id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True
