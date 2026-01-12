"""Test script to verify GTIN update behavior (no duplicates)."""
import asyncio
from datetime import datetime, timedelta
from app.infrastructure.database.session import AsyncSessionLocal
from app.services.matinfo_gtin_tracker import MatinfoGTINTracker
from sqlalchemy import select, func
from app.models.matinfo_updates import MatinfoGTINUpdate


async def test_gtin_updates():
    """Test that GTINs are updated, not duplicated."""
    async with AsyncSessionLocal() as db:
        try:
            async with MatinfoGTINTracker(db) as tracker:
                print("Testing GTIN Update Behavior")
                print("-" * 50)

                # Get initial count
                count_stmt = select(func.count()).select_from(MatinfoGTINUpdate)
                initial_result = await db.execute(count_stmt)
                initial_count = initial_result.scalar() or 0
                print(f"Initial GTIN count: {initial_count}")

                # Fetch updates from the last 7 days (this should update existing ones)
                since_date = datetime.now() - timedelta(days=7)
                print(f"\n1st fetch: Getting updates since {since_date.strftime('%Y-%m-%d')}...")

                results1 = await tracker.fetch_and_store_updated_gtins(since_date)
                print(f"Results: {results1}")

                # Get count after first fetch
                count_result1 = await db.execute(count_stmt)
                count1 = count_result1.scalar() or 0
                print(f"GTIN count after 1st fetch: {count1}")

                # Fetch again with same date range
                print(f"\n2nd fetch: Getting same updates again...")
                results2 = await tracker.fetch_and_store_updated_gtins(since_date)
                print(f"Results: {results2}")

                # Get count after second fetch
                count_result2 = await db.execute(count_stmt)
                count2 = count_result2.scalar() or 0
                print(f"GTIN count after 2nd fetch: {count2}")

                # Check for duplicates
                dup_stmt = select(
                    MatinfoGTINUpdate.gtin,
                    func.count(MatinfoGTINUpdate.id).label('count')
                ).group_by(MatinfoGTINUpdate.gtin).having(func.count(MatinfoGTINUpdate.id) > 1)

                dup_result = await db.execute(dup_stmt)
                duplicates = dup_result.all()

                print(f"\n--- Summary ---")
                print(f"Initial count: {initial_count}")
                print(f"After 1st fetch: {count1} (added {count1 - initial_count})")
                print(f"After 2nd fetch: {count2} (added {count2 - count1})")
                print(f"Duplicates found: {len(duplicates)}")

                if duplicates:
                    print("\nDuplicate GTINs:")
                    for gtin, count in duplicates[:5]:  # Show first 5
                        print(f"  - {gtin}: {count} times")
                else:
                    print("\n✅ No duplicates - each GTIN exists only once!")

                # Show sample of recent updates
                recent = await tracker.get_recent_updates(limit=3)
                if recent:
                    print(f"\nSample of recent updates:")
                    for record in recent:
                        print(f"  - {record['gtin']} (Updated: {record['update_date']})")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    print("Starting GTIN update test...")
    print("This test verifies that GTINs are updated, not duplicated.\n")
    asyncio.run(test_gtin_updates())
    print("\nTest completed!")