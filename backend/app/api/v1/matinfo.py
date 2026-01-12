"""API endpoints for product information with allergens and nutrients - Full CRUD."""
import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.matinfo_products import MatinfoProduct as ProductDetail, MatinfoAllergen, MatinfoNutrient
from app.models.produkter import Produkter
from app.core.gtin_utils import normalize_gtin
from app.schemas.matinfo import (
    ProductDetailResponse,
    ProductListResponse,
    ProductCreate,
    ProductUpdate,
    AllergenResponse,
    NutrientResponse,
    MarkingResponse,
    AllergenCreate,
    NutrientCreate,
    VendorProductImport,
    VendorImportResponse,
    ProductExportRequest,
    ProductExportResponse
)
from app.services.product_export import ProductExporter
from app.services.product_search import ProductSearchService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def map_allergen_level(level: Optional[int]) -> str:
    """Map allergen level integer to string.

    Database allergen levels (from actual data):
    0 = FREE_FROM (explicitly free from)
    1 = CROSS_CONTAMINATION (may contain traces / produced in same facility)
    2 = MAY_CONTAIN (may contain)
    3 = CONTAINS (contains)
    """
    level_map = {
        0: "FREE_FROM",
        1: "CROSS_CONTAMINATION",
        2: "MAY_CONTAIN",
        3: "CONTAINS"
    }
    return level_map.get(level, "UNKNOWN")


def map_allergen_level_to_int(level: str) -> int:
    """Map allergen level string to integer.

    Database allergen levels (from actual data):
    0 = FREE_FROM (explicitly free from)
    1 = CROSS_CONTAMINATION (may contain traces / produced in same facility)
    2 = MAY_CONTAIN (may contain)
    3 = CONTAINS (contains)
    """
    level_map = {
        "FREE_FROM": 0,
        "CROSS_CONTAMINATION": 1,
        "MAY_CONTAIN": 2,
        "CONTAINS": 3
    }
    return level_map.get(level.upper(), 0)


async def get_product_response(product: ProductDetail) -> ProductDetailResponse:
    """Convert product model to response schema."""
    # Parse markings if stored as JSON string
    markings = []
    if product.markings:
        try:
            markings_data = json.loads(product.markings)
            if isinstance(markings_data, list):
                markings = [MarkingResponse(**m) for m in markings_data]
        except (json.JSONDecodeError, TypeError):
            pass
    
    # Parse images if stored as JSON string
    images = []
    if product.images:
        try:
            images_data = json.loads(product.images)
            if isinstance(images_data, list):
                images = images_data
        except (json.JSONDecodeError, TypeError):
            # If not JSON, try splitting by comma
            images = [img.strip() for img in product.images.split(',') if img.strip()]
    
    # Convert allergens
    allergens = [
        AllergenResponse(
            code=allergen.code,
            level=map_allergen_level(allergen.level),
            name=allergen.name or ""
        )
        for allergen in product.allergens
    ]
    
    # Convert nutrients
    nutrients = [
        NutrientResponse(
            code=nutrient.code,
            measurement=float(nutrient.measurement) if nutrient.measurement else 0,
            measurementPrecision=nutrient.measurementprecision or "APPROXIMATELY",
            measurementType=nutrient.measurementtype or "",
            name=nutrient.name or ""
        )
        for nutrient in product.nutrients
    ]
    
    # Build response
    return ProductDetailResponse(
        id=product.id,
        gtin=str(product.gtin) if product.gtin else "",  # Keep as string to preserve leading zeros
        name=product.name or "",
        itemNumber=int(product.itemnumber) if product.itemnumber and product.itemnumber.isdigit() else None,
        epdNumber=int(product.epdnumber) if product.epdnumber and product.epdnumber.isdigit() else None,
        producerName=product.producername,
        providerName=product.providername,
        brandName=product.brandname,
        ingredientStatement=product.ingredientstatement,
        productUrl=product.producturl,
        markings=markings,
        images=images,
        packageSize=product.packagesize,
        nutrients=nutrients,
        allergens=allergens,
        gpc=None,
        preparations=None,
        storageInfo=None
    )


