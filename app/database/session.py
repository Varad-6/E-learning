from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Backup DB initialization for audit logs
backup_engine = None
BackupSessionLocal = None

if settings.BACKUP_DATABASE_URL:
    backup_engine = create_engine(
        settings.BACKUP_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )
    BackupSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=backup_engine
    )

def get_backup_db():
    if not BackupSessionLocal:
        return None
    db = BackupSessionLocal()
    try:
        yield db
    finally:
        db.close()
