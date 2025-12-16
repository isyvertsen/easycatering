#!/usr/bin/env python
"""CLI script for syncing Matinfo products."""
import asyncio
import sys
import argparse
import logging
from app.infrastructure.database.session import AsyncSessionLocal
from app.services.matinfo_product_sync import MatinfoProductSync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_sync(limit: int = 100):
    """Run the product sync."""
    async with AsyncSessionLocal() as db:
        try:
            sync_service = MatinfoProductSync(db)
            logger.info(f"Starting sync for up to {limit} products...")

            result = await sync_service.sync_pending_products(limit=limit)
            await db.commit()

            # Close HTTP client
            if sync_service.client:
                await sync_service.client.aclose()

            logger.info(f"Sync completed successfully!")
            logger.info(f"  Total processed: {result['total']}")
            logger.info(f"  Successful: {result['success']}")
            logger.info(f"  Failed: {result['failed']}")
            logger.info(f"  Skipped: {result['skipped']}")

            return result

        except Exception as e:
            logger.error(f"Sync failed: {e}")
            await db.rollback()
            raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Sync Matinfo product details")
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of products to sync (default: 100)"
    )

    args = parser.parse_args()

    try:
        result = asyncio.run(run_sync(args.limit))
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()