"""API endpoints for Matinfo GTIN tracking and product sync."""
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.infrastructure.database.session import get_db
from app.services.matinfo_gtin_tracker import MatinfoGTINTracker
from app.services.matinfo_product_sync import MatinfoProductSync
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class GTINTrackingResponse(BaseModel):
    """Response model for GTIN tracking operations."""
    message: str
    total: int
    new: int
    updated: int


class GTINStatistics(BaseModel):
    """Statistics about GTIN synchronization."""
    total_gtins: int
    pending: int
    synced: int
    failed: int
    last_sync: Optional[str]
    last_sync_status: Optional[str]


class GTINRecord(BaseModel):
    """GTIN record model."""
    gtin: str
    update_date: Optional[str]
    sync_status: Optional[str]
    synced: bool


@router.post("/tracker/fetch-updates", response_model=GTINTrackingResponse)
async def fetch_gtin_updates(
    days_back: int = Query(7, description="Number of days to look back for updates"),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch updated GTINs from Matinfo and store them in tracking table.

    This only stores the GTIN codes, not the full product data.
    """
    since_date = datetime.now() - timedelta(days=days_back)

    try:
        async with MatinfoGTINTracker(db) as tracker:
            results = await tracker.fetch_and_store_updated_gtins(since_date)

            return GTINTrackingResponse(
                message=f"Successfully fetched GTIN updates since {since_date.strftime('%Y-%m-%d')}",
                total=results["total"],
                new=results["new"],
                updated=results["updated"]
            )
    except Exception as e:
        logger.error(f"Error fetching GTIN updates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tracker/pending", response_model=List[str])
async def get_pending_gtins(
    limit: int = Query(100, description="Maximum number of GTINs to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of GTINs that are pending synchronization.
    """
    try:
        async with MatinfoGTINTracker(db) as tracker:
            gtins = await tracker.get_pending_gtins(limit)
            return gtins
    except Exception as e:
        logger.error(f"Error getting pending GTINs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tracker/statistics", response_model=GTINStatistics)
async def get_sync_statistics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about GTIN synchronization.
    """
    try:
        async with MatinfoGTINTracker(db) as tracker:
            stats = await tracker.get_sync_statistics()
            return GTINStatistics(**stats)
    except Exception as e:
        logger.error(f"Error getting sync statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tracker/recent", response_model=List[GTINRecord])
async def get_recent_updates(
    limit: int = Query(100, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recently updated GTINs with their details.
    """
    try:
        async with MatinfoGTINTracker(db) as tracker:
            records = await tracker.get_recent_updates(limit)
            return [GTINRecord(**r) for r in records]
    except Exception as e:
        logger.error(f"Error getting recent updates: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@router.post("/tracker/mark-synced/{gtin}")
async def mark_gtin_synced(
    gtin: str,
    success: bool = Query(True, description="Whether the sync was successful"),
    error_message: Optional[str] = Query(None, description="Error message if sync failed"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a GTIN as synced.
    """
    try:
        async with MatinfoGTINTracker(db) as tracker:
            await tracker.mark_gtin_synced(gtin, success, error_message)
            return {
                "message": f"GTIN {gtin} marked as {'synced' if success else 'failed'}",
                "gtin": gtin,
                "status": "success" if success else "failed"
            }
    except Exception as e:
        logger.error(f"Error marking GTIN as synced: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Product sync endpoints

class ProductSyncRequest(BaseModel):
    """Request model for product sync."""
    limit: int = 100


class ProductSyncResponse(BaseModel):
    """Response model for product sync."""
    message: str
    total: int
    success: int
    failed: int
    skipped: int


@router.post("/sync/products", response_model=ProductSyncResponse)
async def sync_products(
    request: ProductSyncRequest
) -> ProductSyncResponse:
    """
    Sync product details from Matinfo for pending GTINs.

    This will fetch full product information including nutrients and allergens.

    Note: Due to complex async session management, this runs as a subprocess.
    """
    import subprocess
    import json
    import os

    try:
        # Run sync via CLI script
        script_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "sync_matinfo_products.py"
        )

        # Execute the sync script
        result = subprocess.run(
            ["uv", "run", "python", script_path, "--limit", str(request.limit)],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(script_path)
        )

        if result.returncode != 0:
            logger.error(f"Sync process failed: {result.stderr}")

            # Try to extract error details
            if "Successful: " in result.stdout:
                # Parse the results from the log output
                lines = result.stdout.split('\n')
                total = 0
                success = 0
                failed = 0
                skipped = 0

                for line in lines:
                    if "Total processed:" in line:
                        total = int(line.split(":")[1].strip())
                    elif "Successful:" in line:
                        success = int(line.split(":")[1].strip())
                    elif "Failed:" in line:
                        failed = int(line.split(":")[1].strip())
                    elif "Skipped:" in line:
                        skipped = int(line.split(":")[1].strip())

                if total > 0:
                    return ProductSyncResponse(
                        message=f"Product sync completed with errors for {total} GTINs",
                        total=total,
                        success=success,
                        failed=failed,
                        skipped=skipped
                    )

            raise HTTPException(status_code=500, detail="Product sync failed")

        # Parse the log output to get results
        lines = result.stdout.split('\n')
        total = 0
        success = 0
        failed = 0
        skipped = 0

        for line in lines:
            if "Total processed:" in line:
                total = int(line.split(":")[1].strip())
            elif "Successful:" in line:
                success = int(line.split(":")[1].strip())
            elif "Failed:" in line:
                failed = int(line.split(":")[1].strip())
            elif "Skipped:" in line:
                skipped = int(line.split(":")[1].strip())

        return ProductSyncResponse(
            message=f"Product sync completed for {total} GTINs",
            total=total,
            success=success,
            failed=failed,
            skipped=skipped
        )
    except Exception as e:
        logger.error(f"Product sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/progress", response_model=Dict)
async def get_sync_progress(
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """Get current product sync progress."""
    sync_service = MatinfoProductSync(db)
    try:
        return await sync_service.get_sync_progress()
    except Exception as e:
        logger.error(f"Failed to get sync progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/product/{gtin}")
async def sync_single_product(
    gtin: str,
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """Sync a single product by GTIN."""
    sync_service = MatinfoProductSync(db)
    try:
        success = await sync_service.sync_product(gtin, commit=False)

        if success:
            return {
                "message": f"Successfully synced product {gtin}",
                "success": True
            }
        else:
            return {
                "message": f"Product {gtin} not found or sync failed",
                "success": False
            }
    except Exception as e:
        logger.error(f"Failed to sync product {gtin}: {e}")
        raise HTTPException(status_code=500, detail=str(e))