"""Enhanced product search API endpoints with fuzzy matching and auto-complete."""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.services.enhanced_product_search import EnhancedProductSearchService
from app.schemas.product_search import (
    ProductSearchResponse,
    ProductSearchResult,
    SearchSuggestionsResponse,
    RecentSearchesResponse,
    FrequentProductsResponse
)

router = APIRouter()
search_service = EnhancedProductSearchService()


@router.get("/products/search/fuzzy", response_model=ProductSearchResponse)
async def fuzzy_search_products(
    q: str = Query(..., description="Søkeord for produkt", min_length=1),
    limit: int = Query(20, ge=1, le=100, description="Maks antall resultater"),
    offset: int = Query(0, ge=0, description="Hopp over første N resultater"),
    threshold: float = Query(0.3, ge=0, le=1, description="Minimum likhetsscore (0-1)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Søk etter produkter med fuzzy matching og rangering.

    Denne endepunktet bruker avansert fuzzy matching for å finne produkter selv med skrivefeil.
    Resultater rangeres basert på relevans.

    - **q**: Søkeord (påkrevd)
    - **limit**: Maksimalt antall resultater (standard: 20)
    - **offset**: Pagination offset (standard: 0)
    - **threshold**: Minimum likhetsscore 0-1 (standard: 0.3)

    Returnerer produkter sortert etter relevans med matchScore.
    """
    result = await search_service.fuzzy_search(
        query=q,
        session=db,
        limit=limit,
        offset=offset,
        threshold=threshold
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Søk feilet"))

    return ProductSearchResponse(**result)


@router.get("/products/search/suggestions", response_model=SearchSuggestionsResponse)
async def get_search_suggestions(
    q: str = Query(..., description="Delvis søkeord", min_length=2),
    limit: int = Query(10, ge=1, le=20, description="Maks antall forslag"),
    db: AsyncSession = Depends(get_db)
):
    """
    Få auto-complete forslag for produktsøk.

    Returnerer forslag basert på:
    - Tidligere søk
    - Produktnavn som starter med søkeordet

    - **q**: Delvis søkeord (minimum 2 tegn)
    - **limit**: Maksimalt antall forslag (standard: 10)
    """
    suggestions = await search_service.get_suggestions(
        query=q,
        session=db,
        limit=limit
    )

    return SearchSuggestionsResponse(
        query=q,
        suggestions=suggestions
    )


@router.get("/products/search/recent", response_model=RecentSearchesResponse)
async def get_recent_searches(
    limit: int = Query(20, ge=1, le=50, description="Maks antall søk")
):
    """
    Hent nylige søk.

    Returnerer de siste unike søkene som er gjort.

    - **limit**: Maksimalt antall søk å returnere (standard: 20)
    """
    searches = await search_service.get_recent_searches(limit=limit)

    return RecentSearchesResponse(
        searches=searches,
        total=len(searches)
    )


@router.get("/products/frequent", response_model=FrequentProductsResponse)
async def get_frequent_products(
    recipe_type: Optional[str] = Query(None, description="Filtrer på oppskriftstype"),
    limit: int = Query(20, ge=1, le=50, description="Maks antall produkter"),
    db: AsyncSession = Depends(get_db)
):
    """
    Hent ofte brukte produkter.

    Returnerer produkter som ofte brukes i oppskrifter.

    - **recipe_type**: Valgfri filtrering på oppskriftstype (f.eks. "frokost", "middag")
    - **limit**: Maksimalt antall produkter (standard: 20)
    """
    products = await search_service.get_frequent_products(
        session=db,
        recipe_type=recipe_type,
        limit=limit
    )

    return FrequentProductsResponse(
        products=products,
        total=len(products)
    )


@router.post("/products/{gtin}/track-use")
async def track_product_use(
    gtin: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Registrer at et produkt er brukt i en oppskrift.

    Dette brukes for å spore populære produkter og forbedre søkeresultater.

    - **gtin**: Produktets GTIN-kode
    """
    await search_service.track_product_use(gtin)

    return {
        "success": True,
        "message": f"Bruk av produkt {gtin} registrert"
    }