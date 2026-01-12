"""Script to clean up duplicate GTINs in the database."""
import asyncio
from sqlalchemy import text
from app.infrastructure.database.session import AsyncSessionLocal


async def cleanup_duplicates():
    """Remove duplicate GTINs, keeping the most recent one."""
    async with AsyncSessionLocal() as db:
        try:
            # First, check for duplicates
            check_stmt = text("""
                SELECT gtin, COUNT(*) as count
                FROM matinfo_gtin_updates
                GROUP BY gtin
                HAVING COUNT(*) > 1
            """)

            result = await db.execute(check_stmt)
            duplicates = result.all()

            if duplicates:
                print(f"Found {len(duplicates)} GTINs with duplicates")
                for gtin, count in duplicates[:10]:  # Show first 10
                    print(f"  - {gtin}: {count} records")

                print("\nRemoving duplicates...")

                # Remove duplicates, keeping the one with the highest ID (most recent)
                delete_stmt = text("""
                    DELETE FROM matinfo_gtin_updates
                    WHERE id NOT IN (
                        SELECT MAX(id)
                        FROM matinfo_gtin_updates
                        GROUP BY gtin
                    )
                """)

                result = await db.execute(delete_stmt)
                await db.commit()

                print(f"Deleted {result.rowcount} duplicate records")

                # Verify no more duplicates
                check_result = await db.execute(check_stmt)
                remaining = check_result.all()

                if not remaining:
                    print("✅ All duplicates removed successfully!")
                else:
                    print(f"⚠️ Still have {len(remaining)} duplicates")
            else:
                print("✅ No duplicates found!")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    print("Cleaning up duplicate GTINs...")
    asyncio.run(cleanup_duplicates())
    print("Done!")