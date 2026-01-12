"""Get all columns for missing tables."""
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
        # Tables with missing columns
        tables = [
            'tblOrdreDetaljer',
            'tblOppskrifter',
            'tblOppskriftdetaljer',
            'tblLeverandorer',
            'tblBestillingdetaljer',
            'tblLager',
            'tblMenyer',
            'tblMenydetaljer'
        ]
        
        for table_name in tables:
            print(f"\n=== {table_name} ===")
            result = await conn.execute(text(f"""
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            if not columns:
                # Try with lowercase
                result = await conn.execute(text(f"""
                    SELECT column_name
                    FROM information_schema.columns 
                    WHERE lower(table_name) = '{table_name.lower()}'
                    ORDER BY ordinal_position
                """))
                columns = result.fetchall()
            
            for col in columns:
                print(f"  {col[0]}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_schemas())