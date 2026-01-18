#!/bin/bash
# Start Flower monitoring dashboard for Celery
#
# Usage:
#   ./scripts/start-flower.sh
#
# Access at: http://localhost:5555
# Default credentials: admin/admin

set -e

cd "$(dirname "$0")/.."

# Add backend to Python path
export PYTHONPATH="$(pwd)/../backend:$(pwd):$PYTHONPATH"

echo "Starting Flower Monitoring Dashboard..."
echo "Dashboard: http://localhost:5555"
echo "Username: admin"
echo "Password: admin"
echo "Python path: $PYTHONPATH"
echo ""

# Check if Redis is running
if ! nc -z localhost 6379 2>/dev/null; then
    echo "WARNING: Cannot connect to Redis on localhost:6379"
    echo "Make sure Redis is running first"
    echo ""
fi

# Start Flower
uv run celery -A app.celery_app flower \
    --port=5555 \
    --basic_auth=admin:admin
