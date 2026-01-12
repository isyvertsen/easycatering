"""Product schemas."""
from typing import Optional
from .base import BaseSchema


class ProdukterBase(BaseSchema):
    """Base product schema."""
    produktnavn: Optional[str] = None
    leverandorsproduktnr: Optional[str] = None
    antalleht: Optional[float] = None
    pakningstype: Optional[str] = None
    pakningsstorrelse: Optional[str] = None
    pris: Optional[float] = None
    paknpris: Optional[str] = None
    levrandorid: Optional[int] = None
    kategoriid: Optional[int] = None
    lagermengde: Optional[float] = None
    bestillingsgrense: Optional[float] = None
    bestillingsmengde: Optional[float] = None
    ean_kode: Optional[str] = None
    utgatt: Optional[bool] = None
    oppdatert: Optional[bool] = None
    webshop: Optional[bool] = None
    mvaverdi: Optional[float] = None
    lagerid: Optional[float] = None
    utregningsfaktor: Optional[float] = None
    utregnetpris: Optional[float] = None
    visningsnavn: Optional[str] = None
    visningsnavn2: Optional[str] = None
    rett_komponent: Optional[bool] = None


class ProdukterCreate(ProdukterBase):
    """Schema for creating a product."""
    produktnavn: str


class ProdukterUpdate(ProdukterBase):
    """Schema for updating a product."""
    pass


class Produkter(ProdukterBase):
    """Product response schema."""
    produktid: int
    ssma_timestamp: Optional[str] = None