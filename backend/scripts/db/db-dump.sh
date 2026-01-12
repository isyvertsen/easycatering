#!/bin/bash
# Database dump script for LKC Backend
# Usage: ./scripts/db-dump.sh [database_name]

set -e

# Load environment variables from .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"

if [ -f "$ENV_FILE" ]; then
    # Extract database connection info from DATABASE_URL
    DATABASE_URL=$(grep "^DATABASE_URL_PROD=" "$ENV_FILE" | cut -d'=' -f2-)

    # Parse the URL: postgresql+asyncpg://user:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
    DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
    DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
else
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Override database name if provided as argument
if [ -n "$1" ]; then
    DB_NAME="$1"
fi

# Create dumps directory if it doesn't exist
DUMPS_DIR="$SCRIPT_DIR/dumps"
mkdir -p "$DUMPS_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="$DUMPS_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo "Dumping database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Output: $DUMP_FILE"
echo ""

# Run pg_dump
PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$DUMP_FILE"

# Show result
FILESIZE=$(ls -lh "$DUMP_FILE" | awk '{print $5}')
echo ""
echo "Dump completed successfully!"
echo "File: $DUMP_FILE"
echo "Size: $FILESIZE"
