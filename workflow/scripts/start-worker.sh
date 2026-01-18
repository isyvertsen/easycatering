#!/bin/bash
# Start Celery worker for workflow automation
#
# Usage:
#   ./scripts/start-worker.sh

set -e

cd "$(dirname "$0")/.."

# Add backend to Python path
export PYTHONPATH="$(pwd)/../backend:$(pwd):$PYTHONPATH"

echo "Starting Celery Worker for Workflow Automation..."
echo "Queues: workflows, emails, default"
echo "Concurrency: 4 workers"
echo "Python path: $PYTHONPATH"
echo ""

# Check if Redis is running
if ! nc -z localhost 6379 2>/dev/null; then
    echo "WARNING: Cannot connect to Redis on localhost:6379"
    echo "Make sure Redis is running:"
    echo "  - Docker: docker-compose up -d redis"
    echo "  - Local: redis-server"
    echo ""
fi

# Start Celery worker
uv run celery -A app.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=workflows,emails,default \
    --hostname=worker@%h
