#!/bin/bash
# Start Celery Beat scheduler for workflow automation
#
# Usage:
#   ./scripts/start-beat.sh

set -e

cd "$(dirname "$0")/.."

# Add backend to Python path
export PYTHONPATH="$(pwd)/../backend:$(pwd):$PYTHONPATH"

echo "Starting Celery Beat Scheduler..."
echo "Schedule: Check workflows every 60 seconds"
echo "Python path: $PYTHONPATH"
echo ""

# Check if Redis is running
if ! nc -z localhost 6379 2>/dev/null; then
    echo "WARNING: Cannot connect to Redis on localhost:6379"
    echo "Make sure Redis is running first"
    echo ""
    exit 1
fi

# Start Celery Beat
uv run celery -A app.celery_app beat \
    --loglevel=info
