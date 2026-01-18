# Backend Scripts

This folder contains utility scripts for the backend.

## Template Migration

### migrate_templates.py

Migrates existing templates from `tbl_rpproduksjon` to `tbl_produksjonstemplate`.

**Background:**
In the old system, templates were stored as regular production orders with a special customer ID (e.g., kundeid = 0). This caused problems:
- Hard to distinguish templates from actual production orders
- Required logic to avoid transferring templates to orders
- Required logic to avoid calculating templates
- Poor data integrity

**Solution:**
This script moves templates to dedicated `tbl_produksjonstemplate` tables for better separation of concerns.

#### Usage

**1. Dry run (recommended first):**
```bash
uv run python scripts/migrate_templates.py --template-kundeid 0 --dry-run
```

This will show what would be migrated without making any changes.

**2. Execute migration (keep old records):**
```bash
uv run python scripts/migrate_templates.py --template-kundeid 0 --execute
```

This will migrate templates but keep the old records in `tbl_rpproduksjon` for safety.

**3. Execute migration (delete old records):**
```bash
uv run python scripts/migrate_templates.py --template-kundeid 0 --execute --delete-old
```

This will migrate templates AND delete the old records after successful migration.

#### Arguments

- `--template-kundeid`: Customer ID used for templates (required)
  - Example: `0` for templates with kundeid = 0
  - Example: `999` if you have a dummy customer with ID 999

- `--dry-run`: Show what would happen without making changes (default)

- `--execute`: Actually perform the migration

- `--delete-old`: Delete old template records after successful migration

#### What it does

1. Finds all records in `tbl_rpproduksjon` with the specified `kundeid`
2. For each template:
   - Creates a new record in `tbl_produksjonstemplate`
   - Copies all details to `tbl_produksjonstemplate_detaljer`
   - Optionally deletes the old records
3. Shows a summary of the migration

#### Example output

```
============================================================
TEMPLATE MIGRATION SCRIPT
============================================================
Template kunde-ID: 0
Mode: EXECUTE (will make changes)
Delete old: False
============================================================

Found 5 templates to migrate

Processing template 7879...
  Name: Produksjonsplan uke 45
  ✓ Created template 1
  Found 12 detail lines
  ✓ Copied 12 detail lines

Processing template 7880...
  Name: Produksjonsplan uke 46
  ✓ Created template 2
  Found 15 detail lines
  ✓ Copied 15 detail lines

✓ Migration completed and committed

============================================================
MIGRATION SUMMARY
============================================================
Total templates found: 5
Successfully migrated: 5
Errors: 0
============================================================

✓ Migration completed successfully
```

#### Safety

- Always run with `--dry-run` first to see what will happen
- The script will rollback on any errors
- Original records are kept unless `--delete-old` is specified
- All changes are committed in a single transaction
