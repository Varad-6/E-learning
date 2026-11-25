FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY seed_db.py .
COPY start.sh .

RUN chmod +x start.sh \
    && mkdir -p /workspace/uploads/courses /workspace/uploads/media /workspace/uploads/exam_submissions \
    && useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /workspace

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["./start.sh"]
