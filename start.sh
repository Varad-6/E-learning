#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Waiting for postgres..."

python -c "
import time
import psycopg2
from app.core.config import settings

url = settings.DATABASE_URL
print(f'Checking connection to: {url}')
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

echo "Seeding database..."
python seed_db.py

echo "Starting backend server..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
