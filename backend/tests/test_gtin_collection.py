"""Test script for streamlined GTIN collection from Matinfo."""
import asyncio
from datetime import datetime, timedelta
from app.infrastructure.database.session import get_db
from app.services.matinfo_gtin_tracker import MatinfoGTINTracker


async def test_gtin_collection():
    """Test collecting GTINs from Matinfo API."""
    db = next(get_db())

    try:
        async with MatinfoGTINTracker(db) as tracker:
            print("Testing Matinfo GTIN Collection")
            print("-" * 50)

            # Fetch updates from the last 30 days
            since_date = datetime.now() - timedelta(days=30)
            print(f"Fetching GTIN updates since {since_date.strftime('%Y-%m-%d')}...")

            results = await tracker.fetch_and_store_updated_gtins(since_date)
            print(f"\nResults:")
            print(f"  Total GTINs: {results['total']}")
            print(f"  New GTINs stored: {results['new']}")
            print(f"  Updated GTINs: {results['updated']}")

            # Get statistics
            stats = tracker.get_sync_statistics()
            print(f"\nDatabase Statistics:")
            print(f"  Total GTINs in DB: {stats['total_gtins']}")
            print(f"  Pending sync: {stats['pending']}")
            print(f"  Already synced: {stats['synced']}")
            print(f"  Failed: {stats['failed']}")

            # Get some pending GTINs
            pending = await tracker.get_pending_gtins(limit=10)
            if pending:
                print(f"\nSample of pending GTINs (first 10):")
                for gtin in pending:
                    print(f"  - {gtin}")

            # Get recent updates
            recent = tracker.get_recent_updates(limit=5)
            if recent:
                print(f"\nMost recent GTIN updates:")
                for record in recent:
                    print(f"  - {record['gtin']} (Status: {record['sync_status']})")

    finally:
        db.close()


if __name__ == "__main__":
    print("Starting streamlined GTIN collection test...")
    print("This will only collect GTIN codes, not product details.\n")
    asyncio.run(test_gtin_collection())
    print("\nTest completed!")