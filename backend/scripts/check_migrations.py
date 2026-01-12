#!/usr/bin/env python3
"""Check status of database migrations."""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.infrastructure.database.session import engine
from app.core.migrations import get_migration_runner
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    """Check migration status."""
    try:
        runner = get_migration_runner(engine)
        
        # Initialize migration table if needed
        await runner.init_migration_table()
        
        # Get applied migrations
        applied = await runner.get_applied_migrations()
        
        # Get all migrations
        all_migrations = [(m.version, m.description) for m in runner.migrations]
        
        print("\n=== Migration Status ===\n")
        print(f"Total migrations: {len(all_migrations)}")
        print(f"Applied migrations: {len(applied)}")
        print(f"Pending migrations: {len(all_migrations) - len(applied)}")
        print("\n=== Migration List ===\n")
        
        for version, description in sorted(all_migrations):
            status = "✓ Applied" if version in applied else "⏳ Pending"
            print(f"{status} | {version} | {description}")
        
        # Check if products table has new columns
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'products' 
                AND column_name IN ('productdescription', 'countryoforigin', 'fpakk')
            """))
            columns = [row[0] for row in result]
            
            print("\n=== Products Table Status ===\n")
            vendor_columns = ['productdescription', 'countryoforigin', 'countryofpreparation', 
                            'fpakk', 'dpakk', 'pall', 'created', 'updated']
            for col in vendor_columns:
                exists = "✓" if col in columns else "✗"
                print(f"{exists} Column '{col}'")
        
    except Exception as e:
        logger.error(f"Failed to check migrations: {str(e)}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())