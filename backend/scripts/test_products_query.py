#!/usr/bin/env python3
import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

async def test_products():
    # Get database URL
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return
    
    # Convert to asyncpg format
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    conn = await asyncpg.connect(db_url)
    
    try:
        # Test simple query first
        print("Testing simple query...")
        rows = await conn.fetch('SELECT "ProduktID", "Produktnavn" FROM "tblProdukter" LIMIT 5')
        for row in rows:
            print(f"ProduktID: {row['ProduktID']}, Produktnavn: {row['Produktnavn']}")
        
        print("\nTesting with more columns...")
        # Try with more columns
        rows = await conn.fetch('''
            SELECT "ProduktID", "Produktnavn", "Pris", "Utgått", "LeverandørsProduktNr"
            FROM "tblProdukter" 
            WHERE "Utgått" = false OR "Utgått" IS NULL
            LIMIT 5
        ''')
        
        for row in rows:
            print(f"ProduktID: {row['ProduktID']}, Produktnavn: {row['Produktnavn']}, Pris: {row['Pris']}, Utgått: {row['Utgått']}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(test_products())