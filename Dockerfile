FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Install dependencies first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY seed_db.py .
COPY start.sh .

# Ensure entrypoint script is executable
RUN chmod +x start.sh

# Expose backend port
EXPOSE 8085

# Set entrypoint
ENTRYPOINT ["./start.sh"]
