"""Simple script to get table schemas."""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def get_schemas():
    """Get table schemas."""
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        # Get the tables we care about
        important_tables = [
            'tblAnsatte',
            'tblKunder', 
            'tblOrdrer',
            'tblOrdreDetaljer',
            'tblProdukter',
            'tblOppskrifter',
            'tblOppskriftdetaljer',
            'tblLeverandorer',
            'tblBestillinger',
            'tblBestillingdetaljer',
            'tblLager',
            'tblMenyer',
            'tblMenydetaljer'
        ]
        
        for table_name in important_tables:
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
    asyncio.run(get_schemas())