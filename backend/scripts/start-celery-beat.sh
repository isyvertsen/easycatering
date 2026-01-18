#!/bin/bash
# Start Celery Beat scheduler for periodic tasks
#
# Usage:
#   ./scripts/start-celery-beat.sh
#
# This script starts Celery Beat which triggers scheduled tasks (like checking
# for due workflows every minute).

set -e

cd "$(dirname "$0")/.."

echo "Starting Celery Beat scheduler..."
echo "Schedule: Check workflows every 60 seconds"
echo ""

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "WARNING: Redis is not running. Celery Beat requires Redis."
    echo "Start Redis with: redis-server"
    echo ""
fi

# Start Celery Beat
uv run celery -A app.celery_app beat \
    --loglevel=info
