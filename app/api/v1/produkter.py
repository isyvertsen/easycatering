"""Product API endpoints."""
from typing import List, Optional, Dict, Any
from sqlalchemy import select, or_, func, text, String
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.produkter import Produkter as ProdukterModel
from app.models.matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient
from app.schemas.produkter import Produkter, ProdukterCreate, ProdukterUpdate
from sqlalchemy.orm import selectinload

router = APIRouter()


class ProdukterListResponse(BaseModel):
    """Paginated response for products list."""
    items: List[Produkter]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=ProdukterListResponse)
async def get_produkter(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    aktiv: Optional[bool] = Query(None, description="Filter by active status"),
    kategori: Optional[int] = Query(None, description="Filter by category ID"),
    sok: Optional[str] = Query(None, description="Search in product name"),
    rett_komponent: Optional[bool] = Query(None, description="Filter by dish component status"),
    has_gtin: Optional[bool] = Query(None, description="Filter by GTIN presence: true=has GTIN, false=missing GTIN"),
    leverandor_ids: Optional[str] = Query(None, description="Comma-separated list of leverandor IDs to filter by"),
    sort_by: Optional[str] = Query(None, description="Sort by field (produktid, produktnavn, pris, ean_kode)"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
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

    # Search by name, ID, or codes
    if sok:
        search_term = f"%{sok}%"
        base_query = base_query.where(
            or_(
                ProdukterModel.produktnavn.ilike(search_term),
                ProdukterModel.visningsnavn.ilike(search_term),
                ProdukterModel.leverandorsproduktnr.ilike(search_term),
                ProdukterModel.ean_kode.ilike(search_term),
                func.cast(ProdukterModel.produktid, String).ilike(search_term)
            )
        )

    # Apply sorting
    if sort_by:
        sort_column = getattr(ProdukterModel, sort_by, None)
        if sort_column is not None:
            if sort_order == "desc":
                base_query = base_query.order_by(sort_column.desc())
            else:
                base_query = base_query.order_by(sort_column.asc())
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

    return ProdukterListResponse(
        items=produkter,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
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


class GtinUpdateRequest(BaseModel):
    """Request for å oppdatere GTIN."""
    produktid: int
    gtin: str


class BulkGtinUpdateRequest(BaseModel):
    """Request for masse-oppdatering av GTIN."""
    updates: List[GtinUpdateRequest]


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
    """
    # Normalize søketekst
    search_term = query.strip().lower()

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
        .where(MatinfoMatinfoProduct.id.in_(product_ids))
    )
    products = products_result.scalars().all()

    # Bygg respons med sortering basert på similarity
    products_map = {p.id: p for p in products}

    return [
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


@router.patch("/{produkt_id}/gtin")
async def update_produkt_gtin(
    produkt_id: int,
    gtin: str = Body(..., embed=True, description="Ny GTIN/EAN-kode"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Oppdater GTIN/EAN-kode for et produkt.

    Renser automatisk GTIN (fjerner bindestreker, validerer lengde).
    """
    # Hent produkt
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == produkt_id)
    )
    produkt = result.scalar_one_or_none()

    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")

    # Rens GTIN
    clean_gtin = gtin.strip().replace("-", "").replace(" ", "")

    # Valider GTIN-lengde (8, 12, 13, eller 14 siffer)
    if clean_gtin and len(clean_gtin) not in [8, 12, 13, 14]:
        raise HTTPException(
            status_code=400,
            detail=f"Ugyldig GTIN-lengde: {len(clean_gtin)}. Må være 8, 12, 13 eller 14 siffer."
        )

    # Sjekk om GTIN finnes i Matinfo
    matinfo_match = None
    if clean_gtin:
        matinfo_result = await db.execute(
            select(MatinfoProduct).where(MatinfoMatinfoProduct.gtin == clean_gtin)
        )
        matinfo_match = matinfo_result.scalar_one_or_none()

    # Oppdater produkt
    old_gtin = produkt.ean_kode
    produkt.ean_kode = clean_gtin if clean_gtin else None

    await db.commit()
    await db.refresh(produkt)

    return {
        "produktid": produkt_id,
        "produktnavn": produkt.produktnavn,
        "old_gtin": old_gtin,
        "new_gtin": clean_gtin,
        "matinfo_match": {
            "found": matinfo_match is not None,
            "product_name": matinfo_match.name if matinfo_match else None,
            "brand": matinfo_match.brand if matinfo_match else None
        } if clean_gtin else None,
        "message": "GTIN oppdatert"
    }


@router.post("/bulk-update-gtin")
async def bulk_update_gtin(
    updates: BulkGtinUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Masse-oppdatering av GTIN for flere produkter.

    Returnerer statistikk over oppdateringer og eventuelle feil.
    """
    results = {
        "total": len(updates.updates),
        "success": 0,
        "failed": 0,
        "matinfo_matches": 0,
        "details": []
    }

    for update in updates.updates:
        try:
            # Hent produkt
            result = await db.execute(
                select(ProdukterModel).where(ProdukterModel.produktid == update.produktid)
            )
            produkt = result.scalar_one_or_none()

            if not produkt:
                results["failed"] += 1
                results["details"].append({
                    "produktid": update.produktid,
                    "status": "error",
                    "message": "Produkt ikke funnet"
                })
                continue

            # Rens GTIN
            clean_gtin = update.gtin.strip().replace("-", "").replace(" ", "")

            # Valider lengde
            if clean_gtin and len(clean_gtin) not in [8, 12, 13, 14]:
                results["failed"] += 1
                results["details"].append({
                    "produktid": update.produktid,
                    "status": "error",
                    "message": f"Ugyldig GTIN-lengde: {len(clean_gtin)}"
                })
                continue

            # Sjekk Matinfo
            matinfo_match = None
            if clean_gtin:
                matinfo_result = await db.execute(
                    select(MatinfoProduct).where(MatinfoMatinfoProduct.gtin == clean_gtin)
                )
                matinfo_match = matinfo_result.scalar_one_or_none()
                if matinfo_match:
                    results["matinfo_matches"] += 1

            # Oppdater
            old_gtin = produkt.ean_kode
            produkt.ean_kode = clean_gtin if clean_gtin else None

            results["success"] += 1
            results["details"].append({
                "produktid": update.produktid,
                "produktnavn": produkt.produktnavn,
                "status": "success",
                "old_gtin": old_gtin,
                "new_gtin": clean_gtin,
                "matinfo_match": matinfo_match is not None
            })

        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "produktid": update.produktid,
                "status": "error",
                "message": str(e)
            })

    # Commit alle endringer
    await db.commit()

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
    """
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
        .where(MatinfoMatinfoProduct.id.in_(product_ids))
    )
    products = products_result.scalars().all()

    # Bygg respons med sortering basert på similarity
    products_map = {p.id: p for p in products}

    return [
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