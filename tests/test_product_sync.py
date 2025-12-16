"""Test script for syncing product details from Matinfo."""
import asyncio
from app.infrastructure.database.session import AsyncSessionLocal
from app.services.matinfo_product_sync import MatinfoProductSync
from sqlalchemy import select
from app.models.matinfo_products import MatinfoProduct, MatinfoNutrient, MatinfoAllergen


async def test_product_sync():
    """Test syncing a single product from Matinfo."""
    # Use a known GTIN from the example
    test_gtin = "00000080481508"

    async with AsyncSessionLocal() as db:
        try:
            async with MatinfoProductSync(db) as sync_service:
                print(f"Testing product sync for GTIN: {test_gtin}")
                print("-" * 50)

                # Sync the product
                success = await sync_service.sync_product(test_gtin)

                if success:
                    print("✅ Product synced successfully!")

                    # Fetch the product from database
                    product_stmt = select(MatinfoProduct).where(MatinfoMatinfoProduct.gtin == test_gtin)
                    result = await db.execute(product_stmt)
                    product = result.scalar_one_or_none()

                    if product:
                        print(f"\nProduct Details:")
                        print(f"  GTIN: {product.gtin}")
                        print(f"  Name: {product.name}")
                        print(f"  Brand: {product.brand_name}")
                        print(f"  Producer: {product.producer_name}")
                        print(f"  Provider: {product.provider_name}")
                        print(f"  Country: {product.country_of_origin}")

                        # Get nutrients
                        nutrient_stmt = select(MatinfoNutrient).where(MatinfoNutrient.gtin == test_gtin)
                        nutrient_result = await db.execute(nutrient_stmt)
                        nutrients = nutrient_result.scalars().all()

                        if nutrients:
                            print(f"\n  Nutrients ({len(nutrients)}):")
                            for nutrient in nutrients[:5]:  # Show first 5
                                print(f"    - {nutrient.name}: {nutrient.measurement} {nutrient.measurement_type}")

                        # Get allergens
                        allergen_stmt = select(MatinfoAllergen).where(MatinfoAllergen.gtin == test_gtin)
                        allergen_result = await db.execute(allergen_stmt)
                        allergens = allergen_result.scalars().all()

                        if allergens:
                            print(f"\n  Allergens ({len(allergens)}):")
                            for allergen in allergens[:5]:  # Show first 5
                                print(f"    - {allergen.name}: {allergen.level}")
                else:
                    print("❌ Product sync failed")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()


async def test_batch_sync():
    """Test syncing multiple products."""
    async with AsyncSessionLocal() as db:
        try:
            async with MatinfoProductSync(db) as sync_service:
                print("\nTesting batch product sync")
                print("-" * 50)

                # Get current progress
                progress = await sync_service.get_sync_progress()
                print(f"Current status:")
                print(f"  Total GTINs: {progress['total']}")
                print(f"  Pending: {progress['pending']}")
                print(f"  Synced: {progress['synced']}")
                print(f"  Failed: {progress['failed']}")
                print(f"  Skipped: {progress['skipped']}")
                print(f"  Progress: {progress['progress_percentage']}%")

                if progress['pending'] > 0:
                    print(f"\nSyncing 5 pending products...")
                    result = await sync_service.sync_pending_products(limit=5)

                    print(f"\nSync Results:")
                    print(f"  Total processed: {result['total']}")
                    print(f"  Successful: {result['success']}")
                    print(f"  Failed: {result['failed']}")
                    print(f"  Skipped: {result['skipped']}")

                    # Get updated progress
                    new_progress = await sync_service.get_sync_progress()
                    print(f"\nUpdated Progress: {new_progress['progress_percentage']}%")
                else:
                    print("\nNo pending products to sync")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()


async def main():
    """Run all tests."""
    print("Starting Matinfo product sync test...\n")

    # Test single product sync
    await test_product_sync()

    # Test batch sync
    await test_batch_sync()

    print("\nTest completed!")


if __name__ == "__main__":
    asyncio.run(main())