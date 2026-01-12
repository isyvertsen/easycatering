"""Get exact table names from database."""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def get_tables():
    """Get all table names."""
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name LIKE 'tbl%'
            ORDER BY table_name
        """))
        
        tables = result.fetchall()
        print("All tables starting with 'tbl':")
        for table in tables:
            print(f"  {table[0]}")
            
        # Now get columns for specific tables
        check_tables = [
            'tblOppskrift',
            'tblOppskriftDetaljer', 
            'tblLeverandør',
            'tblBestillingsdetaljer',
            'tblBatchProd',
            'tblMeny',
            'tblMenyDetaljer'
        ]
        
        for table_name in check_tables:
            print(f"\n=== Checking {table_name} ===")
            result = await conn.execute(text(f"""
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            if columns:
                for col in columns:
                    print(f"  {col[0]}")
            else:
                print("  (table not found)")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_tables())