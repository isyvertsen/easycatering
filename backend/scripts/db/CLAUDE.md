# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Database management scripts for the LKC (Larvik Kommune Catering) system. Used for backup/restore operations between environments.

## Scripts

### db-dump.sh
Dumps a PostgreSQL database to a compressed file.

```bash
# Usage (run from this directory)
./db-dump.sh [database_name]

# Example: dump production database
./db-dump.sh catering_db
```

- Reads `FROM_DATABASE_URL` from `.env`
- Creates timestamped dump in `dumps/` directory
- Output format: `{database}_{YYYYMMDD_HHMMSS}.dump`

### db-restore.sh
Restores a database dump to a target database.

```bash
# Usage
./db-restore.sh <dump_file> [target_database]

# Example: restore to test database (default)
./db-restore.sh dumps/catering_db_20260114_122721.dump

# Example: restore to specific database
./db-restore.sh dumps/catering_db_20260114_122721.dump catering_test
```

- Reads `TO_DATABASE_URL` from `.env`
- Default target: `catering_test`
- Prompts before dropping existing database
- Filters out `transaction_timeout` for PostgreSQL < 17 compatibility

## Configuration

Create `.env` in this directory:

```bash
FROM_DATABASE_URL=postgresql+asyncpg://user:pass@host:port/source_db
TO_DATABASE_URL=postgresql+asyncpg://user:pass@host:port/target_db
```

## Parent Project

See `/CLAUDE.md` and `/backend/CLAUDE.md` for full project documentation.
