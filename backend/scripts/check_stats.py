"""Check GTIN sync statistics."""
import asyncio
from app.infrastructure.database.session import AsyncSessionLocal
from app.services.matinfo_gtin_tracker import MatinfoGTINTracker


async def check_stats():
    """Check current GTIN sync statistics."""
    async with AsyncSessionLocal() as db:
        async with MatinfoGTINTracker(db) as tracker:
            stats = await tracker.get_sync_statistics()
            print(f"Total GTINs: {stats['total_gtins']}")
            print(f"Pending: {stats['pending']}")
            print(f"Synced: {stats['synced']}")
            print(f"Failed: {stats['failed']}")
            print(f"Last sync: {stats['last_sync']}")
            print(f"Last sync status: {stats['last_sync_status']}")


if __name__ == "__main__":
    asyncio.run(check_stats())