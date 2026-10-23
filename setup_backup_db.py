import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse
import sys
import os

# Try to load local .env variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

backup_url = os.getenv("BACKUP_DATABASE_URL")
if not backup_url:
    print("Error: BACKUP_DATABASE_URL environment variable is not set in your .env configuration.")
    sys.exit(1)

parsed = urlparse(backup_url)
username = parsed.username
password = parsed.password
host = parsed.hostname
port = parsed.port or 5432
dbname = parsed.path.lstrip('/')

# 1. Connect to default postgres DB to check and create the backup database
try:
    print(f"Connecting to PostgreSQL server at {host}:{port} to check/create database '{dbname}'...")
    conn = psycopg2.connect(
        dbname="postgres",
        user=username,
        password=password,
        host=host,
        port=port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname='{dbname}'")
    exists = cursor.fetchone()
    if not exists:
        print(f"Database '{dbname}' does not exist. Creating database...")
        cursor.execute(f"CREATE DATABASE {dbname}")
        print(f"Database '{dbname}' created successfully.")
    else:
        print(f"Database '{dbname}' already exists.")
        
    cursor.close()
    conn.close()

except Exception as e:
    print(f"Information/Warning: Database check/creation skipped: {e}")

# 2. Connect directly to the backup DB to establish table structure
try:
    print(f"Connecting to database '{dbname}' to build the 'audit_log' table...")
    conn = psycopg2.connect(
        dbname=dbname,
        user=username,
        password=password,
        host=host,
        port=port
    )
    cursor = conn.cursor()
    
    # Try gen_random_uuid() (standard in Pg13+), fallback if needed
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS audit_log (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type      VARCHAR(20) NOT NULL,
        entity_type     VARCHAR(50) NOT NULL,
        entity_id       UUID NOT NULL,
        entity_email    VARCHAR(255),
        entity_code     VARCHAR(100),
        entity_name     VARCHAR(255),
        snapshot        JSONB NOT NULL,
        performed_by    UUID,
        performed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address      VARCHAR(45),
        notes           TEXT
    );
    """
    cursor.execute(create_table_sql)
    
    # Apply indexing
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_email ON audit_log(entity_email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_code ON audit_log(entity_code);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_name ON audit_log(entity_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(performed_at);")
    
    conn.commit()
    print("[SUCCESS] Table 'audit_log' and search indexes successfully initialized in Backup DB!")
    cursor.close()
    conn.close()

except Exception as e:
    print(f"[ERROR] Error setting up database table structure: {e}")
    sys.exit(1)
