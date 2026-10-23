from sqlalchemy.orm import Session
from typing import List, Optional
import json
import datetime
from uuid import UUID
from sqlalchemy import inspect
import logging
from app.models.audit_log import AuditLog
from app.database.session import BackupSessionLocal

logger = logging.getLogger("kaizen.audit")

class AuditService:
    @staticmethod
    def create_entry(
        db: Session, 
        actor: str, 
        action: str, 
        target: str, 
        details: Optional[str] = None
    ) -> AuditLog:
        """Create a new database audit log entry in the Live DB."""
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
        """Retrieve a list of audit logs from the Live DB ordered by timestamp descending."""
        return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def to_dict(model_instance, visited=None) -> Optional[dict]:
        """Convert a SQLAlchemy model instance to a JSON-serializable dictionary.
        Handles attributes, columns, relationships, UUIDs, dates, datetimes."""
        if not model_instance:
            return None
        if visited is None:
            visited = set()
            
        model_id = (type(model_instance), id(model_instance))
        if model_id in visited:
            return None
        visited.add(model_id)

        result = {}
        try:
            ins = inspect(model_instance)
            for c in ins.mapper.column_attrs:
                value = getattr(model_instance, c.key)
                if isinstance(value, (datetime.datetime, datetime.date)):
                    result[c.key] = value.isoformat()
                elif isinstance(value, UUID):
                    result[c.key] = str(value)
                else:
                    result[c.key] = value

            for r in ins.mapper.relationships:
                try:
                    # Accessing attributes safely; using loaded attributes only is not strictly
                    # required if we are pre-fetching / loading within the active session.
                    value = getattr(model_instance, r.key)
                    if value is None:
                        result[r.key] = None
                    elif isinstance(value, list):
                        result[r.key] = [AuditService.to_dict(item, visited) for item in value if item is not None]
                    else:
                        result[r.key] = AuditService.to_dict(value, visited)
                except Exception as rel_err:
                    logger.debug(f"Could not serialize relationship {r.key}: {rel_err}")
        except Exception as e:
            logger.error(f"Error serializing model to dict: {e}")
            result = {"serialization_error": str(e)}
            
        return result

    @staticmethod
    def log_event(
        event_type: str, 
        entity_type: str, 
        entity_id: UUID, 
        snapshot_model, 
        entity_email: Optional[str] = None, 
        entity_code: Optional[str] = None, 
        entity_name: Optional[str] = None, 
        performed_by: Optional[UUID] = None, 
        ip_address: Optional[str] = None, 
        notes: Optional[str] = None
    ) -> None:
        """Log an event and JSON snapshot to the Backup DB."""
        if not BackupSessionLocal:
            logger.warning("Backup DB Session Factory is not configured. Audit log skipped.")
            return

        try:
            # Check if it's already a dictionary, otherwise convert it
            if isinstance(snapshot_model, dict):
                snapshot_data = snapshot_model
            else:
                snapshot_data = AuditService.to_dict(snapshot_model) if snapshot_model else {}
        except Exception as e:
            logger.error(f"Failed to serialize snapshot model: {e}")
            snapshot_data = {"error": f"Serialization failure: {str(e)}"}

        try:
            db = BackupSessionLocal()
            try:
                from sqlalchemy import text
                sql = text("""
                    INSERT INTO audit_log (
                        event_type, entity_type, entity_id, entity_email, entity_code, entity_name, 
                        snapshot, performed_by, ip_address, notes
                    ) VALUES (
                        :event_type, :entity_type, :entity_id, :entity_email, :entity_code, :entity_name, 
                        :snapshot, :performed_by, :ip_address, :notes
                    );
                """)
                
                db.execute(sql, {
                    "event_type": event_type,
                    "entity_type": entity_type,
                    "entity_id": str(entity_id) if entity_id else None,
                    "entity_email": entity_email,
                    "entity_code": entity_code,
                    "entity_name": entity_name,
                    "snapshot": json.dumps(snapshot_data),
                    "performed_by": str(performed_by) if performed_by else None,
                    "ip_address": ip_address,
                    "notes": notes
                })
                db.commit()
            except Exception as e:
                logger.error(f"❌ Failed to commit audit log entry to Backup DB: {e}")
                db.rollback()
            finally:
                db.close()
        except Exception as conn_err:
            logger.error(f"❌ Failed to connect or create Backup DB session: {conn_err}")

    @staticmethod
    def log_model_event(
        db_record,
        event_type: str,
        performed_by: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        notes: Optional[str] = None
    ) -> None:
        """Helper to extract details from a SQLAlchemy model record and call log_event."""
        if not db_record:
            return

        model_name = db_record.__class__.__name__.lower()
        # map to user-friendly entity type names
        entity_map = {
            'user': 'user',
            'course': 'course',
            'courseenrollment': 'enrollment',
            'course_enrollment': 'enrollment',
            'coursemodule': 'module',
            'course_module': 'module',
            'department': 'department'
        }
        entity_type = entity_map.get(model_name, model_name)
        
        entity_id = getattr(db_record, 'id', None)
        entity_email = getattr(db_record, 'email', None)
        entity_code = getattr(db_record, 'employee_code', None) or getattr(db_record, 'course_code', None) or getattr(db_record, 'code', None)
        
        entity_name = None
        if hasattr(db_record, 'first_name') or hasattr(db_record, 'last_name'):
            first = getattr(db_record, 'first_name', '') or ''
            last = getattr(db_record, 'last_name', '') or ''
            entity_name = f"{first} {last}".strip() or None
        if not entity_name:
            entity_name = getattr(db_record, 'title', None) or getattr(db_record, 'name', None)

        # Call the existing log_event with the extracted fields and snapshot
        AuditService.log_event(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            snapshot_model=db_record,
            entity_email=entity_email,
            entity_code=entity_code,
            entity_name=entity_name,
            performed_by=performed_by,
            ip_address=ip_address,
            notes=notes
        )
