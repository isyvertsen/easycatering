#!/usr/bin/env python3
"""Check the structure of menu-related tables in the database."""

import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infrastructure.database.session import AsyncSessionLocal


async def check_table_structure():
    """Check the structure of periode, periodemeny, and menyprodukt tables."""
    async with AsyncSessionLocal() as session:
        # Check tblperiode structure
        print("=== tblperiode structure ===")
        result = await session.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'tblperiode'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
        
        print("\n=== tblperiodemeny structure ===")
        result = await session.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'tblperiodemeny'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
        
        print("\n=== tblmenyprodukt structure ===")
        result = await session.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'tblmenyprodukt'
            ORDER BY ordinal_position;
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
        
        # Check foreign keys
        print("\n=== Foreign Keys ===")
        result = await session.execute(text("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name IN ('tblperiode', 'tblperiodemeny', 'tblmenyprodukt');
        """))
        for row in result:
            print(f"  {row[0]}.{row[1]} -> {row[2]}.{row[3]}")


if __name__ == "__main__":
    asyncio.run(check_table_structure())