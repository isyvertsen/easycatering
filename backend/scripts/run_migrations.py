#!/usr/bin/env python3
"""Manually run database migrations."""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.infrastructure.database.session import get_engine, dispose_engine
from app.core.migrations import run_migrations
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    """Run migrations manually."""
    engine = get_engine()
    try:
        logger.info("Starting manual migration run...")
        await run_migrations(engine)
        logger.info("Migrations completed successfully!")
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        sys.exit(1)
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())