@router.post("/products", response_model=ProductDetailResponse)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new product with allergens and nutrients.
    """
    # Generate ID if not provided
    product_id = product_data.id or str(uuid.uuid4())
    
    # Check if product with this GTIN already exists
    existing = await db.execute(
        select(ProductDetail).where(ProductDetail.gtin == product_data.gtin)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Product with GTIN {product_data.gtin} already exists")
    
    # Create product
    product = ProductDetail(
        id=product_id,
        gtin=product_data.gtin,
        name=product_data.name,
        itemnumber=product_data.itemNumber,
        epdnumber=product_data.epdNumber,
        producername=product_data.producerName,
        providername=product_data.providerName,
        brandname=product_data.brandName,
        ingredientstatement=product_data.ingredientStatement,
        producturl=product_data.productUrl,
        packagesize=product_data.packageSize,
        markings=json.dumps([m.dict() for m in product_data.markings]) if product_data.markings else None,
        images=json.dumps(product_data.images) if product_data.images else None
    )
    
    db.add(product)
    await db.flush()
    
    # Add allergens
    for idx, allergen_data in enumerate(product_data.allergens):
        allergen = Allergen(
            allergenid=idx + 1,
            productid=product_id,
            code=allergen_data.code,
            level=map_allergen_level_to_int(allergen_data.level),
            name=allergen_data.name
        )
        db.add(allergen)
    
    # Add nutrients
    for idx, nutrient_data in enumerate(product_data.nutrients):
        nutrient = Nutrient(
            nutrientid=idx + 1,
            productid=product_id,
            code=nutrient_data.code,
            measurement=nutrient_data.measurement,
            measurementprecision=nutrient_data.measurementPrecision,
            measurementtype=nutrient_data.measurementType,
            name=nutrient_data.name
        )
        db.add(nutrient)
    
    await db.commit()
    
    # Refresh and load relationships
    await db.refresh(product)
    stmt = (
        select(ProductDetail)
        .options(
            selectinload(ProductDetail.allergens),
            selectinload(ProductDetail.nutrients)
        )
        .where(ProductDetail.id == product_id)
    )
    result = await db.execute(stmt)
    product = result.scalar_one()
    
    return await get_product_response(product)


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all products with pagination and optional search.
    """
    # Base query
    query = select(ProductDetail).options(
        selectinload(ProductDetail.allergens),
        selectinload(ProductDetail.nutrients)
    )
    
    # Add search filter if provided
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (ProductDetail.name.ilike(search_filter)) |
            (ProductDetail.gtin.ilike(search_filter)) |
            (ProductDetail.brandname.ilike(search_filter))
        )
    
    # Get total count
    count_query = select(func.count()).select_from(ProductDetail)
    if search:
        count_query = count_query.where(
            (ProductDetail.name.ilike(search_filter)) |
            (ProductDetail.gtin.ilike(search_filter)) |
            (ProductDetail.brandname.ilike(search_filter))
        )
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    
    # Execute query
    result = await db.execute(query)
    products = result.scalars().all()
    
    # Convert to response
    items = []
    for product in products:
        items.append(await get_product_response(product))
    
    return ProductListResponse(
        total=total,
        items=items,
        page=page,
        size=size
    )


