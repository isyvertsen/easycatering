"""Asko NY product schemas.

Asko NY er en produktkatalog fra leverandøren Asko.
"""
from typing import Optional
from .base import BaseSchema


class AskoNyBase(BaseSchema):
    """Base Asko NY product schema."""
    eannummer: Optional[str] = None
    varenavn: Optional[str] = None


class AskoNyCreate(AskoNyBase):
    """Schema for creating an Asko NY product."""
    epdnummer: str
    varenavn: str


class AskoNyUpdate(AskoNyBase):
    """Schema for updating an Asko NY product."""
    pass


class AskoNy(AskoNyBase):
    """Asko NY product response schema."""
    epdnummer: str