import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actor = Column(String, nullable=False)  # e.g., "admin@company.com", "system_daemon"
    action = Column(String, nullable=False)  # e.g., "ROLE_UPDATE", "ASSIGN_COURSE", "DB_BACKUP"
    target = Column(String, nullable=False)  # e.g., "creator@company.com", "EMP-3041"
    details = Column(String, nullable=True)  # Detailed log description
