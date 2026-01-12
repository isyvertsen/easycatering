"""Find recipe and other tables."""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def get_tables():
    """Get recipe and calculation tables."""
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # Look for recipe/calculation related tables
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND (table_name LIKE '%kalkyle%' OR table_name LIKE '%oppskrift%' OR table_name LIKE '%meny%')
            ORDER BY table_name
        """))
        
        tables = result.fetchall()
        print("Recipe/Menu related tables:")
        for table in tables:
            print(f"\n{table[0]}")
            
        # Check specific tables for columns
        check_tables = [
            'tbl_rpKalkyle',
            'tbl_rpKalkyledetaljer',
            'tblLeverandører',
            'tblBestillingsposter',
            'tblMenyProdukt'
        ]
        
        for table_name in check_tables:
            print(f"\n=== {table_name} ===")
            result = await conn.execute(text(f"""
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            for col in columns:
                print(f"  {col[0]}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_tables())