@router.get("/products/gtin/{gtin}", response_model=ProductDetailResponse)
async def get_product_by_gtin(
    gtin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get product information by GTIN including allergens and nutrients.
    Handles GTIN with or without leading zeros.
    """
    # Normalize GTIN - try multiple variants to handle leading zeros
    gtin_variants = set([gtin])  # Use set to avoid duplicates

    if gtin.isdigit():
        # Try version without leading zeros
        gtin_no_zeros = gtin.lstrip('0')
        if gtin_no_zeros:
            gtin_variants.add(gtin_no_zeros)

        # Try with leading zero (14-digit format)
        if not gtin.startswith('0'):
            gtin_variants.add('0' + gtin)

        # Try standard GTIN-13 (13 digits with padding)
        gtin_variants.add(gtin.zfill(13))

        # Try GTIN-14 (14 digits with padding)
        gtin_variants.add(gtin.zfill(14))

    # Query product with related allergens and nutrients
    stmt = (
        select(ProductDetail)
        .options(
            selectinload(ProductDetail.allergens),
            selectinload(ProductDetail.nutrients)
        )
        .where(ProductDetail.gtin.in_(gtin_variants))
    )

    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail=f"Product with GTIN {gtin} not found")

    return await get_product_response(product)


@router.get("/products/{product_id}", response_model=ProductDetailResponse)
async def get_product_by_id(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get product information by ID including allergens and nutrients.
    """
    # Query product with related allergens and nutrients
    stmt = (
        select(ProductDetail)
        .options(
            selectinload(ProductDetail.allergens),
            selectinload(ProductDetail.nutrients)
        )
        .where(ProductDetail.id == product_id)
    )
    
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    
    return await get_product_response(product)


@router.put("/products/{product_id}", response_model=ProductDetailResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a product and its allergens and nutrients.
    """
    # Get existing product
    stmt = select(ProductDetail).where(ProductDetail.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    
    # Update basic product fields
    update_fields = product_data.dict(exclude_unset=True, exclude={'allergens', 'nutrients', 'markings', 'images'})
    
    # Map field names
    field_mapping = {
        'gtin': 'gtin',
        'name': 'name',
        'itemNumber': 'itemnumber',
        'epdNumber': 'epdnumber',
        'producerName': 'producername',
        'providerName': 'providername',
        'brandName': 'brandname',
        'ingredientStatement': 'ingredientstatement',
        'productUrl': 'producturl',
        'packageSize': 'packagesize'
    }
    
    for field, value in update_fields.items():
        if field in field_mapping and value is not None:
            setattr(product, field_mapping[field], value)
    
    # Update markings if provided
    if product_data.markings is not None:
        product.markings = json.dumps([m.dict() for m in product_data.markings])
    
    # Update images if provided
    if product_data.images is not None:
        product.images = json.dumps(product_data.images)
    
    # Update allergens if provided
    if product_data.allergens is not None:
        # Delete existing allergens
        await db.execute(delete(Allergen).where(Allergen.productid == product_id))
        
        # Add new allergens
        for idx, allergen_data in enumerate(product_data.allergens):
            allergen = Allergen(
                allergenid=idx + 1,
                productid=product_id,
                code=allergen_data.code,
                level=map_allergen_level_to_int(allergen_data.level),
                name=allergen_data.name
            )
            db.add(allergen)
    
    # Update nutrients if provided
    if product_data.nutrients is not None:
        # Delete existing nutrients
        await db.execute(delete(Nutrient).where(Nutrient.productid == product_id))
        
        # Add new nutrients
        for idx, nutrient_data in enumerate(product_data.nutrients):
            nutrient = Nutrient(
                nutrientid=idx + 1,
                productid=product_id,
                code=nutrient_data.code,
                measurement=nutrient_data.measurement,
                measurementprecision=nutrient_data.measurementPrecision,
                measurementtype=nutrient_data.measurementType,
                name=nutrient_data.name
            )
            db.add(nutrient)
    
    await db.commit()
    
    # Refresh and load relationships
    stmt = (
        select(ProductDetail)
        .options(
            selectinload(ProductDetail.allergens),
            selectinload(ProductDetail.nutrients)
        )
        .where(ProductDetail.id == product_id)
    )
    result = await db.execute(stmt)
    product = result.scalar_one()
    
    return await get_product_response(product)


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a product and all its related data (allergens and nutrients).
    """
    # Check if product exists
    stmt = select(ProductDetail).where(ProductDetail.id == product_id)
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    
    # Delete allergens and nutrients (cascade should handle this, but being explicit)
    await db.execute(delete(Allergen).where(Allergen.productid == product_id))
    await db.execute(delete(Nutrient).where(Nutrient.productid == product_id))
    
    # Delete product
    await db.delete(product)
    await db.commit()
    
    return {"message": f"Product {product_id} deleted successfully"}


@router.put("/products/{product_id}/allergens/{allergen_code}", response_model=AllergenResponse)
async def update_product_allergen(
    product_id: str,
    allergen_code: str,
    allergen_data: AllergenCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update or create a specific allergen for a product.
    """
    # Check if product exists
    product_exists = await db.execute(
        select(ProductDetail).where(ProductDetail.id == product_id)
    )
    if not product_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    
    # Check if allergen exists
    stmt = select(MatinfoAllergen).where(
        (Allergen.productid == product_id) & 
        (MatinfoAllergen.code == allergen_code)
    )
    result = await db.execute(stmt)
    allergen = result.scalar_one_or_none()
    
    if allergen:
        # Update existing
        allergen.level = map_allergen_level_to_int(allergen_data.level)
        allergen.name = allergen_data.name
    else:
        # Create new
        # Get max allergenid for this product
        max_id_result = await db.execute(
            select(func.max(Allergen.allergenid)).where(Allergen.productid == product_id)
        )
        max_id = max_id_result.scalar() or 0
        
        allergen = Allergen(
            allergenid=max_id + 1,
            productid=product_id,
            code=allergen_code,
            level=map_allergen_level_to_int(allergen_data.level),
            name=allergen_data.name
        )
        db.add(allergen)
    
    await db.commit()
    await db.refresh(allergen)
    
    return AllergenResponse(
        code=allergen.code,
        level=map_allergen_level(allergen.level),
        name=allergen.name
    )


@router.delete("/products/{product_id}/allergens/{allergen_code}")
async def delete_product_allergen(
    product_id: str,
    allergen_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific allergen from a product.
    """
    result = await db.execute(
        delete(Allergen).where(
            (Allergen.productid == product_id) & 
            (MatinfoAllergen.code == allergen_code)
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Allergen {allergen_code} not found for product {product_id}")
    
    await db.commit()
    
    return {"message": f"Allergen {allergen_code} deleted from product {product_id}"}


@router.put("/products/{product_id}/nutrients/{nutrient_code}", response_model=NutrientResponse)
async def update_product_nutrient(
    product_id: str,
    nutrient_code: str,
    nutrient_data: NutrientCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update or create a specific nutrient for a product.
    """
    # Check if product exists
    product_exists = await db.execute(
        select(ProductDetail).where(ProductDetail.id == product_id)
    )
    if not product_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found")
    
    # Check if nutrient exists
    stmt = select(MatinfoNutrient).where(
        (Nutrient.productid == product_id) & 
        (MatinfoNutrient.code == nutrient_code)
    )
    result = await db.execute(stmt)
    nutrient = result.scalar_one_or_none()
    
    if nutrient:
        # Update existing
        nutrient.measurement = nutrient_data.measurement
        nutrient.measurementprecision = nutrient_data.measurementPrecision
        nutrient.measurementtype = nutrient_data.measurementType
        nutrient.name = nutrient_data.name
    else:
        # Create new
        # Get max nutrientid for this product
        max_id_result = await db.execute(
            select(func.max(Nutrient.nutrientid)).where(Nutrient.productid == product_id)
        )
        max_id = max_id_result.scalar() or 0
        
        nutrient = Nutrient(
            nutrientid=max_id + 1,
            productid=product_id,
            code=nutrient_code,
            measurement=nutrient_data.measurement,
            measurementprecision=nutrient_data.measurementPrecision,
            measurementtype=nutrient_data.measurementType,
            name=nutrient_data.name
        )
        db.add(nutrient)
    
    await db.commit()
    await db.refresh(nutrient)
    
    return NutrientResponse(
        code=nutrient.code,
        measurement=float(nutrient.measurement),
        measurementPrecision=nutrient.measurementprecision,
        measurementType=nutrient.measurementtype,
        name=nutrient.name
    )


@router.delete("/products/{product_id}/nutrients/{nutrient_code}")
async def delete_product_nutrient(
    product_id: str,
    nutrient_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific nutrient from a product.
    """
    result = await db.execute(
        delete(Nutrient).where(
            (Nutrient.productid == product_id) & 
            (MatinfoNutrient.code == nutrient_code)
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Nutrient {nutrient_code} not found for product {product_id}")
    
    await db.commit()
    
    return {"message": f"Nutrient {nutrient_code} deleted from product {product_id}"}


@router.post("/products/vendor-import", response_model=VendorImportResponse)
async def import_vendor_product(
    vendor_data: VendorProductImport,
    db: AsyncSession = Depends(get_db)
):
    """
    Import or update a product from vendor JSON format.
    
    This endpoint accepts the complete vendor JSON structure and performs an upsert:
    - If a product with the same GTIN exists, it will be updated
    - If no product exists, a new one will be created
    
    All related data (allergens, nutrients) will be replaced with the vendor data.
    """
    # Check if product exists
    stmt = select(ProductDetail).where(ProductDetail.gtin == vendor_data.gtin)
    result = await db.execute(stmt)
    existing_product = result.scalar_one_or_none()
    
    if existing_product:
        # Update existing product
        product_id = existing_product.id
        operation = "updated"
        
        # Update fields
        existing_product.name = vendor_data.name
        existing_product.itemnumber = vendor_data.itemNumber
        existing_product.epdnumber = vendor_data.epdNumber
        existing_product.producername = vendor_data.producerName
        existing_product.providername = vendor_data.providerName
        existing_product.brandname = vendor_data.brandName
        existing_product.ingredientstatement = vendor_data.ingredientStatement
        existing_product.producturl = vendor_data.productUrl
        existing_product.packagesize = vendor_data.packageSize
        existing_product.productdescription = vendor_data.productDescription
        existing_product.countryoforigin = vendor_data.countryOfOrigin
        existing_product.countryofpreparation = vendor_data.countryOfPreparation
        existing_product.fpakk = vendor_data.fpakk
        existing_product.dpakk = vendor_data.dpakk
        existing_product.pall = vendor_data.pall
        existing_product.created = vendor_data.created
        existing_product.updated = vendor_data.updated
        existing_product.markings = json.dumps([m.dict() for m in vendor_data.markings]) if vendor_data.markings else None
        existing_product.images = json.dumps(vendor_data.images) if vendor_data.images else None
        
        # Delete existing allergens and nutrients
        await db.execute(delete(Allergen).where(Allergen.productid == product_id))
        await db.execute(delete(Nutrient).where(Nutrient.productid == product_id))
        
    else:
        # Create new product
        product_id = str(uuid.uuid4())
        operation = "created"
        
        product = ProductDetail(
            id=product_id,
            gtin=vendor_data.gtin,
            name=vendor_data.name,
            itemnumber=vendor_data.itemNumber,
            epdnumber=vendor_data.epdNumber,
            producername=vendor_data.producerName,
            providername=vendor_data.providerName,
            brandname=vendor_data.brandName,
            ingredientstatement=vendor_data.ingredientStatement,
            producturl=vendor_data.productUrl,
            packagesize=vendor_data.packageSize,
            productdescription=vendor_data.productDescription,
            countryoforigin=vendor_data.countryOfOrigin,
            countryofpreparation=vendor_data.countryOfPreparation,
            fpakk=vendor_data.fpakk,
            dpakk=vendor_data.dpakk,
            pall=vendor_data.pall,
            created=vendor_data.created,
            updated=vendor_data.updated,
            markings=json.dumps([m.dict() for m in vendor_data.markings]) if vendor_data.markings else None,
            images=json.dumps(vendor_data.images) if vendor_data.images else None
        )
        db.add(product)
    
    # Add allergens
    for idx, allergen_data in enumerate(vendor_data.allergens):
        allergen = Allergen(
            allergenid=idx + 1,
            productid=product_id,
            code=allergen_data.code,
            level=map_allergen_level_to_int(allergen_data.level),
            name=allergen_data.name
        )
        db.add(allergen)
    
    # Add nutrients
    for idx, nutrient_data in enumerate(vendor_data.nutrients):
        nutrient = Nutrient(
            nutrientid=idx + 1,
            productid=product_id,
            code=nutrient_data.code,
            measurement=nutrient_data.measurement,
            measurementprecision=nutrient_data.measurementPrecision,
            measurementtype=nutrient_data.measurementType,
            name=nutrient_data.name
        )
        db.add(nutrient)
    
    await db.commit()
    
    return VendorImportResponse(
        success=True,
        message=f"Product {operation} successfully",
        product_id=product_id,
        gtin=vendor_data.gtin,
        operation=operation
    )


@router.post("/products/vendor-import/batch", response_model=List[VendorImportResponse])
async def import_vendor_products_batch(
    vendor_products: List[VendorProductImport],
    db: AsyncSession = Depends(get_db)
):
    """
    Import or update multiple products from vendor JSON format.
    
    This endpoint accepts a list of vendor products and performs bulk upsert.
    Each product is processed independently, and errors for individual products
    won't affect the import of others.
    """
    results = []
    
    for vendor_data in vendor_products:
        try:
            # Process each product using the single import logic
            result = await import_vendor_product(vendor_data, db)
            results.append(result)
        except Exception as e:
            # If a product fails, record the error and continue
            results.append(VendorImportResponse(
                success=False,
                message=f"Error importing product: {str(e)}",
                gtin=vendor_data.gtin,
                operation="failed"
            ))
    
    return results


@router.post("/products/export", response_model=ProductExportResponse)
async def export_products_for_rag(
    request: ProductExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Export all products for RAG (Retrieval-Augmented Generation) system.
    
    This endpoint exports products in formats optimized for search and retrieval:
    - json: Single JSON file containing all products
    - jsonl: Multiple JSONL files with ~100 products each (default)
    - markdown: Individual Markdown files (one per product)
    
    Files are organized by timestamp in the exportcatalog directory.
    
    Returns:
        Export status including file paths and statistics
    """
    exporter = ProductExporter()
    result = await exporter.export_products(db, format=request.format)
    return ProductExportResponse(**result)


@router.get("/products/export/list")
async def list_exports():
    """
    List all available product exports.
    
    Returns a list of exports with metadata including:
    - Timestamp
    - Number of products
    - Format (json, jsonl, markdown)
    - File size
    """
    exporter = ProductExporter()
    exports = exporter.get_export_list()
    return {"exports": exports}


@router.get("/products/export/download/{timestamp}")
async def download_export(timestamp: str):
    """
    Download a specific export as a zip file.
    
    Args:
        timestamp: The export timestamp (e.g., "20250703_061336")
    
    Returns:
        Zip file containing all exported files
    """
    from fastapi.responses import FileResponse
    import os
    
    exporter = ProductExporter()
    export_path = f"exportcatalog/{timestamp}"
    
    # Check if export exists
    if not os.path.exists(export_path):
        raise HTTPException(status_code=404, detail="Export not found")
    
    try:
        # Create zip file
        zip_path = exporter.create_zip_file(export_path)
        
        # Clean up old zip files (older than 1 hour)
        import time
        from pathlib import Path
        export_dir = Path("exportcatalog")
        current_time = time.time()
        for zip_file in export_dir.glob("*.zip"):
            if current_time - zip_file.stat().st_mtime > 3600:  # 1 hour
                try:
                    zip_file.unlink()
                except:
                    pass
        
        # Return file response
        return FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=f"product_export_{timestamp}.zip",
            headers={
                "Content-Disposition": f"attachment; filename=product_export_{timestamp}.zip"
            }
        )
    except Exception as e:
        logger.error(f"Failed to create zip file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create zip file")


@router.get("/products/export/status")
async def get_export_status():
    """
    Get status of export directory and available exports.
    
    Returns information about existing exports in the exportcatalog directory.
    """
    import os
    from pathlib import Path
    
    export_dir = Path("exportcatalog")
    
    if not export_dir.exists():
        return {
            "exports_available": False,
            "message": "No exports found",
            "exports": []
        }
    
    exports = []
    for subdir in sorted(export_dir.iterdir(), reverse=True):
        if subdir.is_dir() and subdir.name.isdigit():
            metadata_file = subdir / "export_metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                    exports.append({
                        "timestamp": subdir.name,
                        "path": str(subdir),
                        "total_products": metadata.get("total_products", 0),
                        "files_created": metadata.get("files_created", 0)
                    })
    
    return {
        "exports_available": len(exports) > 0,
        "total_exports": len(exports),
        "latest_export": exports[0] if exports else None,
        "exports": exports
    }


@router.get("/products/search")
async def search_products(
    q: str = Query(..., description="Search query"),
    source: str = Query("database", description="Search source: 'database' or 'llm'"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_details: bool = Query(True, description="Include product details from products table"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search products using database or LLM.
    
    Parameters:
    - q: Search query (required)
    - source: 'database' for direct search, 'llm' for semantic search via AnythingLLM
    - limit: Maximum number of results
    - offset: Skip this many results
    - include_details: If true, searches in detailed products table; if false, searches tblprodukter
    
    Returns products with their details and links to tblprodukter via GTIN.
    """
    search_service = ProductSearchService()
    
    if source == "llm":
        result = await search_service.search_llm(q, db, limit)
    else:
        result = await search_service.search_database(q, db, limit, offset, include_details)
    
    return result


@router.post("/products/search/hybrid")
async def hybrid_search_products(
    request: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Hybrid search that combines database and LLM results.
    
    Request body:
    {
        "query": "search term",
        "use_llm": true,
        "limit": 20,
        "filters": {
            "brand": "TINE",
            "has_allergens": false
        }
    }
    """
    query = request.get("query", "")
    use_llm = request.get("use_llm", False)
    limit = request.get("limit", 20)
    filters = request.get("filters", {})
    
    search_service = ProductSearchService()
    
    # Always do database search
    db_results = await search_service.search_database(query, db, limit)
    
    # Optionally add LLM results
    if use_llm and settings.ANYTHINGLLM_API_KEY:
        llm_results = await search_service.search_llm(query, db, limit)
        
        # Merge results, prioritizing LLM results for relevance
        if llm_results.get("success") and llm_results.get("items"):
            # Deduplicate by GTIN
            seen_gtins = {item["gtin"] for item in llm_results["items"] if item.get("gtin")}
            
            # Add unique database results
            for item in db_results.get("items", []):
                if item.get("gtin") not in seen_gtins:
                    llm_results["items"].append(item)
            
            return {
                "success": True,
                "source": "hybrid",
                "query": query,
                "total": len(llm_results["items"]),
                "items": llm_results["items"],
                "sources_used": ["database", "llm"]
            }
    
    return db_results


@router.get("/products/gtin/{gtin}/linked")
async def get_linked_product(
    gtin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get product from tblprodukter linked by GTIN.

    This endpoint finds the product in tblprodukter that matches the GTIN
    from the detailed products table.
    """
    # Find in tblprodukter using normalized GTIN matching (pad to 14 digits)
    normalized_gtin = normalize_gtin(gtin)
    stmt = select(Produkter).where(
        func.lpad(func.regexp_replace(Produkter.ean_kode, r'[^0-9]', '', 'g'), 14, '0') == normalized_gtin
    )
    result = await db.execute(stmt)
    produkter_item = result.scalar_one_or_none()
    
    if not produkter_item:
        raise HTTPException(status_code=404, detail=f"No product found in tblprodukter with GTIN {gtin}")
    
    # Also get details if available
    detail_stmt = (
        select(ProductDetail)
        .options(
            selectinload(ProductDetail.allergens),
            selectinload(ProductDetail.nutrients)
        )
        .where(ProductDetail.gtin == gtin)
    )
    detail_result = await db.execute(detail_stmt)
    detail_item = detail_result.scalar_one_or_none()
    
    return {
        "produkter": {
            "produktid": produkter_item.produktid,
            "produktnavn": produkter_item.produktnavn,
            "ean_kode": produkter_item.ean_kode,
            "pris": produkter_item.pris,
            "lagermengde": produkter_item.lagermengde,
            "visningsnavn": produkter_item.visningsnavn,
            "leverandorsproduktnr": produkter_item.leverandorsproduktnr,
            "pakningstype": produkter_item.pakningstype,
            "pakningsstorrelse": produkter_item.pakningsstorrelse
        },
        "details": await get_product_response(detail_item) if detail_item else None
    }