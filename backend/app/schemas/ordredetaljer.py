"""Order detail schemas."""
from typing import Optional
from datetime import datetime
from .base import BaseSchema


class ProduktInfo(BaseSchema):
    """Minimal product info for order lines."""
    produktid: int
    produktnavn: Optional[str] = None


class OrdredetaljerBase(BaseSchema):
    """Base order detail schema."""
    produktid: int
    levdato: Optional[datetime] = None
    pris: Optional[float] = None
    antall: float
    rabatt: Optional[float] = None
    ident: Optional[str] = None


class OrdredetaljerCreate(OrdredetaljerBase):
    """Schema for creating order detail."""
    pass


class Ordredetaljer(OrdredetaljerBase):
    """Order detail response schema."""
    ordreid: int
    unik: int
    plukket_antall: Optional[float] = None
    produkt: Optional[ProduktInfo] = None


class PickedLineInput(BaseSchema):
    """Input schema for registering picked quantity."""
    produktid: int
    unik: int
    plukket_antall: float


class RegisterPickRequest(BaseSchema):
    """Request schema for registering pick quantities."""
    lines: list[PickedLineInput]