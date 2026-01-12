"""Order detail schemas."""
from typing import Optional
from datetime import datetime
from .base import BaseSchema


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
    ssma_timestamp: Optional[str] = None