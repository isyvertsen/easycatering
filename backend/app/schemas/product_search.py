"""Schemas for enhanced product search functionality."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class NutritionSummary(BaseModel):
    """Nutrition summary for search results."""
    energy_kcal: float = Field(description="Energi i kilokalorier")
    protein: float = Field(description="Protein i gram")
    fat: float = Field(description="Fett i gram")
    carbs: float = Field(description="Karbohydrater i gram")


class AllergenInfo(BaseModel):
    """Allergen information."""
    code: str = Field(description="Allergenkode")
    name: str = Field(description="Allergennavn")
    level: str = Field(description="Nivå: FREE_FROM, CONTAINS, MAY_CONTAIN")


class LinkedProduct(BaseModel):
    """Linked product from tblprodukter."""
    produktid: int
    produktnavn: str
    pris: Optional[float]
    lagermengde: Optional[int]


class ProductSearchResult(BaseModel):
    """Individual product search result."""
    gtin: str = Field(description="GTIN-kode")
    name: str = Field(description="Produktnavn")
    brand: Optional[str] = Field(description="Merke")
    size: Optional[str] = Field(description="Pakkestørrelse")
    unit: str = Field(description="Enhet (kg, g, l, ml, stk)")
    nutritionComplete: bool = Field(description="Om alle obligatoriske næringsdata er tilstede")
    nutritionSummary: NutritionSummary = Field(description="Næringssammendrag")
    matchScore: float = Field(description="Relevanspoeng (0-100)")
    lastUsed: Optional[str] = Field(description="Sist brukt dato (ISO format)")
    useCount: int = Field(description="Antall ganger brukt")
    producer: Optional[str] = Field(description="Produsent")
    ingredients: Optional[str] = Field(description="Ingrediensliste")
    allergens: List[AllergenInfo] = Field(default_factory=list, description="Allergener")
    linkedProduct: Optional[LinkedProduct] = Field(description="Koblet produkt fra tblprodukter")


class ProductSearchResponse(BaseModel):
    """Response for product search."""
    success: bool = Field(description="Om søket var vellykket")
    source: str = Field(description="Søkekilde (fuzzy_search, database, llm)")
    query: str = Field(description="Søkeord")
    total: int = Field(description="Totalt antall treff")
    items: List[ProductSearchResult] = Field(description="Søkeresultater")
    page: Optional[int] = Field(description="Gjeldende side")
    pages: Optional[int] = Field(description="Totalt antall sider")
    error: Optional[str] = Field(None, description="Feilmelding hvis søket feilet")


class SearchSuggestionsResponse(BaseModel):
    """Response for search suggestions."""
    query: str = Field(description="Delvis søkeord")
    suggestions: List[str] = Field(description="Foreslåtte søkeord")


class RecentSearchesResponse(BaseModel):
    """Response for recent searches."""
    searches: List[str] = Field(description="Nylige søk")
    total: int = Field(description="Antall søk")


class FrequentProductsResponse(BaseModel):
    """Response for frequent products."""
    products: List[ProductSearchResult] = Field(description="Ofte brukte produkter")
    total: int = Field(description="Antall produkter")


class ProductTrackingRequest(BaseModel):
    """Request for tracking product use."""
    gtin: str = Field(description="GTIN-kode")
    recipe_id: Optional[int] = Field(None, description="Oppskrift ID")
    action: str = Field("use", description="Handling (use, view, add)")


class BulkSearchRequest(BaseModel):
    """Request for bulk product search."""
    gtins: List[str] = Field(description="Liste med GTIN-koder", max_items=100)
    include_nutrition: bool = Field(True, description="Inkluder næringsdata")
    include_allergens: bool = Field(True, description="Inkluder allergener")