"""Varebok product matching API endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.services.varebok_matcher import VarebokMatcherService
from app.schemas.varebok import (
    VarebokStats,
    RecipeProductWithMatches,
    MatchResult,
    MatchApplyRequest,
    MatchApplyResponse,
)

router = APIRouter()


@router.get("/status", response_model=VarebokStats)
async def get_varebok_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get statistics about Varebok product matching.

    Returns counts of:
    - Products used in recipes
    - Products with exact matches
    - Products with partial/fuzzy matches
    - Products without any match
    """
    service = VarebokMatcherService(db)
    return await service.get_stats()


@router.get("/recipe-products", response_model=List[RecipeProductWithMatches])
async def get_recipe_products(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000, description="Number of products to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Get products used in recipes with match suggestions.

    Returns products sorted by recipe count (most used first),
    with match suggestions from Varebok CSV.
    """
    service = VarebokMatcherService(db)
    return await service.get_recipe_products_with_matches(limit=limit, offset=offset)


@router.get("/matches/{produktid}", response_model=List[MatchResult])
async def get_product_matches(
    produktid: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of matches to return"),
):
    """
    Get match suggestions for a specific product.

    Returns up to `limit` match suggestions from Varebok CSV,
    sorted by confidence (best match first).
    """
    service = VarebokMatcherService(db)

    # Get the product
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT produktid, produktnavn, ean_kode, leverandorsproduktnr FROM tblprodukter WHERE produktid = :pid"),
        {"pid": produktid}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Product {produktid} not found")

    from app.schemas.varebok import RecipeProduct
    product = RecipeProduct(
        produktid=row.produktid,
        produktnavn=row.produktnavn,
        ean_kode=row.ean_kode,
        leverandorsproduktnr=row.leverandorsproduktnr,
        recipe_count=0,  # Not relevant for single product lookup
    )

    return service.find_matches(product, limit=limit)


@router.post("/apply-match", response_model=MatchApplyResponse)
async def apply_match(
    request: MatchApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Apply a match by updating the product with Varebok data.

    Updates the following fields (based on request flags):
    - ean_kode: EAN code from Varebok
    - produktnavn: Product name from Varebok
    - leverandorsproduktnr: Varenummer from Varebok
    """
    service = VarebokMatcherService(db)

    success, changes, message = await service.apply_match(
        produktid=request.produktid,
        varebok_varenummer=request.varebok_varenummer,
        update_ean=request.update_ean,
        update_name=request.update_name,
        update_leverandorsproduktnr=request.update_leverandorsproduktnr,
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return MatchApplyResponse(
        success=True,
        produktid=request.produktid,
        changes_applied=changes,
        message=message,
    )
