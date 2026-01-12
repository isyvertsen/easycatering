#!/usr/bin/env python3
"""Test the menu system endpoints."""

import asyncio
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infrastructure.database.session import AsyncSessionLocal
# Import all models to avoid circular import issues
from app.models import *


async def test_menu_system():
    """Test the menu system by checking data."""
    async with AsyncSessionLocal() as session:
        # Check periods
        from sqlalchemy import select
        
        print("=== Testing Menu System ===\n")
        
        # Check periods
        periode_result = await session.execute(select(Periode).limit(5))
        perioder = periode_result.scalars().all()
        print(f"Found {len(perioder)} periods")
        for p in perioder:
            print(f"  Period {p.menyperiodeid}: Week {p.ukenr}, {p.fradato} to {p.tildato}")
        
        print("\n")
        
        # Check menus
        meny_result = await session.execute(select(Meny).limit(5))
        menyer = meny_result.scalars().all()
        print(f"Found {len(menyer)} menus")
        for m in menyer:
            print(f"  Menu {m.menyid}: {m.beskrivelse}")
        
        print("\n")
        
        # Check period-menu relationships
        pm_result = await session.execute(select(PeriodeMeny).limit(5))
        periode_menyer = pm_result.scalars().all()
        print(f"Found {len(periode_menyer)} period-menu relationships")
        for pm in periode_menyer:
            print(f"  Period {pm.periodeid} -> Menu {pm.menyid}")
        
        print("\n")
        
        # Check menu-product relationships
        mp_result = await session.execute(select(MenyProdukt).limit(5))
        meny_produkter = mp_result.scalars().all()
        print(f"Found {len(meny_produkter)} menu-product relationships")
        for mp in meny_produkter:
            print(f"  Menu {mp.menyid} -> Product {mp.produktid}")
        
        print("\n=== Menu System Test Complete ===")


if __name__ == "__main__":
    asyncio.run(test_menu_system())