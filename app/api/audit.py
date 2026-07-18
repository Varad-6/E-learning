from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, RequireRoles
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/admin/audit-logs", tags=["Audit Logs"])

@router.get(
    "",
    response_model=List[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Database Audit Logs",
    description="Retrieve all corporate database audit logs. Restricted to System Admin."
)
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN"))
):
    return AuditService.get_logs(db, skip=skip, limit=limit)
