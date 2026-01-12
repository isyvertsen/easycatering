"""Test fetching large number of GTINs from Matinfo."""
import asyncio
from datetime import datetime, timedelta
from app.infrastructure.database.session import AsyncSessionLocal
from app.services.matinfo_gtin_tracker import MatinfoGTINTracker
from sqlalchemy import select, func, text
from app.models.matinfo_updates import MatinfoGTINUpdate


async def test_large_fetch():
    """Test fetching GTINs from last 1400 days."""
    async with AsyncSessionLocal() as db:
        try:
            async with MatinfoGTINTracker(db) as tracker:
                print("Testing Large GTIN Fetch")
                print("-" * 50)

                # Get initial count
                count_stmt = select(func.count()).select_from(MatinfoGTINUpdate)
                initial_result = await db.execute(count_stmt)
                initial_count = initial_result.scalar() or 0
                print(f"Initial GTIN count: {initial_count}")

                # Fetch updates from the last 1400 days (about 3.8 years)
                since_date = datetime.now() - timedelta(days=1400)
                print(f"\nFetching updates since {since_date.strftime('%Y-%m-%d')} (1400 days ago)...")
                print("This may take a while...")

                results = await tracker.fetch_and_store_updated_gtins(since_date)
                print(f"\nResults: {results}")

                # Get count after fetch
                count_result = await db.execute(count_stmt)
                final_count = count_result.scalar() or 0
                print(f"Final GTIN count: {final_count}")
                print(f"Total GTINs added/updated: {final_count - initial_count}")

                # Check for any duplicates
                dup_stmt = text("""
                    SELECT gtin, COUNT(*) as count
                    FROM matinfo_gtin_updates
                    GROUP BY gtin
                    HAVING COUNT(*) > 1
                    LIMIT 5
                """)
                dup_result = await db.execute(dup_stmt)
                duplicates = dup_result.all()

                if duplicates:
                    print(f"\n⚠️ Found duplicates:")
                    for gtin, count in duplicates:
                        print(f"  - {gtin}: {count} times")
                else:
                    print("\n✅ No duplicates found!")

                # Show statistics
                stats = await tracker.get_sync_statistics()
                print(f"\n--- Statistics ---")
                print(f"Total GTINs: {stats['total_gtins']}")
                print(f"Pending sync: {stats['pending']}")
                print(f"Successfully synced: {stats['synced']}")
                print(f"Failed: {stats['failed']}")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    print("Starting large GTIN fetch test...")
    print("Fetching GTINs from the last 1400 days (~3.8 years)\n")
    asyncio.run(test_large_fetch())
    print("\nTest completed!")