"""Product schemas."""
from typing import Optional
from pydantic import Field, field_validator
from .base import BaseSchema


class ProdukterBase(BaseSchema):
    """Base product schema."""
    produktnavn: Optional[str] = Field(None, min_length=1, max_length=200)
    leverandorsproduktnr: Optional[str] = Field(None, max_length=50)
    antalleht: Optional[float] = Field(None, ge=0)
    pakningstype: Optional[str] = Field(None, max_length=50)
    pakningsstorrelse: Optional[str] = Field(None, max_length=50)
    pris: Optional[float] = Field(None, ge=0)
    paknpris: Optional[str] = Field(None, max_length=50)
    levrandorid: Optional[int] = None
    kategoriid: Optional[int] = None
    lagermengde: Optional[float] = Field(None, ge=0)
    bestillingsgrense: Optional[float] = Field(None, ge=0)
    bestillingsmengde: Optional[float] = Field(None, ge=0)
    ean_kode: Optional[str] = Field(None, max_length=20)
    utgatt: Optional[bool] = None
    oppdatert: Optional[bool] = None
    webshop: Optional[bool] = None
    mvaverdi: Optional[float] = Field(None, ge=0, le=100)
    lagerid: Optional[float] = None
    utregningsfaktor: Optional[float] = Field(None, ge=0)
    utregnetpris: Optional[float] = Field(None, ge=0)
    visningsnavn: Optional[str] = Field(None, max_length=200)
    visningsnavn2: Optional[str] = Field(None, max_length=200)
    rett_komponent: Optional[bool] = None

    @field_validator('ean_kode', mode='before')
    @classmethod
    def validate_ean(cls, v):
        """Validate EAN code format (8 or 13 digits)."""
        if v is None or v == '':
            return v
        cleaned = str(v).strip()
        if not cleaned.isdigit() or len(cleaned) not in (8, 13):
            raise ValueError('EAN code must be 8 or 13 digits')
        return cleaned


class ProdukterCreate(ProdukterBase):
    """Schema for creating a product."""
    produktnavn: str


class ProdukterUpdate(ProdukterBase):
    """Schema for updating a product."""
    pass


class Produkter(ProdukterBase):
    """Product response schema."""
    produktid: int