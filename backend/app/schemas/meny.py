"""Menu schemas."""
from typing import Optional, List
from .base import BaseSchema


class MenyBase(BaseSchema):
    """Base menu schema."""
    beskrivelse: Optional[str] = None
    menygruppe: Optional[int] = None


class MenyCreate(MenyBase):
    """Schema for creating a menu."""
    beskrivelse: str


class MenyUpdate(MenyBase):
    """Schema for updating a menu."""
    pass


class Meny(MenyBase):
    """Menu response schema."""
    menyid: int


class MenyWithProducts(Meny):
    """Menu with associated products."""
    produkter: List["ProdukterBase"] = []
    
    class Config:
        from_attributes = True


class MenyWithPeriods(Meny):
    """Menu with associated periods."""
    perioder: List["PeriodeBase"] = []
    
    class Config:
        from_attributes = True


# Avoid circular imports - will be rebuilt after imports
from app.schemas.produkter import ProdukterBase
from app.schemas.periode import PeriodeBase
MenyWithProducts.model_rebuild()
MenyWithPeriods.model_rebuild()