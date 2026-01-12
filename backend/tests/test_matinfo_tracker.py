"""Test script for Matinfo GTIN tracker."""
import asyncio
from datetime import datetime, timedelta
from app.infrastructure.database.session import get_db
from app.services.matinfo_gtin_tracker import MatinfoGTINTracker


async def test_tracker():
    """Test the GTIN tracker functionality."""
    db = next(get_db())

    try:
        async with MatinfoGTINTracker(db) as tracker:
            print("Testing Matinfo GTIN Tracker")
            print("-" * 50)

            # Fetch updates from the last 30 days
            since_date = datetime.now() - timedelta(days=30)
            print(f"Fetching GTIN updates since {since_date.strftime('%Y-%m-%d')}...")

            results = await tracker.fetch_and_store_updated_gtins(since_date)
            print(f"Results: {results}")

            # Get statistics
            stats = tracker.get_sync_statistics()
            print(f"\nSync Statistics:")
            print(f"  Total GTINs: {stats['total_gtins']}")
            print(f"  Pending: {stats['pending']}")
            print(f"  Synced: {stats['synced']}")
            print(f"  Failed: {stats['failed']}")

            # Get some pending GTINs
            pending = await tracker.get_pending_gtins(limit=5)
            if pending:
                print(f"\nFirst 5 pending GTINs:")
                for gtin in pending:
                    print(f"  - {gtin}")

                # Try to enrich with product names
                print("\nEnriching GTIN records with product names...")
                await tracker.enrich_gtin_records(limit=3)

                # Get recent updates
                recent = tracker.get_recent_updates(limit=5)
                print(f"\nRecent updates:")
                for record in recent:
                    print(f"  - {record['gtin']}: {record['product_name'] or 'No name yet'} (Status: {record['sync_status']})")

    finally:
        db.close()


if __name__ == "__main__":
    print("Starting Matinfo GTIN Tracker test...")
    asyncio.run(test_tracker())
    print("\nTest completed!")