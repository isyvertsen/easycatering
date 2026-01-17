"""Product API endpoints."""
import json
from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, func, text, String
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.core.cache import cache_get, cache_set, make_cache_key, CACHE_TTL_MEDIUM
from app.domain.entities.user import User
from app.models.produkter import Produkter as ProdukterModel
from app.models.matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient
from app.schemas.produkter import Produkter, ProdukterCreate, ProdukterUpdate
from sqlalchemy.orm import selectinload

router = APIRouter()


class ProdukterStats(BaseModel):
    """Product statistics."""
    total: int
    with_gtin: int
    without_gtin: int


class ProdukterListResponse(BaseModel):
    """Paginated response for products list."""
    items: List[Produkter]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: Optional[ProdukterStats] = None


@router.get("/", response_model=ProdukterListResponse)
async def get_produkter(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    aktiv: Optional[bool] = Query(None, description="Filter by active status"),
    kategori: Optional[int] = Query(None, description="Filter by category ID"),
    search: Optional[str] = Query(None, max_length=200, description="Search in product name (standard parameter)"),
    sok: Optional[str] = Query(None, description="Search in product name (deprecated, use 'search')"),
    rett_komponent: Optional[bool] = Query(None, description="Filter by dish component status"),
    has_gtin: Optional[bool] = Query(None, description="Filter by GTIN presence: true=has GTIN, false=missing GTIN"),
    leverandor_ids: Optional[str] = Query(None, description="Comma-separated list of leverandor IDs to filter by"),
    sort_by: Optional[str] = Query(None, description="Sort by field (produktid, produktnavn, pris, ean_kode)"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    include_stats: bool = Query(False, description="Include GTIN statistics in response"),
) -> ProdukterListResponse:
    """Get all products with pagination."""
    # Build base query
    base_query = select(ProdukterModel)

    # Filter by active status
    if aktiv is not None:
        if aktiv:
            base_query = base_query.where(
                or_(ProdukterModel.utgatt == False, ProdukterModel.utgatt == None)
            )
        else:
            base_query = base_query.where(ProdukterModel.utgatt == True)

    # Filter by category
    if kategori:
        base_query = base_query.where(ProdukterModel.kategoriid == kategori)

    # Filter by leverandor IDs (comma-separated list)
    if leverandor_ids:
        try:
            ids = [int(id.strip()) for id in leverandor_ids.split(",") if id.strip()]
            if ids:
                base_query = base_query.where(ProdukterModel.levrandorid.in_(ids))
        except ValueError:
            pass  # Ignore invalid IDs

    # Filter by rett_komponent (dish component)
    if rett_komponent is not None:
        base_query = base_query.where(ProdukterModel.rett_komponent == rett_komponent)

    # Filter by GTIN presence
    if has_gtin is not None:
        if has_gtin:
            base_query = base_query.where(
                or_(
                    ProdukterModel.ean_kode != None,
                    ProdukterModel.ean_kode != ""
                )
            )
        else:
            base_query = base_query.where(
                or_(
                    ProdukterModel.ean_kode == None,
                    ProdukterModel.ean_kode == ""
                )
            )

    # Search by name, ID, or codes (support both 'search' and 'sok' for backward compatibility)
    search_term_input = search or sok
    if search_term_input:
        search_term = f"%{search_term_input}%"
        base_query = base_query.where(
            or_(
                ProdukterModel.produktnavn.ilike(search_term),
                ProdukterModel.visningsnavn.ilike(search_term),
                ProdukterModel.leverandorsproduktnr.ilike(search_term),
                ProdukterModel.ean_kode.ilike(search_term),
                func.cast(ProdukterModel.produktid, String).ilike(search_term)
            )
        )

    # Apply sorting with secondary sort by produktnavn for better readability
    if sort_by:
        sort_column = getattr(ProdukterModel, sort_by, None)
        if sort_column is not None:
            if sort_order == "desc":
                base_query = base_query.order_by(
                    sort_column.desc(),
                    ProdukterModel.produktnavn.asc()
                )
            else:
                base_query = base_query.order_by(
                    sort_column.asc(),
                    ProdukterModel.produktnavn.asc()
                )
        else:
            # Default sort by produktid if invalid sort field
            base_query = base_query.order_by(ProdukterModel.produktid.asc())
    else:
        # Default sort by produktid
        base_query = base_query.order_by(ProdukterModel.produktid.asc())

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = base_query.offset(skip).limit(limit)
    result = await db.execute(query)
    produkter = result.scalars().all()

    # Calculate pagination
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    # Calculate GTIN stats if requested (avoids N+1 in frontend)
    stats = None
    if include_stats:
        # Count products with GTIN
        with_gtin_query = select(func.count()).select_from(ProdukterModel).where(
            ProdukterModel.ean_kode != None,
            ProdukterModel.ean_kode != ""
        )
        with_gtin_result = await db.execute(with_gtin_query)
        with_gtin = with_gtin_result.scalar() or 0

        # Total active products
        total_query = select(func.count()).select_from(ProdukterModel)
        total_result_all = await db.execute(total_query)
        total_all = total_result_all.scalar() or 0

        stats = ProdukterStats(
            total=total_all,
            with_gtin=with_gtin,
            without_gtin=total_all - with_gtin
        )

    return ProdukterListResponse(
        items=produkter,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        stats=stats
    )


@router.get("/{produkt_id}", response_model=Produkter)
async def get_produkt(
    produkt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Produkter:
    """Get a product by ID."""
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == produkt_id)
    )
    produkt = result.scalar_one_or_none()

    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")

    return produkt


