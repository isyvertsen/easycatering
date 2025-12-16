#!/bin/bash

# Script to run backend server with test database for E2E testing

echo "============================================================"
echo "STARTING TEST SERVER"
echo "============================================================"

# Load test environment variables
export $(cat .env.test | xargs)

# Run server on port 8000 with test database
echo "Starting server on port 8000 with test database..."
uv run uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
