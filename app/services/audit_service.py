from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogCreate

class AuditService:
    @staticmethod
    def create_entry(
        db: Session, 
        actor: str, 
        action: str, 
        target: str, 
        details: Optional[str] = None
    ) -> AuditLog:
        """Create a new database audit log entry."""
        db_log = AuditLog(
            actor=actor,
            action=action,
            target=target,
            details=details
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def get_logs(db: Session, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        """Retrieve a list of audit logs ordered by timestamp descending (newest first)."""
        return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
