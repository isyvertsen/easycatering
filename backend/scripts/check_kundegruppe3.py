#!/usr/bin/env python3
"""Check customers in kundegruppe 3 before and after anonymization."""

import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infrastructure.database.session import AsyncSessionLocal
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe


async def get_kundegruppe3_customers():
    """Get all customers in kundegruppe 3."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Kunder).where(Kunder.kundegruppe == 3).limit(10)
        )
        customers = result.scalars().all()
        
        print(f"\n=== Found {len(customers)} customers in kundegruppe 3 (showing first 10) ===\n")
        
        for customer in customers:
            print(f"Customer ID: {customer.kundeid}")
            print(f"  Name: {customer.kundenavn}")
            print(f"  Contact ID: {customer.kontaktid}")
            print(f"  Phone: {customer.telefonnummer}")
            print(f"  Mobile: {customer.mobilnummer}")
            print(f"  Address: {customer.adresse}")
            print(f"  Postal: {customer.postnr} {customer.sted}")
            print(f"  Email: {customer.e_post}")
            print(f"  Email2: {customer.e_post2}")
            print(f"  Website: {customer.webside}")
            print(f"  Note: {customer.merknad}")
            print(f"  Menu info: {customer.menyinfo}")
            print("-" * 50)


if __name__ == "__main__":
    asyncio.run(get_kundegruppe3_customers())