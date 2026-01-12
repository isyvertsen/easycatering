"""API endpoints for Matinfo product synchronization."""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.infrastructure.database.session import get_db
from app.services.matinfo_sync import MatinfoSyncService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class SyncResponse(BaseModel):
    """Response model for sync operations."""
    message: str
    total: int
    synced: int
    failed: int


class GTINListResponse(BaseModel):
    """Response model for GTIN list operations."""
    count: int
    gtins: list[str]
    since_date: str


class ProductMatch(BaseModel):
    """Model for a product search match."""
    gtin: str
    name: str
    brandname: Optional[str] = None
    producername: Optional[str] = None
    packagesize: Optional[str] = None
    similarity: float
    matched_variation: str


class ProductSearchResponse(BaseModel):
    """Response model for product name search."""
    success: bool
    query: str
    total_matches: int
    matches: List[ProductMatch]
    message: Optional[str] = None


@router.post("/sync/products", response_model=SyncResponse)
async def sync_products(
    background_tasks: BackgroundTasks,
    days_back: int = Query(7, description="Number of days to look back for updates"),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger synchronization of products from Matinfo API.

    This will fetch all products updated in the last X days and update our database.
    """
    since_date = datetime.now() - timedelta(days=days_back)

    async def run_sync():
        async with MatinfoSyncService(db) as service:
            results = await service.sync_updated_products(since_date)
            logger.info(f"Sync completed: {results}")
            return results

    try:
        # Run sync immediately (not in background for now)
        results = await run_sync()

        return SyncResponse(
            message=f"Successfully synced products updated since {since_date.strftime('%Y-%m-%d')}",
            total=results["total"],
            synced=results["synced"],
            failed=results["failed"]
        )
    except Exception as e:
        logger.error(f"Error during product sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/updated-gtins", response_model=GTINListResponse)
async def get_updated_gtins(
    days_back: int = Query(7, description="Number of days to look back for updates"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of GTINs that have been updated in Matinfo.

    This endpoint only fetches the list without syncing the actual product data.
    """
    since_date = datetime.now() - timedelta(days=days_back)

    try:
        async with MatinfoSyncService(db) as service:
            gtins = await service.fetch_updated_gtins(since_date)

            return GTINListResponse(
                count=len(gtins),
                gtins=gtins,
                since_date=since_date.strftime("%Y-%m-%d")
            )
    except Exception as e:
        logger.error(f"Error fetching updated GTINs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/new-products", response_model=GTINListResponse)
async def get_new_products(
    days_back: int = Query(30, description="Number of days to look back for updates"),
    db: AsyncSession = Depends(get_db)
):
    """
    Identify products that exist in Matinfo but not in our database.
    """
    since_date = datetime.now() - timedelta(days=days_back)

    try:
        async with MatinfoSyncService(db) as service:
            new_gtins = await service.identify_new_products(since_date)

            return GTINListResponse(
                count=len(new_gtins),
                gtins=new_gtins,
                since_date=since_date.strftime("%Y-%m-%d")
            )
    except Exception as e:
        logger.error(f"Error identifying new products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/product/{gtin}")
async def sync_single_product(
    gtin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync a single product by GTIN.
    """
    try:
        async with MatinfoSyncService(db) as service:
            success = await service.sync_product(gtin)

            if success:
                return {
                    "message": f"Successfully synced product with GTIN: {gtin}",
                    "gtin": gtin
                }
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product with GTIN {gtin} not found or could not be synced"
                )
    except Exception as e:
        logger.error(f"Error syncing product {gtin}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/name", response_model=ProductSearchResponse)
async def search_by_name(
    name: str = Query(..., description="Product name to search for"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for products by name in matinfo_products table.

    Uses AI to generate name variations and similarity scoring to rank results.
    Returns multiple matches if found, ordered by relevance.

    Example:
        - Search for "Egg" might return multiple egg products ranked by similarity
        - Search for "LAKSELOINS FR U SB BRB" will try variations like "LAKSELOINS", "LAKS"
    """
    try:
        async with MatinfoSyncService(db) as service:
            matches = await service.search_by_name(name, limit=limit)

            if not matches:
                return ProductSearchResponse(
                    success=False,
                    query=name,
                    total_matches=0,
                    matches=[],
                    message=f"No products found matching '{name}'"
                )

            # Convert to response format
            product_matches = [
                ProductMatch(
                    gtin=match["product"].gtin,
                    name=match["product"].name or "",
                    brandname=match["product"].brandname,
                    producername=match["product"].producername,
                    packagesize=match["product"].packagesize,
                    similarity=match["similarity"],
                    matched_variation=match["matched_variation"]
                )
                for match in matches
            ]

            return ProductSearchResponse(
                success=True,
                query=name,
                total_matches=len(product_matches),
                matches=product_matches,
                message=f"Found {len(product_matches)} matches for '{name}'"
            )

    except Exception as e:
        logger.error(f"Error searching for product name '{name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))