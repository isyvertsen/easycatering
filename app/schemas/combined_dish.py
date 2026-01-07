"""Schemas for combined dishes."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class CombinedDishRecipeComponent(BaseModel):
    """Oppskriftskomponent i en kombinert rett."""
    kalkylekode: int
    amount_grams: float


class CombinedDishProductComponent(BaseModel):
    """Produktkomponent i en kombinert rett."""
    produktid: int
    amount_grams: float


class CombinedDishCreate(BaseModel):
    """Schema for å opprette en kombinert rett."""
    name: str
    preparation_instructions: Optional[str] = None
    recipes: List[CombinedDishRecipeComponent] = []
    products: List[CombinedDishProductComponent] = []


class CombinedDishUpdate(BaseModel):
    """Schema for å oppdatere en kombinert rett."""
    name: Optional[str] = None
    preparation_instructions: Optional[str] = None
    recipes: Optional[List[CombinedDishRecipeComponent]] = None
    products: Optional[List[CombinedDishProductComponent]] = None


class CombinedDishRecipeComponentResponse(BaseModel):
    """Response for oppskriftskomponent."""
    id: int
    kalkylekode: int
    kalkylenavn: str
    amount_grams: float

    class Config:
        from_attributes = True


class CombinedDishProductComponentResponse(BaseModel):
    """Response for produktkomponent."""
    id: int
    produktid: int
    produktnavn: str
    visningsnavn: Optional[str] = None
    amount_grams: float

    class Config:
        from_attributes = True


class CombinedDishResponse(BaseModel):
    """Response schema for en kombinert rett."""
    id: int
    name: str
    preparation_instructions: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by_user_id: Optional[int] = None
    recipe_components: List[CombinedDishRecipeComponentResponse] = []
    product_components: List[CombinedDishProductComponentResponse] = []

    class Config:
        from_attributes = True


class CombinedDishListResponse(BaseModel):
    """Response for liste over kombinerte retter."""
    items: List[CombinedDishResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
