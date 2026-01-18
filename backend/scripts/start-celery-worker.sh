#!/bin/bash
# Start Celery worker for processing background tasks
#
# Usage:
#   ./scripts/start-celery-worker.sh
#
# This script starts a Celery worker that processes tasks from the workflows,
# emails, and default queues.

set -e

cd "$(dirname "$0")/.."

echo "Starting Celery worker..."
echo "Queues: workflows, emails, default"
echo "Concurrency: 4 workers"
echo ""

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "WARNING: Redis is not running. Celery worker requires Redis."
    echo "Start Redis with: redis-server"
    echo ""
fi

# Start Celery worker
uv run celery -A app.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=workflows,emails,default \
    --hostname=worker@%h
