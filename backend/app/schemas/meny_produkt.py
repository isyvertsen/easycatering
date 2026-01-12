"""Pydantic schemas for MenyProdukt model."""
from pydantic import BaseModel

from app.schemas.base import BaseSchema


class MenyProduktBase(BaseModel):
    """Base schema for MenyProdukt."""
    menyid: int
    produktid: int


class MenyProduktCreate(MenyProduktBase):
    """Schema for creating a MenyProdukt."""
    pass


class MenyProduktInDB(BaseSchema, MenyProduktBase):
    """Schema for MenyProdukt in database."""
    
    class Config:
        from_attributes = True


class MenyProdukt(MenyProduktInDB):
    """Schema for MenyProdukt response."""
    pass


class MenyProduktWithDetails(MenyProdukt):
    """Schema for MenyProdukt with product details."""
    produkt: "ProdukterBase"
    
    class Config:
        from_attributes = True


# Avoid circular imports
from app.schemas.produkter import ProdukterBase
MenyProduktWithDetails.model_rebuild()