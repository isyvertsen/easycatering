"""Script to get all table schemas with exact column names from the database."""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.infrastructure.database.session import engine
import json

async def get_all_table_schemas():
    """Get all tables and their columns with exact casing."""
    async with engine.begin() as conn:
        # Get all tables
        tables_result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """))
        
        tables = tables_result.fetchall()
        
        schemas = {}
        
        for table in tables:
            table_name = table[0]
            
            # Get columns for each table
            columns_result = await conn.execute(text("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                FROM information_schema.columns 
                WHERE table_name = :table_name
                ORDER BY ordinal_position
            """), {"table_name": table_name})
            
            columns = columns_result.fetchall()
            
            schemas[table_name] = []
            for col in columns:
                schemas[table_name].append({
                    "name": col[0],
                    "type": col[1],
                    "nullable": col[2] == "YES",
                    "default": col[3],
                    "max_length": col[4],
                    "numeric_precision": col[5],
                    "numeric_scale": col[6]
                })
        
        return schemas

async def main():
    schemas = await get_all_table_schemas()
    
    # Print results
    for table_name, columns in schemas.items():
        print(f"\n=== Table: {table_name} ===")
        for col in columns:
            nullable = "NULL" if col["nullable"] else "NOT NULL"
            print(f"  {col['name']:<30} {col['type']:<20} {nullable}")
    
    # Save to JSON file for reference
    with open("database_schema.json", "w") as f:
        json.dump(schemas, f, indent=2)
    
    print(f"\n\nTotal tables found: {len(schemas)}")
    print("Schema saved to database_schema.json")

if __name__ == "__main__":
    asyncio.run(main())