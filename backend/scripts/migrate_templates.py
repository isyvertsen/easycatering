#!/usr/bin/env python3
"""
Template Migration Script

Migrates existing templates from tbl_rpproduksjon to tbl_produksjonstemplate.

In the old system, templates were stored as regular production orders with:
- A special customer ID (e.g., kundeid = 0 or a dummy customer)
- Often 0-values or standard values
- Example: Plan 7879 is a template

This script:
1. Identifies templates in tbl_rpproduksjon
2. Copies them to tbl_produksjonstemplate
3. Copies details to tbl_produksjonstemplate_detaljer
4. Optionally deletes or marks the old records

Usage:
    python scripts/migrate_templates.py --template-kundeid 0 --dry-run
    python scripts/migrate_templates.py --template-kundeid 0 --execute
    python scripts/migrate_templates.py --template-kundeid 0 --execute --delete-old
"""

import asyncio
import argparse
from datetime import datetime
from typing import List

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

import sys
sys.path.insert(0, '/Users/ivarsyvertsen/code/ravi/easy/easycatering/backend')

from app.infrastructure.database.session import get_db_session
from app.models.produksjonstemplate import ProduksjonsTemplate, ProduksjonsTemplateDetaljer
from app.models.produksjon import Produksjon, ProduksjonsDetaljer


async def migrate_templates(
    db: AsyncSession,
    template_kundeid: int,
    dry_run: bool = True,
    delete_old: bool = False,
) -> dict:
    """
    Migrate templates from tbl_rpproduksjon to tbl_produksjonstemplate.

    Args:
        db: Database session
        template_kundeid: Customer ID used for templates in old system
        dry_run: If True, only show what would be migrated (no changes)
        delete_old: If True, delete old template records after migration

    Returns:
        dict: Statistics about the migration
    """
    print("="*60)
    print("TEMPLATE MIGRATION SCRIPT")
    print("="*60)
    print(f"Template kunde-ID: {template_kundeid}")
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'EXECUTE (will make changes)'}")
    print(f"Delete old: {delete_old}")
    print("="*60)

    # Find all templates (production orders with special customer ID)
    stmt = select(Produksjon).where(Produksjon.kundeid == template_kundeid)
    result = await db.execute(stmt)
    old_templates = result.scalars().all()

    print(f"\nFound {len(old_templates)} templates to migrate")

    if not old_templates:
        print("\n✓ No templates found. Nothing to migrate.")
        return {"total": 0, "migrated": 0, "deleted": 0}

    stats = {
        "total": len(old_templates),
        "migrated": 0,
        "deleted": 0,
        "errors": 0,
    }

    for old_template in old_templates:
        print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing template {old_template.produksjonkode}...")

        try:
            # Create template name from informasjon or use a default
            template_navn = (
                old_template.informasjon[:255] if old_template.informasjon
                else f"Migrert template {old_template.produksjonkode}"
            )

            print(f"  Name: {template_navn}")

            if not dry_run:
                # Create new template
                new_template = ProduksjonsTemplate(
                    template_navn=template_navn,
                    beskrivelse=f"Migrert fra plan {old_template.produksjonkode}\nInfo: {old_template.informasjon or 'N/A'}",
                    kundegruppe=12,  # Assume kundegruppe 12
                    aktiv=True,
                    opprettet_dato=old_template.created or datetime.now(),
                )
                db.add(new_template)
                await db.flush()

                print(f"  ✓ Created template {new_template.template_id}")

            # Get details
            detaljer_stmt = select(ProduksjonsDetaljer).where(
                ProduksjonsDetaljer.produksjonskode == old_template.produksjonkode
            )
            detaljer_result = await db.execute(detaljer_stmt)
            old_detaljer = detaljer_result.scalars().all()

            print(f"  Found {len(old_detaljer)} detail lines")

            if not dry_run:
                # Copy details
                for idx, old_detalj in enumerate(old_detaljer):
                    new_detalj = ProduksjonsTemplateDetaljer(
                        template_id=new_template.template_id,
                        produktid=old_detalj.produktid if old_detalj.produktid else None,
                        kalkyleid=old_detalj.kalkyleid if old_detalj.kalkyleid else None,
                        standard_antall=int(old_detalj.antallporsjoner or 0),
                        linje_nummer=old_detalj.linje_nummer or idx,
                    )
                    db.add(new_detalj)

                print(f"  ✓ Copied {len(old_detaljer)} detail lines")

                # Delete old records if requested
                if delete_old:
                    # Delete details first (foreign key)
                    await db.execute(
                        delete(ProduksjonsDetaljer).where(
                            ProduksjonsDetaljer.produksjonskode == old_template.produksjonkode
                        )
                    )
                    # Delete template
                    await db.delete(old_template)
                    stats["deleted"] += 1
                    print(f"  ✓ Deleted old template {old_template.produksjonkode}")

            stats["migrated"] += 1

        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            stats["errors"] += 1
            if not dry_run:
                await db.rollback()
                raise

    if not dry_run:
        await db.commit()
        print("\n✓ Migration completed and committed")
    else:
        print("\n[DRY RUN] No changes were made")

    # Summary
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"Total templates found: {stats['total']}")
    print(f"Successfully migrated: {stats['migrated']}")
    if delete_old:
        print(f"Old records deleted: {stats['deleted']}")
    print(f"Errors: {stats['errors']}")
    print("="*60)

    return stats


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate templates from tbl_rpproduksjon to tbl_produksjonstemplate"
    )
    parser.add_argument(
        "--template-kundeid",
        type=int,
        required=True,
        help="Customer ID used for templates in old system (e.g., 0)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Dry run mode - show what would be migrated without making changes (default)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute the migration (overrides --dry-run)",
    )
    parser.add_argument(
        "--delete-old",
        action="store_true",
        help="Delete old template records after successful migration",
    )

    args = parser.parse_args()

    # Execute overrides dry-run
    dry_run = not args.execute

    # Get database session
    async for db in get_db_session():
        try:
            stats = await migrate_templates(
                db=db,
                template_kundeid=args.template_kundeid,
                dry_run=dry_run,
                delete_old=args.delete_old,
            )

            if stats["errors"] > 0:
                print("\n⚠️  Migration completed with errors")
                sys.exit(1)
            else:
                print("\n✓ Migration completed successfully")
                sys.exit(0)

        except Exception as e:
            print(f"\n✗ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
