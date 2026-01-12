"""API endpoints for hybrid product sync (Matinfo + VetDuAt)."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import logging

from app.api.deps import get_db
from app.services.hybrid_product_sync import HybridProductSyncService

logger = logging.getLogger(__name__)
router = APIRouter()


class HybridSyncRequest(BaseModel):
    """Request model for hybrid sync operations."""
    gtin: Optional[str] = None
    name: Optional[str] = None


class HybridSyncResponse(BaseModel):
    """Response model for hybrid sync operations."""
    success: bool
    message: str
    source: Optional[str] = None  # 'matinfo', 'vetduat', or None
    gtin: Optional[str] = None
    has_nutrients: bool = False
    warning: Optional[str] = None


class HybridSearchResponse(BaseModel):
    """Response for hybrid search (without syncing)."""
    query: str
    total: int
    matinfo_results: list
    vetduat_results: list


@router.post("/sync", response_model=HybridSyncResponse)
async def hybrid_sync_product(
    request: HybridSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync product with priority: Matinfo (pri 1) -> VetDuAt (pri 2).

    Automatically tries Matinfo first for full nutrition data.
    Falls back to VetDuAt if not found (allergens only, no nutrition).
    """
    if not request.gtin and not request.name:
        raise HTTPException(
            status_code=400,
            detail="Either GTIN or name must be provided"
        )

    try:
        async with HybridProductSyncService(db) as service:
            result = await service.search_and_sync(
                gtin=request.gtin,
                name=request.name
            )

            return HybridSyncResponse(**result)

    except Exception as e:
        logger.error(f"Error in hybrid sync: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=str(e) if str(e) else "Unknown error during hybrid sync"
        )


@router.get("/search/gtin/{gtin}")
async def hybrid_search_by_gtin(
    gtin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Search for product by GTIN in both Matinfo and VetDuAt.

    Returns availability from both sources without syncing.
    Useful for showing user which source has the product before syncing.
    """
    try:
        async with HybridProductSyncService(db) as service:
            result = await service.search_by_gtin(gtin)
            return result

    except Exception as e:
        logger.error(f"Error searching GTIN {gtin}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/name", response_model=HybridSearchResponse)
async def hybrid_search_by_name(
    name: str = Query(..., description="Product name to search for"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for products by name in both Matinfo and VetDuAt.

    Returns combined results with Matinfo results prioritized (priority 1).
    VetDuAt results shown as fallback (priority 2).
    """
    try:
        async with HybridProductSyncService(db) as service:
            result = await service.search_by_name(name, limit=limit)
            return HybridSearchResponse(**result)

    except Exception as e:
        logger.error(f"Error searching name '{name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/gtin/{gtin}")
async def get_product_status(
    gtin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive status of a product across all sources.

    Returns:
    - Whether product exists in database
    - Availability in Matinfo
    - Availability in VetDuAt
    - Recommendation on best action to take
    """
    try:
        async with HybridProductSyncService(db) as service:
            result = await service.get_product_status(gtin)
            return result

    except Exception as e:
        logger.error(f"Error getting status for GTIN {gtin}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
