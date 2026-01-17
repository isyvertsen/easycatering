"""Varebok matching schemas."""
from typing import Optional, List, Dict, Tuple
from pydantic import BaseModel, Field


class VarebokProduct(BaseModel):
    """Product from Varebok CSV."""
    varenummer: str
    nytt_varenummer: Optional[str] = None
    varenavn: str
    ean_d_pakn: Optional[str] = None
    ean_f_pakn: Optional[str] = None
    kategori_navn: Optional[str] = None
    hovedvaregruppe_navn: Optional[str] = None
    mengde: Optional[float] = None
    maleenhet: Optional[str] = None
    pris: Optional[float] = None
    leverandor_navn: Optional[str] = None


class MatchResult(BaseModel):
    """Result of matching a product to Varebok."""
    varebok_product: VarebokProduct
    match_type: str = Field(..., description="ean_exact, varenr_exact, name_fuzzy, combined")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Match confidence 0-1")
    changes: Dict[str, Tuple[Optional[str], Optional[str]]] = Field(
        default_factory=dict,
        description="Fields to change: {field: (old_value, new_value)}"
    )


class RecipeProduct(BaseModel):
    """Product used in recipes."""
    produktid: int
    produktnavn: Optional[str] = None
    ean_kode: Optional[str] = None
    gtin_fpak: Optional[str] = None
    gtin_dpak: Optional[str] = None
    leverandorsproduktnr: Optional[str] = None
    recipe_count: int = Field(..., description="Number of recipes using this product")


class RecipeProductWithMatches(RecipeProduct):
    """Recipe product with match suggestions."""
    matches: List[MatchResult] = Field(default_factory=list)
    best_match: Optional[MatchResult] = None
    has_exact_match: bool = False


class MatchApplyRequest(BaseModel):
    """Request to apply a match."""
    produktid: int
    varebok_varenummer: str
    update_ean: bool = True
    update_name: bool = True
    update_leverandorsproduktnr: bool = True


class MatchApplyResponse(BaseModel):
    """Response after applying a match."""
    success: bool
    produktid: int
    changes_applied: Dict[str, Tuple[Optional[str], Optional[str]]] = Field(
        default_factory=dict,
        description="Changes that were applied: {field: (old, new)}"
    )
    message: str


class VarebokStats(BaseModel):
    """Statistics about Varebok matching."""
    total_recipe_products: int = Field(..., description="Products used in recipes")
    matched_products: int = Field(..., description="Products with exact match")
    partial_matches: int = Field(..., description="Products with fuzzy match only")
    no_matches: int = Field(..., description="Products without any match")
    total_varebok_products: int = Field(..., description="Products in Varebok CSV")


class UploadedFileInfo(BaseModel):
    """Information about an uploaded supplier file."""
    supplier_name: str
    products_count: int
