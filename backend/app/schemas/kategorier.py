"""Category schemas."""
from typing import Optional
from .base import BaseSchema


class KategorierBase(BaseSchema):
    """Base category schema."""
    kategori: Optional[str] = None
    beskrivelse: Optional[str] = None


class KategorierCreate(KategorierBase):
    """Schema for creating a category."""
    kategori: str


class KategorierUpdate(KategorierBase):
    """Schema for updating a category."""
    pass


class Kategorier(KategorierBase):
    """Category response schema."""
    kategoriid: int
    ssma_timestamp: Optional[str] = None