#!/bin/sh
set -e

echo "Waiting for postgres..."

python -c "
import time
import psycopg2
from app.core.config import settings

# psycopg2.connect() needs plain postgresql:// not postgresql+psycopg2://
url = settings.DATABASE_URL
# Strip SQLAlchemy dialect prefix so psycopg2 can parse the DSN directly
if '+' in url.split('://')[0]:
    url = 'postgresql://' + url.split('://', 1)[1]

for i in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print('Postgres is ready!')
        break
    except psycopg2.OperationalError as e:
        print(f'Postgres is not ready yet ({e}). Waiting 2s...')
        time.sleep(2)
else:
    print('Error: Could not connect to Postgres')
    exit(1)
"

echo "Running database migrations..."
alembic upgrade head

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
    echo "Seeding database..."
    python seed_db.py
fi

WORKERS="${UVICORN_WORKERS:-2}"
echo "Starting backend server with ${WORKERS} worker(s)..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WORKERS}" --proxy-headers
