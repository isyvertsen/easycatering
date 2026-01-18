# Workflow Automation Service Dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app/workflow

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy backend code (needed for imports)
COPY backend/ /app/backend/

# Copy workflow code
COPY workflow/ /app/workflow/

# Install dependencies
RUN cd /app/workflow && uv pip install --system -r pyproject.toml

# Set Python path to include backend
ENV PYTHONPATH=/app/backend:/app/workflow

# Default command is worker, but can be overridden
CMD ["celery", "-A", "app.celery_app", "worker", "--loglevel=info", "--concurrency=4", "--queues=workflows,emails,default"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD celery -A app.celery_app inspect ping || exit 1
