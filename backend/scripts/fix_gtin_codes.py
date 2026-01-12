"""
Script to normalize GTIN codes in matinfo_products and tblprodukter tables.

This script:
1. Normalizes all GTIN codes in matinfo_products table
2. Normalizes all EAN codes in tblprodukter table
3. Removes spaces, leading spaces, and ensures correct format with leading zeros
4. Validates check digits where possible

Usage:
    uv run python scripts/fix_gtin_codes.py [--dry-run]

Options:
    --dry-run    Show what would be changed without making changes
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.utils.gtin import normalize_gtin


async def fix_matinfo_gtins(db: AsyncSession, dry_run: bool = False):
    """
    Fix GTIN codes in matinfo_products table.

    Args:
        db: Database session
        dry_run: If True, only show what would be changed
    """
    print("\n=== Fixing matinfo_products GTINs ===\n")

    # Get all products with GTINs using raw SQL
    query = text("SELECT id, gtin, name FROM matinfo_products WHERE gtin IS NOT NULL")
    result = await db.execute(query)
    products = result.fetchall()

    total = len(products)
    changed = 0
    invalid = 0

    print(f"Found {total} products with GTIN codes")

    updates = []

    for row in products:
        product_id, old_gtin, name = row
        normalized = normalize_gtin(old_gtin)

        if not normalized:
            print(f"❌ Invalid GTIN (cannot normalize): {old_gtin} - {name[:50] if name else 'N/A'}")
            invalid += 1
            continue

        if old_gtin != normalized:
            print(f"✓ {old_gtin:20} → {normalized:20} | {name[:50] if name else 'N/A'}")
            changed += 1
            updates.append({"product_id": product_id, "new_gtin": normalized})

    if not dry_run and updates:
        # Update GTINs using raw SQL
        for update in updates:
            update_query = text(
                "UPDATE matinfo_products SET gtin = :new_gtin WHERE id = :product_id"
            )
            await db.execute(update_query, update)
        await db.commit()
        print(f"\n✅ Updated {changed} GTIN codes in matinfo_products")
    else:
        print(f"\n{'[DRY RUN] ' if dry_run else ''}Would update {changed} GTIN codes")

    print(f"Invalid GTINs: {invalid}")
    return changed, invalid


async def fix_produkt_ean_codes(db: AsyncSession, dry_run: bool = False):
    """
    Fix EAN codes in tblprodukter table.

    Args:
        db: Database session
        dry_run: If True, only show what would be changed
    """
    print("\n=== Fixing tblprodukter EAN codes ===\n")

    # Get all products with EAN codes using raw SQL
    query = text("SELECT produktid, produktnavn, ean_kode FROM tblprodukter WHERE ean_kode IS NOT NULL")
    result = await db.execute(query)
    products = result.fetchall()

    total = len(products)
    changed = 0
    invalid = 0
    cleaned = 0

    print(f"Found {total} products with EAN codes")

    updates = []
    nulls = []

    for row in products:
        produktid, produktnavn, old_ean = row

        # Special handling for placeholder values like "0"
        if old_ean in ["0", "-"]:
            print(f"⚠️  Placeholder EAN: '{old_ean}' in product {produktid} - {produktnavn[:40] if produktnavn else 'N/A'}")
            cleaned += 1
            nulls.append(produktid)
            continue

        normalized = normalize_gtin(old_ean)

        if not normalized:
            print(f"❌ Invalid EAN (cannot normalize): '{old_ean}' - {produktnavn[:40] if produktnavn else 'N/A'}")
            invalid += 1
            continue

        if old_ean != normalized:
            print(f"✓ {produktid:5} | {old_ean:25} → {normalized:20} | {produktnavn[:35] if produktnavn else 'N/A'}")
            changed += 1
            updates.append({"produktid": produktid, "new_ean": normalized})

    if not dry_run:
        # Update EAN codes
        if updates:
            for update in updates:
                update_query = text(
                    "UPDATE tblprodukter SET ean_kode = :new_ean WHERE produktid = :produktid"
                )
                await db.execute(update_query, update)

        # Set placeholders to NULL
        if nulls:
            for produktid in nulls:
                null_query = text(
                    "UPDATE tblprodukter SET ean_kode = NULL WHERE produktid = :produktid"
                )
                await db.execute(null_query, {"produktid": produktid})

        if updates or nulls:
            await db.commit()
            print(f"\n✅ Updated {changed} EAN codes and cleaned {cleaned} placeholder values in tblprodukter")
    else:
        print(f"\n{'[DRY RUN] ' if dry_run else ''}Would update {changed} EAN codes and clean {cleaned} placeholder values")

    print(f"Invalid EANs: {invalid}")
    return changed, cleaned, invalid


async def main():
    """Main function to fix GTIN codes in both tables."""
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("=== DRY RUN MODE - No changes will be made ===\n")

    # Get database session
    async for db in get_db():
        try:
            # Fix matinfo_products
            matinfo_changed, matinfo_invalid = await fix_matinfo_gtins(db, dry_run)

            # Fix tblprodukter
            produkt_changed, produkt_cleaned, produkt_invalid = await fix_produkt_ean_codes(db, dry_run)

            # Summary
            print("\n" + "="*70)
            print("SUMMARY")
            print("="*70)
            print(f"matinfo_products:")
            print(f"  - Changed: {matinfo_changed}")
            print(f"  - Invalid: {matinfo_invalid}")
            print(f"\ntblprodukter:")
            print(f"  - Changed: {produkt_changed}")
            print(f"  - Cleaned: {produkt_cleaned}")
            print(f"  - Invalid: {produkt_invalid}")
            print(f"\nTotal changes: {matinfo_changed + produkt_changed + produkt_cleaned}")

            if dry_run:
                print("\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.")
            else:
                print("\n✅ All changes have been committed to the database.")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()
            break


if __name__ == "__main__":
    asyncio.run(main())
