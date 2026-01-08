#!/bin/bash
# Database restore script for LKC Backend
# Usage: ./scripts/db-restore.sh <dump_file> [target_database]

set -e

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <dump_file> [target_database]"
    echo ""
    echo "Arguments:"
    echo "  dump_file        Path to the .dump file to restore"
    echo "  target_database  Optional: Database name to restore to (default: catering_test)"
    echo ""
    echo "Examples:"
    echo "  $0 dumps/catering_db_full_20260108.dump"
    echo "  $0 dumps/catering_db_full_20260108.dump catering_test"
    echo ""
    echo "Available dumps:"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    ls -lh "$SCRIPT_DIR/../dumps/"*.dump 2>/dev/null || echo "  No dumps found in dumps/ directory"
    exit 1
fi

DUMP_FILE="$1"
TARGET_DB="${2:-catering_test}"

# Verify dump file exists
if [ ! -f "$DUMP_FILE" ]; then
    echo "Error: Dump file not found: $DUMP_FILE"
    exit 1
fi

# Load environment variables from .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"

if [ -f "$ENV_FILE" ]; then
    # Extract database connection info from DATABASE_URL
    DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)

    # Parse the URL: postgresql+asyncpg://user:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
    DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
else
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

echo "Restore Configuration:"
echo "  Dump file: $DUMP_FILE"
echo "  Target database: $TARGET_DB"
echo "  Host: $DB_HOST:$DB_PORT"
echo ""

# Check if database exists
DB_EXISTS=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$TARGET_DB'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" != "1" ]; then
    echo "Database '$TARGET_DB' does not exist. Creating..."
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $TARGET_DB;"
    echo "Database created."
else
    echo "Warning: Database '$TARGET_DB' already exists."
    read -p "Drop and recreate? (y/N): " CONFIRM
    if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
        echo "Dropping database..."
        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE $TARGET_DB;"
        echo "Recreating database..."
        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $TARGET_DB;"
    else
        echo "Aborting restore."
        exit 1
    fi
fi

echo ""
echo "Restoring data..."

# Run pg_restore
# Note: Using pipe through sed to filter out transaction_timeout which is not supported
# on older PostgreSQL versions (parameter was added in PostgreSQL 17)
PGPASSWORD="$DB_PASS" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$TARGET_DB" \
    -f - \
    "$DUMP_FILE" 2>/dev/null | \
    sed '/SET transaction_timeout/d' | \
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -q 2>&1 || true

echo ""
echo "Restore completed!"
echo ""

# Show table count
TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables in $TARGET_DB: $TABLE_COUNT"
