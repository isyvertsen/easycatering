"""Varebok product matching API endpoints."""
import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.services.varebok_matcher import VarebokMatcherService, parse_varebok_csv
from app.schemas.varebok import (
    VarebokStats,
    RecipeProductWithMatches,
    MatchResult,
    MatchApplyRequest,
    MatchApplyResponse,
    VarebokProduct,
    UploadedFileInfo,
)

router = APIRouter()

# In-memory storage for uploaded supplier files
_uploaded_files: dict[str, List[VarebokProduct]] = {}


@router.post("/upload")
async def upload_supplier_file(
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(...),
    supplier_name: str = Form(..., description="Name of the supplier (e.g., 'VOIS', 'ASKO')"),
):
    """
    Upload a supplier product file (CSV format).

    The file should be semicolon-separated with columns for:
    - EAN codes (D-pakn and/or F-pakn)
    - Varenummer (product number)
    - Varenavn (product name)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")

    try:
        # Read file content
        content = await file.read()

        # Try different encodings
        for encoding in ['cp1252', 'utf-8', 'iso-8859-1']:
            try:
                text_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Could not decode file. Try UTF-8 or Windows-1252 encoding.")

        # Parse the CSV
        products = parse_varebok_csv(text_content)

        if not products:
            raise HTTPException(status_code=400, detail="No products found in file")

        # Store in memory
        _uploaded_files[supplier_name] = products

        return {
            "success": True,
            "supplier": supplier_name,
            "products_count": len(products),
            "filename": file.filename,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


@router.get("/suppliers", response_model=List[UploadedFileInfo])
async def get_uploaded_suppliers(
    current_user: User = Depends(get_current_user),
):
    """Get list of uploaded supplier files."""
    return [
        UploadedFileInfo(supplier_name=name, products_count=len(products))
        for name, products in _uploaded_files.items()
    ]


@router.delete("/suppliers/{supplier_name}")
async def delete_supplier_file(
    supplier_name: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an uploaded supplier file."""
    if supplier_name not in _uploaded_files:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_name} not found")

    del _uploaded_files[supplier_name]
    return {"success": True, "message": f"Supplier {supplier_name} deleted"}


def get_all_supplier_products() -> List[VarebokProduct]:
    """Get all products from all uploaded suppliers."""
    all_products = []
    for products in _uploaded_files.values():
        all_products.extend(products)
    return all_products


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
