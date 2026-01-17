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

    # Multi-level GTINs
    gtin_fpak: Optional[str] = Field(None, max_length=20)
    gtin_dpak: Optional[str] = Field(None, max_length=20)
    gtin_pall: Optional[str] = Field(None, max_length=20)

    utgatt: Optional[bool] = None
    oppdatert: Optional[bool] = None
    webshop: Optional[bool] = None
    mvaverdi: Optional[float] = Field(None, ge=0, le=100)
    lagerid: Optional[float] = None
    utregningsfaktor: Optional[float] = Field(None, ge=0)
    utregnetpris: Optional[float] = Field(None, ge=0)
    visningsnavn: Optional[str] = Field(None, max_length=50)
    visningsnavn2: Optional[str] = Field(None, max_length=50)
    rett_komponent: Optional[bool] = None

    @field_validator('visningsnavn', 'visningsnavn2', mode='before')
    @classmethod
    def truncate_visningsnavn(cls, v):
        """Truncate visningsnavn to max 50 characters."""
        if v is None or v == '':
            return v

        # Convert to string and truncate if too long
        s = str(v)
        if len(s) > 50:
            return s[:50]
        return s

    @field_validator('ean_kode', mode='before')
    @classmethod
    def validate_ean(cls, v):
        """Validate and clean EAN code format."""
        if v is None or v == '':
            return v

        # Convert to string and clean
        cleaned = str(v).strip()

        # Remove leading minus sign if present (legacy data issue)
        if cleaned.startswith('-'):
            cleaned = cleaned[1:]

        # Remove leading zeros if length > 13 (legacy data issue)
        while len(cleaned) > 13 and cleaned.startswith('0'):
            cleaned = cleaned[1:]

        # If still invalid after cleaning, return None instead of raising error
        if not cleaned.isdigit() or len(cleaned) not in (8, 13):
            return None

        return cleaned

    @field_validator('gtin_fpak', 'gtin_dpak', 'gtin_pall', mode='before')
    @classmethod
    def validate_gtin(cls, v):
        """Validate and clean GTIN format."""
        if v is None or v == '':
            return v

        # Convert to string and clean
        cleaned = str(v).strip()

        # Remove leading minus sign if present
        if cleaned.startswith('-'):
            cleaned = cleaned[1:]

        # If empty after cleaning, return None
        if not cleaned:
            return None

        # GTINs should be numeric
        if not cleaned.isdigit():
            return None

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