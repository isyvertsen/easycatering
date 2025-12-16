"""Check database schema for matinfo tables."""
import asyncio
from app.infrastructure.database.session import get_db_session
from sqlalchemy import text


async def check_schema():
    async for session in get_db_session():
        # Check matinfo_allergens
        result = await session.execute(text("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'matinfo_allergens'
            ORDER BY ordinal_position
        """))
        print("matinfo_allergens schema:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (default: {row[2]}, nullable: {row[3]})")

        # Check matinfo_nutrients
        result = await session.execute(text("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'matinfo_nutrients'
            ORDER BY ordinal_position
        """))
        print("\nmatinfo_nutrients schema:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (default: {row[2]}, nullable: {row[3]})")

        break


if __name__ == "__main__":
    asyncio.run(check_schema())
