#!/bin/bash
# Start Flower monitoring dashboard for Celery
#
# Usage:
#   ./scripts/start-flower.sh
#
# This script starts Flower, a web-based monitoring tool for Celery.
# Access the dashboard at: http://localhost:5555

set -e

cd "$(dirname "$0")/.."

echo "Starting Flower monitoring dashboard..."
echo "Dashboard will be available at: http://localhost:5555"
echo ""

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "WARNING: Redis is not running. Flower requires Redis."
    echo "Start Redis with: redis-server"
    echo ""
fi

# Start Flower
uv run celery -A app.celery_app flower \
    --port=5555 \
    --basic_auth=admin:admin