@router.post("/by-ids", response_model=List[Produkter])
async def get_produkter_by_ids(
    produkt_ids: List[int] = Body(..., description="List of product IDs"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Produkter]:
    """Get multiple products by their IDs."""
    if not produkt_ids:
        return []

    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid.in_(produkt_ids))
    )
    return result.scalars().all()


@router.post("/", response_model=Produkter)
async def create_produkt(
    produkt_data: ProdukterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Produkter:
    """Create a new product."""
    produkt = ProdukterModel(**produkt_data.model_dump())
    db.add(produkt)
    await db.commit()
    await db.refresh(produkt)
    return produkt


@router.put("/{produkt_id}", response_model=Produkter)
async def update_produkt(
    produkt_id: int,
    produkt_data: ProdukterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Produkter:
    """Update a product."""
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == produkt_id)
    )
    produkt = result.scalar_one_or_none()
    
    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")
    
    update_data = produkt_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(produkt, field, value)
    
    await db.commit()
    await db.refresh(produkt)
    return produkt


@router.delete("/{produkt_id}")
async def delete_produkt(
    produkt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a product (soft delete by setting utgatt=True)."""
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == produkt_id)
    )
    produkt = result.scalar_one_or_none()
    
    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")
    
    produkt.utgatt = True
    await db.commit()

    return {"message": "Produkt slettet"}


# Pydantic models for new endpoints
class MatinfoAllergenInfo(BaseModel):
    """Allergen informasjon fra Matinfo."""
    code: str
    name: str
    level: str  # FREE_FROM, CONTAINS, MAY_CONTAIN

    class Config:
        from_attributes = True


class MatinfoNutrientInfo(BaseModel):
    """Nutrient informasjon fra Matinfo."""
    code: str
    name: str
    measurement: Optional[float] = None
    measurement_precision: Optional[str] = None
    measurement_type: Optional[str] = None

    class Config:
        from_attributes = True


class MatinfoSearchResult(BaseModel):
    """Matinfo søkeresultat."""
    id: int
    gtin: str
    name: str
    brand: Optional[str] = None
    ingredients: Optional[str] = None
    similarity_score: Optional[float] = None
    allergens: List["MatinfoAllergenInfo"] = []
    nutrients: List["MatinfoNutrientInfo"] = []


@router.get("/matinfo/search", response_model=List[MatinfoSearchResult])
async def search_matinfo_products(
    query: str = Query(..., min_length=2, description="Søketekst (produktnavn, merke, ingredienser)"),
    limit: int = Query(20, ge=1, le=100, description="Maks antall resultater"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MatinfoSearchResult]:
    """
    Fuzzy-søk i Matinfo-produkter.

    Søker i:
    - Produktnavn
    - Merkenavn
    - Ingredienser

    Bruker PostgreSQL trigram similarity for fuzzy matching.
    Returnerer også allergen og nutrition data.
    Resultater caches i 1 time.
    """
    # Normalize søketekst
    search_term = query.strip().lower()

    # Check cache first
    cache_key = make_cache_key("matinfo_search", search_term, limit)
    cached = await cache_get(cache_key)
    if cached:
        return [MatinfoSearchResult(**item) for item in json.loads(cached)]

    # PostgreSQL trigram similarity søk for å få IDs
    # Krever extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
    sql = text("""
        SELECT
            id,
            GREATEST(
                similarity(LOWER(name), :search),
                similarity(LOWER(COALESCE(brand_name, '')), :search),
                similarity(LOWER(COALESCE(ingredient_statement, '')), :search)
            ) as similarity_score
        FROM matinfo_products
        WHERE
            LOWER(name) % :search
            OR LOWER(COALESCE(brand_name, '')) % :search
            OR LOWER(COALESCE(ingredient_statement, '')) % :search
            OR LOWER(name) LIKE :like_search
            OR LOWER(COALESCE(brand_name, '')) LIKE :like_search
        ORDER BY similarity_score DESC
        LIMIT :limit
    """)

    result = await db.execute(
        sql,
        {
            "search": search_term,
            "like_search": f"%{search_term}%",
            "limit": limit
        }
    )

    rows = result.fetchall()
    product_ids = [row.id for row in rows]
    similarity_map = {row.id: row.similarity_score for row in rows}

    # Hent produkter med allergen og nutrition data
    products_result = await db.execute(
        select(MatinfoProduct)
        .options(selectinload(MatinfoProduct.allergens), selectinload(MatinfoProduct.nutrients))
        .where(MatinfoProduct.id.in_(product_ids))
    )
    products = products_result.scalars().all()

    # Bygg respons med sortering basert på similarity
    products_map = {p.id: p for p in products}

    results = [
        MatinfoSearchResult(
            id=pid,
            gtin=products_map[pid].gtin,
            name=products_map[pid].name,
            brand=products_map[pid].brand_name,
            ingredients=products_map[pid].ingredient_statement,
            similarity_score=round(float(similarity_map[pid]), 3) if similarity_map[pid] else None,
            allergens=[
                MatinfoAllergenInfo(
                    code=a.code,
                    name=a.name,
                    level=a.level
                ) for a in products_map[pid].allergens
            ],
            nutrients=[
                MatinfoNutrientInfo(
                    code=n.code,
                    name=n.name,
                    measurement=float(n.measurement) if n.measurement else None,
                    measurement_precision=n.measurement_precision,
                    measurement_type=n.measurement_type
                ) for n in products_map[pid].nutrients
            ]
        )
        for pid in product_ids if pid in products_map
    ]

    # Cache results
    await cache_set(cache_key, json.dumps([r.model_dump() for r in results]), CACHE_TTL_MEDIUM)

    return results


@router.get("/{produkt_id}/matinfo-suggestions", response_model=List[MatinfoSearchResult])
async def get_matinfo_suggestions(
    produkt_id: int,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MatinfoSearchResult]:
    """
    Få Matinfo-forslag basert på produktnavn.

    Bruker fuzzy matching på produktnavn for å finne lignende produkter i Matinfo.
    Resultater caches i 1 time.
    """
    # Check cache first
    cache_key = make_cache_key("matinfo_suggestions", produkt_id, limit)
    cached = await cache_get(cache_key)
    if cached:
        return [MatinfoSearchResult(**item) for item in json.loads(cached)]

    # Hent produkt
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == produkt_id)
    )
    produkt = result.scalar_one_or_none()

    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")

    # Bruk produktnavn for søk
    search_term = produkt.produktnavn.strip().lower()

    # Fjern vanlige prefikser/suffikser som kan forstyrre søket
    search_term = search_term.replace("kg", "").replace("stk", "").replace("gram", "").strip()

    sql = text("""
        SELECT
            id,
            GREATEST(
                similarity(LOWER(name), :search),
                similarity(LOWER(COALESCE(brand_name, '')), :search)
            ) as similarity_score
        FROM matinfo_products
        WHERE
            LOWER(name) % :search
            OR LOWER(name) LIKE :like_search
            OR LOWER(COALESCE(brand_name, '')) % :search
        ORDER BY similarity_score DESC
        LIMIT :limit
    """)

    result = await db.execute(
        sql,
        {
            "search": search_term,
            "like_search": f"%{search_term}%",
            "limit": limit
        }
    )

    rows = result.fetchall()
    product_ids = [row.id for row in rows]
    similarity_map = {row.id: row.similarity_score for row in rows}

    # Hent produkter med allergen og nutrition data
    products_result = await db.execute(
        select(MatinfoProduct)
        .options(selectinload(MatinfoProduct.allergens), selectinload(MatinfoProduct.nutrients))
        .where(MatinfoProduct.id.in_(product_ids))
    )
    products = products_result.scalars().all()

    # Bygg respons med sortering basert på similarity
    products_map = {p.id: p for p in products}

    results = [
        MatinfoSearchResult(
            id=pid,
            gtin=products_map[pid].gtin,
            name=products_map[pid].name,
            brand=products_map[pid].brand_name,
            ingredients=products_map[pid].ingredient_statement,
            similarity_score=round(float(similarity_map[pid]), 3) if similarity_map[pid] else None,
            allergens=[
                MatinfoAllergenInfo(
                    code=a.code,
                    name=a.name,
                    level=a.level
                ) for a in products_map[pid].allergens
            ],
            nutrients=[
                MatinfoNutrientInfo(
                    code=n.code,
                    name=n.name,
                    measurement=float(n.measurement) if n.measurement else None,
                    measurement_precision=n.measurement_precision,
                    measurement_type=n.measurement_type
                ) for n in products_map[pid].nutrients
            ]
        )
        for pid in product_ids if pid in products_map
    ]

    # Cache results
    await cache_set(cache_key, json.dumps([r.model_dump() for r in results]), CACHE_TTL_MEDIUM)

    return results

@router.get("/by-gtin/{gtin}", response_model=Produkter)
async def get_product_by_any_gtin(
    gtin: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Produkter:
    """
    Find product by any GTIN level (ean_kode, gtin_fpak, gtin_dpak, gtin_pall).

    Searches across all GTIN fields to find a matching product.
    Useful for barcode scanning that might return different GTIN levels.
    """
    # Build query to search all GTIN fields
    stmt = select(ProdukterModel).where(
        or_(
            ProdukterModel.ean_kode == gtin,
            ProdukterModel.gtin_fpak == gtin,
            ProdukterModel.gtin_dpak == gtin,
            ProdukterModel.gtin_pall == gtin,
        )
    )

    result = await db.execute(stmt)
    produkt = result.scalar_one_or_none()

    if not produkt:
        raise HTTPException(status_code=404, detail=f"Produkt med GTIN {gtin} ikke funnet")

    return produkt
