"""Service for syncing full product details from Matinfo API."""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional, List
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert

from app.models.matinfo_products import MatinfoProduct, MatinfoNutrient as MatinfoNutrient, MatinfoAllergen
from app.models.matinfo_updates import MatinfoGTINUpdate, MatinfoSyncLog
from app.core.config import settings

logger = logging.getLogger(__name__)


class MatinfoProductSync:
    """Service for syncing full product details from Matinfo."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = None
        self.base_url = settings.MATINFO_API_URL
        self.api_key = settings.MATINFO_API_KEY

    async def _ensure_client(self):
        """Ensure HTTP client is initialized."""
        if self.client is None:
            self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client if it was created."""
        if self.client:
            await self.client.aclose()
            self.client = None

    async def fetch_product_details(self, gtin: str) -> Optional[Dict]:
        """
        Fetch detailed product information from Matinfo API.

        Args:
            gtin: The GTIN code to fetch details for.

        Returns:
            Product data dictionary or None if not found.
        """
        try:
            await self._ensure_client()
            url = f"{self.base_url}/product/gtin/{gtin}"
            response = await self.client.get(
                url,
                params={"api_key": self.api_key}
            )

            if response.status_code == 404:
                logger.warning(f"Product not found for GTIN: {gtin}")
                return None

            response.raise_for_status()
            return response.json()

        except Exception as e:
            logger.error(f"Error fetching product {gtin}: {e}")
            raise

    async def sync_product(self, gtin: str, commit: bool = False) -> bool:
        """
        Sync a single product from Matinfo to our database.

        Args:
            gtin: The GTIN code to sync.
            commit: Whether to commit the transaction (default: False).

        Returns:
            True if successful, False otherwise.
        """
        try:
            # Fetch product details from Matinfo
            product_data = await self.fetch_product_details(gtin)

            if not product_data:
                # Product not found in Matinfo
                logger.info(f"Product not found in Matinfo: {gtin}")
                return False

            # Prepare product data for database
            actual_gtin = product_data.get("gtin")
            if actual_gtin != gtin:
                logger.warning(f"GTIN mismatch: requested {gtin}, got {actual_gtin} from API")

            product_dict = {
                "gtin": actual_gtin or gtin,  # Use actual GTIN from API or fallback to requested
                "name": product_data.get("name"),
                "item_number": product_data.get("itemNumber"),
                "epd_number": product_data.get("epdNumber"),
                "producer_name": product_data.get("producerName"),
                "provider_name": product_data.get("providerName"),
                "brand_name": product_data.get("brandName"),
                "ingredient_statement": product_data.get("ingredientStatement"),
                "product_url": product_data.get("productUrl"),
                "product_description": product_data.get("productDescription"),
                "country_of_origin": product_data.get("countryOfOrigin"),
                "country_of_preparation": product_data.get("countryOfPreparation"),
                "fpakk": product_data.get("fpakk"),
                "dpakk": product_data.get("dpakk"),
                "pall": product_data.get("pall"),
                "matinfo_created": product_data.get("created"),
                "matinfo_updated": product_data.get("updated"),
            }

            # Upsert product and get the ID directly
            stmt = insert(MatinfoProduct).values(**product_dict)
            stmt = stmt.on_conflict_do_update(
                index_elements=['gtin'],
                set_={k: v for k, v in product_dict.items() if k != 'gtin'}
            ).returning(MatinfoMatinfoProduct.id)

            result = await self.db.execute(stmt)
            product_id = result.scalar_one_or_none()

            if product_id is None:
                # Try to get existing product ID as fallback
                product_stmt = select(MatinfoMatinfoProduct.id).where(
                    MatinfoMatinfoProduct.gtin == product_dict.get("gtin", gtin)
                )
                product_result = await self.db.execute(product_stmt)
                product_id = product_result.scalar_one_or_none()

                if product_id is None:
                    raise Exception(f"Failed to insert or find product for GTIN {gtin}")

            # Sync nutrients
            if "nutrients" in product_data and product_data["nutrients"] is not None:
                await self.sync_nutrients(product_id, gtin, product_data["nutrients"])

            # Sync allergens
            if "allergens" in product_data and product_data["allergens"] is not None:
                await self.sync_allergens(product_id, gtin, product_data["allergens"])

            # Only commit if explicitly requested
            if commit:
                await self.db.commit()

            logger.info(f"Successfully synced product: {gtin} - {product_data.get('name')}")
            return True

        except Exception as e:
            error_msg = str(e)[:500]  # Truncate error message
            logger.error(f"Failed to sync product {gtin}: {e}")

            # Update GTIN status to failed for single product sync failures
            try:
                await self.update_gtin_status(gtin, "failed", error_msg)
                logger.info(f"Marked {gtin} as failed due to sync error")
            except Exception as status_error:
                logger.error(f"Failed to update status for {gtin}: {status_error}")

            # Let the caller or framework handle rollback
            raise  # Re-raise to let caller handle it

    async def sync_nutrients(self, product_id: int, gtin: str, nutrients_data: List[Dict]):
        """Sync nutrients for a product."""
        # Delete existing nutrients for this product
        await self.db.execute(
            MatinfoNutrient.__table__.delete().where(MatinfoNutrient.product_id == product_id)
        )

        # Insert new nutrients
        for nutrient in nutrients_data:
            nutrient_dict = {
                "product_id": product_id,
                "gtin": gtin,
                "code": nutrient.get("code"),
                "measurement": nutrient.get("measurement"),
                "measurement_precision": nutrient.get("measurementPrecision"),
                "measurement_type": nutrient.get("measurementType"),
                "name": nutrient.get("name"),
            }

            stmt = insert(MatinfoNutrient).values(**nutrient_dict)
            await self.db.execute(stmt)

    async def sync_allergens(self, product_id: int, gtin: str, allergens_data: List[Dict]):
        """Sync allergens for a product."""
        # Delete existing allergens for this product
        await self.db.execute(
            MatinfoAllergen.__table__.delete().where(MatinfoAllergen.product_id == product_id)
        )

        # Insert new allergens
        for allergen in allergens_data:
            # Map allergen level to integer (same as matinfo_sync.py)
            level_map = {
                "FREE_FROM": 0,
                "MAY_CONTAIN": 1,
                "CONTAINS": 2
            }
            level_str = allergen.get("level", "FREE_FROM")
            level_int = level_map.get(level_str, 0)

            allergen_dict = {
                "product_id": product_id,
                "gtin": gtin,
                "code": allergen.get("code"),
                "level": level_int,  # Store as integer (0=FREE_FROM, 1=MAY_CONTAIN, 2=CONTAINS)
                "name": allergen.get("name"),
            }

            stmt = insert(MatinfoAllergen).values(**allergen_dict)
            await self.db.execute(stmt)

    async def update_gtin_status(self, gtin: str, status: str, error_message: str = None):
        """Update the sync status of a GTIN."""
        stmt = select(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.gtin == gtin
        )
        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()

        if record:
            record.sync_status = status
            record.synced = (status == "success")
            if error_message:
                record.error_message = error_message
            record.updated_at = datetime.now()
            # Changes will be persisted when session commits

    async def sync_pending_products(self, limit: int = 100) -> Dict[str, int]:
        """
        Sync pending products from the GTIN tracking table.

        Args:
            limit: Maximum number of products to sync.

        Returns:
            Dictionary with sync statistics.
        """
        # Create sync log
        sync_log = MatinfoSyncLog(
            sync_type="product_sync",
            start_date=datetime.now(),
            status="running"
        )
        self.db.add(sync_log)

        success_count = 0
        failed_count = 0
        skipped_count = 0

        try:
            # Get pending GTINs (exclude failed ones to prevent automatic retry)
            stmt = select(MatinfoGTINUpdate.gtin).where(
                and_(
                    MatinfoGTINUpdate.sync_status == "pending",
                    MatinfoGTINUpdate.synced == False
                )
            ).limit(limit)

            result = await self.db.execute(stmt)
            pending_gtins = [row[0] for row in result.all()]

            logger.info(f"Found {len(pending_gtins)} pending GTINs to sync")

            # Process each GTIN
            for i, gtin in enumerate(pending_gtins, 1):
                logger.info(f"Processing {i}/{len(pending_gtins)}: {gtin}")

                try:
                    # Try to sync the product (without committing)
                    success = await self.sync_product(gtin, commit=False)

                    if success:
                        await self.update_gtin_status(gtin, "success")
                        success_count += 1
                    else:
                        # Product not found, mark as skipped
                        await self.update_gtin_status(gtin, "skipped", "Product not found in Matinfo")
                        skipped_count += 1

                except Exception as e:
                    error_msg = str(e)[:500]
                    logger.error(f"Failed to sync {gtin}: {e}")

                    # Rollback the failed transaction to clear the error state
                    await self.db.rollback()
                    logger.info(f"Rolled back failed transaction for {gtin}")

                    # Retry with individual fetch and sync
                    logger.info(f"Retrying {gtin} with individual processing...")
                    retry_success = False

                    # Need to start a new transaction for retry
                    await self.db.commit()  # Commit any pending status updates

                    try:
                        # Create a fresh session for retry
                        product_data = await self.fetch_product_details(gtin)
                        if product_data:
                            # Try sync again with fresh data
                            retry_success = await self.sync_product(gtin, commit=False)

                        if retry_success:
                            await self.update_gtin_status(gtin, "success")
                            success_count += 1
                            logger.info(f"Retry successful for {gtin}")
                        else:
                            await self.update_gtin_status(gtin, "skipped", "Product not found in Matinfo after retry")
                            skipped_count += 1
                            logger.info(f"Product not found after retry: {gtin}")

                    except Exception as retry_error:
                        retry_error_msg = str(retry_error)[:500]
                        logger.error(f"Retry also failed for {gtin}: {retry_error}")

                        # Rollback retry transaction if it failed
                        await self.db.rollback()

                        # Update status as failed after retry attempt
                        try:
                            await self.update_gtin_status(gtin, "failed", f"Initial: {error_msg[:200]} | Retry: {retry_error_msg[:200]}")
                            await self.db.flush()  # Ensure the status update is saved
                        except Exception as status_error:
                            logger.error(f"Failed to update status for {gtin}: {status_error}")

                        failed_count += 1

                # Commit every 50 records to avoid losing progress
                if i % 50 == 0:
                    logger.info(f"Committing batch at {i} products...")
                    try:
                        await self.db.commit()
                        logger.info(f"Batch committed successfully")
                    except Exception as commit_error:
                        logger.error(f"Failed to commit batch: {commit_error}")
                        await self.db.rollback()
                        # Continue processing

                # Add small delay to avoid overwhelming the API
                if i % 10 == 0:
                    await asyncio.sleep(1)

            # Commit any remaining products that weren't committed in a batch
            if len(pending_gtins) % 50 != 0:
                logger.info(f"Committing final batch...")
                await self.db.commit()
                logger.info(f"Final batch committed successfully")

            # Update sync log
            sync_log.end_date = datetime.now()
            sync_log.total_gtins = len(pending_gtins)
            sync_log.synced_count = success_count
            sync_log.failed_count = failed_count
            sync_log.status = "completed"

            # Commit the sync log update
            await self.db.commit()

            logger.info(
                f"Sync completed: {success_count} successful, "
                f"{failed_count} failed, {skipped_count} skipped"
            )

            return {
                "total": len(pending_gtins),
                "success": success_count,
                "failed": failed_count,
                "skipped": skipped_count
            }

        except Exception as e:
            logger.error(f"Product sync failed: {e}")
            raise  # Let FastAPI handle the rollback

    async def get_sync_progress(self) -> Dict:
        """Get current sync progress statistics."""
        # Total pending
        pending_stmt = select(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "pending"
        )
        pending_result = await self.db.execute(pending_stmt)
        pending_count = len(pending_result.all())

        # Total synced
        synced_stmt = select(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "success"
        )
        synced_result = await self.db.execute(synced_stmt)
        synced_count = len(synced_result.all())

        # Total failed
        failed_stmt = select(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "failed"
        )
        failed_result = await self.db.execute(failed_stmt)
        failed_count = len(failed_result.all())

        # Total skipped
        skipped_stmt = select(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "skipped"
        )
        skipped_result = await self.db.execute(skipped_stmt)
        skipped_count = len(skipped_result.all())

        total = pending_count + synced_count + failed_count + skipped_count

        return {
            "total": total,
            "pending": pending_count,
            "synced": synced_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "progress_percentage": round((synced_count / total * 100), 2) if total > 0 else 0
        }