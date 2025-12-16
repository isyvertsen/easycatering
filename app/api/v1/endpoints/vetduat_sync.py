"""API endpoints for VetDuAt product synchronization."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.infrastructure.database.session import get_db
from app.services.vetduat_sync import VetDuAtSyncService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class VetDuAtSyncRequest(BaseModel):
    """Request model for VetDuAt sync operations."""
    gtin: Optional[str] = None
    name: Optional[str] = None


class VetDuAtSyncResponse(BaseModel):
    """Response model for VetDuAt sync operations."""
    success: bool
    message: str
    gtin: Optional[str] = None
    product_name: Optional[str] = None


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


@router.post("/sync/product", response_model=VetDuAtSyncResponse)
async def sync_product(
    request: VetDuAtSyncRequest,
    db: Session = Depends(get_db)
):
    """
    Sync a product from VetDuAt API by GTIN or name.

    First tries to search by GTIN if provided, then falls back to name search.
    The response is automatically converted to Matinfo format and saved to the database.
    """
    if not request.gtin and not request.name:
        raise HTTPException(
            status_code=400,
            detail="Either GTIN or name must be provided"
        )

    try:
        async with VetDuAtSyncService(db) as service:
            success = await service.sync_product(gtin=request.gtin, name=request.name)

            if success:
                return VetDuAtSyncResponse(
                    success=True,
                    message=f"Successfully synced product from VetDuAt",
                    gtin=request.gtin,
                    product_name=request.name
                )
            else:
                return VetDuAtSyncResponse(
                    success=False,
                    message=f"Product not found in VetDuAt",
                    gtin=request.gtin,
                    product_name=request.name
                )
    except Exception as e:
        logger.error(f"Error syncing product from VetDuAt: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e) if str(e) else "Unknown error during VetDuAt sync")


@router.post("/search/gtin/{gtin}")
async def search_by_gtin(
    gtin: str,
    db: Session = Depends(get_db)
):
    """
    Search for a product in VetDuAt by GTIN.

    Returns the product data without saving to database.
    """
    try:
        async with VetDuAtSyncService(db) as service:
            product_data = await service.search_by_gtin(gtin)

            if product_data:
                return {
                    "found": True,
                    "product": product_data
                }
            else:
                return {
                    "found": False,
                    "message": f"Product with GTIN {gtin} not found in VetDuAt"
                }
    except Exception as e:
        logger.error(f"Error searching VetDuAt for GTIN {gtin}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/name")
async def search_by_name(
    name: str = Query(..., description="Product name to search for"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Search for products in VetDuAt by name.

    Returns all matching products with facets and metadata without saving to database.
    """
    try:
        async with VetDuAtSyncService(db) as service:
            result = await service.search_by_name_multi(name, limit=limit)

            if result:
                return {
                    "found": True,
                    "query": name,
                    "total_count": result["count"],
                    "returned_count": len(result["products"]),
                    "products": result["products"],
                    "facets": result["facets"],
                    "searchMetadata": result["searchMetadata"]
                }
            else:
                return {
                    "found": False,
                    "message": f"No products with name '{name}' found in VetDuAt"
                }
    except Exception as e:
        logger.error(f"Error searching VetDuAt for name {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/name-with-variations", response_model=ProductSearchResponse)
async def search_by_name_with_variations(
    name: str = Query(..., description="Product name to search for"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Search for products by name in VetDuAt with AI-powered name variations.

    Similar to Matinfo search, this endpoint:
    - Uses AI to generate product name variations
    - Searches VetDuAt for each variation
    - Returns multiple matches with similarity scores
    - Does NOT sync to database (just returns search results)

    Use this for showing user a list of matches to choose from before syncing.
    """
    try:
        async with VetDuAtSyncService(db) as service:
            # Use the name_cleaner to generate variations
            name_variations = await service.name_cleaner.clean_product_name(name)
            logger.info(f"Generated {len(name_variations)} variations for '{name}'")

            matches = []
            seen_gtins = set()

            # Try each variation until we have enough matches
            for variation in name_variations:
                if len(matches) >= limit:
                    break

                logger.info(f"Searching VetDuAt for variation: '{variation}'")

                # Search VetDuAt API
                search_response = await service.client.post(
                    f"{service.base_url}/search",
                    json={
                        "facets": [
                            "Produksjonsland,count:10,sort:count",
                            "AllergenerInneholder,count:50,sort:count",
                            "AllergenerInneholderIkke,count:50,sort:count",
                            "AllergenerKanInneholde,count:50,sort:count",
                            "KategoriNavn,count:10,sort:count",
                            "Varemerke,count:10,sort:count",
                            "Varegruppenavn,count:10,sort:count",
                            "FirmaNavn,count:10,sort:count",
                            "MerkeOrdninger,count:10,sort:count",
                            "ErStorhusholdningsprodukt,count:10,sort:count"
                        ],
                        "top": limit,
                        "skip": 0,
                        "count": True,
                        "number": 0,
                        "search": variation
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Origin": "https://vetduat.no"
                    }
                )

                if search_response.status_code == 200:
                    data = search_response.json()
                    products = data.get("products", [])
                    facets = data.get("facets", {})

                    for product in products:
                        gtin = product.get("gtin")
                        if gtin and gtin not in seen_gtins:
                            seen_gtins.add(gtin)

                            # Extract brand name from facets
                            brandname = ""
                            if facets and "Varemerke" in facets:
                                brand_facets = facets["Varemerke"].get("facets", [])
                                if brand_facets:
                                    brandname = brand_facets[0].get("value", "")

                            # Calculate similarity (simple approach: 1.0 if exact match, 0.8 otherwise)
                            similarity = 1.0 if variation.lower() == name.lower() else 0.8

                            matches.append(ProductMatch(
                                gtin=gtin,
                                name=product.get("fellesProduktnavn", ""),
                                brandname=brandname,
                                producername=product.get("firmaNavn"),
                                packagesize=f"{product.get('mengde', '')} {product.get('mengdetypeenhet', '')}".strip(),
                                similarity=similarity,
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

            # Sort by similarity
            matches.sort(key=lambda x: x.similarity, reverse=True)

            return ProductSearchResponse(
                success=True,
                query=name,
                total_matches=len(matches),
                matches=matches,
                message=f"Found {len(matches)} matches for '{name}'"
            )

    except Exception as e:
        logger.error(f"Error searching VetDuAt for name {name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e) if str(e) else "Unknown error during VetDuAt search")
