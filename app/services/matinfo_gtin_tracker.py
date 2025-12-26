"""Service for tracking GTIN updates from Matinfo API with upsert support."""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, text
from sqlalchemy.dialects.postgresql import insert

from app.models.matinfo_updates import MatinfoGTINUpdate, MatinfoSyncLog
from app.core.config import settings

logger = logging.getLogger(__name__)


class MatinfoGTINTracker:
    """Service for tracking GTIN updates from Matinfo API."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = httpx.AsyncClient(timeout=30.0)
        self.base_url = settings.MATINFO_API_URL
        self.api_key = settings.MATINFO_API_KEY

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def fetch_and_store_updated_gtins(
        self,
        since_date: Optional[datetime] = None
    ) -> Dict[str, int]:
        """
        Fetch list of updated GTINs from Matinfo and store them in our tracking table.

        Args:
            since_date: Date to fetch updates from. Defaults to 7 days ago.

        Returns:
            Dictionary with statistics about the operation.
        """
        if since_date is None:
            since_date = datetime.now() - timedelta(days=7)

        # Create sync log entry
        sync_log = MatinfoSyncLog(
            sync_type="incremental",
            start_date=datetime.now(),
            since_date=since_date,
            status="running"
        )
        self.db.add(sync_log)
        await self.db.commit()

        try:
            # Format date for API (YYYY,MM,DD)
            date_str = since_date.strftime("%Y,%m,%d")
            url = f"{self.base_url}/updatedsince/{date_str}"

            response = await self.client.get(
                url,
                params={"api_key": self.api_key}
            )
            response.raise_for_status()

            data = response.json()
            products = data.get("products", [])

            logger.info(f"Fetched {len(products)} updated GTINs since {since_date}")

            # Process GTINs
            new_count = 0
            updated_count = 0

            # Collect valid GTINs
            valid_gtins = []
            for product in products:
                # Handle both string GTINs and dict with gtin key
                if isinstance(product, str):
                    gtin = product.strip()
                elif isinstance(product, dict):
                    raw_gtin = product.get("gtin", "")
                    # Clean the GTIN - remove spaces, tabs, and other whitespace
                    gtin = ''.join(raw_gtin.split()) if raw_gtin else ""
                else:
                    continue

                # Skip invalid GTINs (too short, too long, or invalid)
                if not gtin or gtin == "0" or len(gtin) < 8 or len(gtin) > 20:
                    continue

                valid_gtins.append(gtin)

            logger.info(f"Processing {len(valid_gtins)} valid GTINs in batches...")

            # Process GTINs in batches of 500
            batch_size = 500
            for batch_start in range(0, len(valid_gtins), batch_size):
                batch_end = min(batch_start + batch_size, len(valid_gtins))
                batch_gtins = valid_gtins[batch_start:batch_end]

                logger.info(f"Processing batch {batch_start//batch_size + 1}: GTINs {batch_start} to {batch_end}")

                # Check which GTINs already exist in this batch
                existing_stmt = select(MatinfoGTINUpdate.gtin).where(
                    MatinfoGTINUpdate.gtin.in_(batch_gtins)
                )
                existing_result = await self.db.execute(existing_stmt)
                existing_gtins = set(row[0] for row in existing_result.all())

                # Separate new and existing GTINs for this batch
                batch_new = [g for g in batch_gtins if g not in existing_gtins]
                batch_update = [g for g in batch_gtins if g in existing_gtins]

                # Insert new GTINs from this batch
                if batch_new:
                    insert_data = [
                        {
                            "gtin": gtin,
                            "update_date": datetime.now(),
                            "sync_date": datetime.now(),
                            "synced": False,
                            "sync_status": "pending"
                        }
                        for gtin in batch_new
                    ]

                    # Use ON CONFLICT to handle any race conditions
                    stmt = insert(MatinfoGTINUpdate).values(insert_data)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['gtin'],
                        set_={
                            'update_date': stmt.excluded.update_date,
                            'sync_date': stmt.excluded.sync_date,
                            'updated_at': datetime.now()
                        }
                    )
                    await self.db.execute(stmt)
                    new_count += len(batch_new)

                # Update existing GTINs in this batch
                if batch_update:
                    await self.db.execute(
                        text("""
                            UPDATE matinfo_gtin_updates
                            SET update_date = :update_date,
                                sync_date = :sync_date,
                                updated_at = :updated_at,
                                sync_status = CASE
                                    WHEN sync_status IN ('success', 'failed') THEN 'pending'
                                    ELSE sync_status
                                END,
                                synced = CASE
                                    WHEN sync_status IN ('success', 'failed') THEN FALSE
                                    ELSE synced
                                END
                            WHERE gtin = ANY(:gtins)
                        """),
                        {
                            "update_date": datetime.now(),
                            "sync_date": datetime.now(),
                            "updated_at": datetime.now(),
                            "gtins": batch_update
                        }
                    )
                    updated_count += len(batch_update)

                # Commit after each batch to avoid holding too much in memory
                await self.db.commit()

            logger.info(f"Completed processing all batches")

            # Update sync log
            sync_log.end_date = datetime.now()
            sync_log.total_gtins = len(valid_gtins)
            sync_log.status = "completed"
            sync_log.synced_count = new_count
            await self.db.commit()

            logger.info(f"Stored {new_count} new and {updated_count} updated GTIN records")

            return {
                "total": len(valid_gtins),
                "new": new_count,
                "updated": updated_count
            }

        except Exception as e:
            logger.error(f"Error fetching updated GTINs: {e}")

            # Rollback the current transaction first
            await self.db.rollback()

            # Now try to update the sync log with error in a new transaction
            try:
                sync_log.end_date = datetime.now()
                sync_log.status = "failed"
                error_msg = str(e)
                # Truncate error message if it's too long for the database column
                if len(error_msg) > 500:
                    error_msg = error_msg[:497] + "..."
                sync_log.error_message = error_msg
                self.db.add(sync_log)  # Re-add to session after rollback
                await self.db.commit()
            except Exception as log_error:
                logger.error(f"Failed to update sync log: {log_error}")
                await self.db.rollback()

            raise

    async def get_pending_gtins(self, limit: Optional[int] = None) -> List[str]:
        """
        Get list of GTINs that haven't been synced yet.

        Args:
            limit: Maximum number of GTINs to return.

        Returns:
            List of GTIN codes pending sync.
        """
        stmt = select(MatinfoGTINUpdate.gtin).where(
            and_(
                MatinfoGTINUpdate.synced == False,
                MatinfoGTINUpdate.sync_status.in_(["pending", None])
                # Note: Excludes "failed" status to prevent automatic retry
            )
        ).order_by(MatinfoGTINUpdate.update_date.desc())

        if limit:
            stmt = stmt.limit(limit)

        result = await self.db.execute(stmt)
        rows = result.all()
        return [row[0] for row in rows]

    async def mark_gtin_synced(self, gtin: str, success: bool = True, error_message: str = None):
        """
        Mark a GTIN as synced.

        Args:
            gtin: The GTIN code to mark.
            success: Whether the sync was successful.
            error_message: Error message if sync failed.
        """
        stmt = select(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.gtin == gtin
        ).order_by(MatinfoGTINUpdate.update_date.desc())

        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()

        if record:
            record.synced = success
            record.sync_status = "success" if success else "failed"
            if error_message:
                record.error_message = error_message
            await self.db.commit()

    async def get_sync_statistics(self) -> Dict:
        """
        Get statistics about GTIN synchronization.

        Returns:
            Dictionary with sync statistics.
        """
        # Total count
        total_stmt = select(func.count()).select_from(MatinfoGTINUpdate)
        total_result = await self.db.execute(total_stmt)
        total = total_result.scalar() or 0

        # Pending count
        pending_stmt = select(func.count()).select_from(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "pending"
        )
        pending_result = await self.db.execute(pending_stmt)
        pending = pending_result.scalar() or 0

        # Synced count
        synced_stmt = select(func.count()).select_from(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "success"
        )
        synced_result = await self.db.execute(synced_stmt)
        synced = synced_result.scalar() or 0

        # Failed count
        failed_stmt = select(func.count()).select_from(MatinfoGTINUpdate).where(
            MatinfoGTINUpdate.sync_status == "failed"
        )
        failed_result = await self.db.execute(failed_stmt)
        failed = failed_result.scalar() or 0

        # Get last sync log
        last_sync_stmt = select(MatinfoSyncLog).order_by(
            MatinfoSyncLog.created_at.desc()
        ).limit(1)
        last_sync_result = await self.db.execute(last_sync_stmt)
        last_sync = last_sync_result.scalar_one_or_none()

        return {
            "total_gtins": total,
            "pending": pending,
            "synced": synced,
            "failed": failed,
            "last_sync": last_sync.created_at.isoformat() if last_sync else None,
            "last_sync_status": last_sync.status if last_sync else None
        }

    async def get_recent_updates(self, limit: int = 100) -> List[Dict]:
        """
        Get recently updated GTINs.

        Args:
            limit: Maximum number of records to return.

        Returns:
            List of recent GTIN updates.
        """
        stmt = select(MatinfoGTINUpdate).order_by(
            MatinfoGTINUpdate.update_date.desc()
        ).limit(limit)

        result = await self.db.execute(stmt)
        records = result.scalars().all()

        return [
            {
                "gtin": r.gtin,
                "update_date": r.update_date.isoformat() if r.update_date else None,
                "sync_status": r.sync_status,
                "synced": r.synced
            }
            for r in records
        ]