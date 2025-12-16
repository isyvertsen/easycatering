"""API endpoints for Ngdata product synchronization (Meny/REITAN stores)."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.infrastructure.database.session import get_db
from app.services.ngdata_sync import NgdataSyncService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class NgdataSyncRequest(BaseModel):
    """Request model for Ngdata sync operations."""
    gtin: Optional[str] = None
    name: Optional[str] = None


class NgdataSyncResponse(BaseModel):
    """Response model for Ngdata sync operations."""
    success: bool
    message: str
    gtin: Optional[str] = None
    product_name: Optional[str] = None


class ProductMatch(BaseModel):
    """Model for a product search match."""
    gtin: str
    name: str
    brandname: Optional[str] = None
    packagesize: Optional[str] = None
    price: Optional[float] = None
    in_stock: bool = False
    matched_variation: str


class ProductSearchResponse(BaseModel):
    """Response model for product name search."""
    success: bool
    query: str
    total_matches: int
    matches: List[ProductMatch]
    message: Optional[str] = None


@router.post("/sync/product", response_model=NgdataSyncResponse)
async def sync_product(
    request: NgdataSyncRequest,
    db: Session = Depends(get_db)
):
    """
    Sync a product from Ngdata API by GTIN or name.

    First tries to search by GTIN if provided, then falls back to name search.
    The response is automatically converted to Matinfo format and saved to the database.
    """
    if not request.gtin and not request.name:
        raise HTTPException(
            status_code=400,
            detail="Either GTIN or name must be provided"
        )

    try:
        async with NgdataSyncService(db) as service:
            success = await service.sync_product(gtin=request.gtin, name=request.name)

            if success:
                return NgdataSyncResponse(
                    success=True,
                    message=f"Successfully synced product from Ngdata",
                    gtin=request.gtin,
                    product_name=request.name
                )
            else:
                return NgdataSyncResponse(
                    success=False,
                    message=f"Product not found in Ngdata",
                    gtin=request.gtin,
                    product_name=request.name
                )
    except Exception as e:
        logger.error(f"Error syncing product from Ngdata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e) if str(e) else "Unknown error during Ngdata sync")


@router.post("/search/gtin/{gtin}")
async def search_by_gtin(
    gtin: str,
    db: Session = Depends(get_db)
):
    """
    Search for a product in Ngdata by GTIN/EAN.

    Returns the product data without saving to database.
    """
    try:
        async with NgdataSyncService(db) as service:
            product_data = await service.search_by_gtin(gtin)

            if product_data:
                return {
                    "found": True,
                    "product": product_data
                }
            else:
                return {
                    "found": False,
                    "message": f"Product with GTIN {gtin} not found in Ngdata"
                }
    except Exception as e:
        logger.error(f"Error searching Ngdata for GTIN {gtin}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/name")
async def search_by_name(
    name: str = Query(..., description="Product name to search for"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Search for products in Ngdata by name.

    Returns all matching products with metadata without saving to database.
    """
    try:
        async with NgdataSyncService(db) as service:
            result = await service.search_by_name_multi(name, limit=limit)

            if result:
                return {
                    "found": True,
                    "query": name,
                    "total_count": result["count"],
                    "returned_count": len(result["products"]),
                    "products": result["products"]
                }
            else:
                return {
                    "found": False,
                    "message": f"No products with name '{name}' found in Ngdata"
                }
    except Exception as e:
        logger.error(f"Error searching Ngdata for name {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/name-with-variations", response_model=ProductSearchResponse)
async def search_by_name_with_variations(
    name: str = Query(..., description="Product name to search for"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Search for products by name in Ngdata with AI-powered name variations.

    Similar to Matinfo and VetDuAt search, this endpoint:
    - Uses AI to generate product name variations
    - Searches Ngdata for each variation
    - Returns multiple matches
    - Does NOT sync to database (just returns search results)

    Use this for showing user a list of matches to choose from before syncing.
    """
    try:
        async with NgdataSyncService(db) as service:
            # Use the name_cleaner to generate variations
            name_variations = await service.name_cleaner.clean_product_name(name)
            logger.info(f"Generated {len(name_variations)} variations for '{name}'")

            matches = []
            seen_gtins = set()

            # Try each variation until we have enough matches
            for variation in name_variations:
                if len(matches) >= limit:
                    break

                logger.info(f"Searching Ngdata for variation: '{variation}'")

                # Search Ngdata API
                result = await service.search_by_name_multi(variation, limit=limit)

                if result:
                    products = result.get("products", [])

                    for product in products:
                        gtin = product.get("ean")
                        if gtin and gtin not in seen_gtins:
                            seen_gtins.add(gtin)

                            matches.append(ProductMatch(
                                gtin=gtin,
                                name=product.get("title", ""),
                                brandname=product.get("brand"),
                                packagesize=product.get("description", ""),
                                price=product.get("pricePerUnit"),
                                in_stock=not product.get("isOutOfStock", False),
                                matched_variation=variation
                            ))

                            if len(matches) >= limit:
                                break

            if not matches:
                return ProductSearchResponse(
                    success=False,
                    query=name,
                    total_matches=0,
                    matches=[],
                    message=f"No products found matching '{name}'"
                )

            return ProductSearchResponse(
                success=True,
                query=name,
                total_matches=len(matches),
                matches=matches,
                message=f"Found {len(matches)} matches for '{name}'"
            )

    except Exception as e:
        logger.error(f"Error searching Ngdata for name {name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e) if str(e) else "Unknown error during Ngdata search")
