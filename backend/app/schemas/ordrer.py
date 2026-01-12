"""Order schemas."""
from typing import Optional, List
from datetime import datetime
from .base import BaseSchema


class OrdrerBase(BaseSchema):
    """Base order schema."""
    kundeid: Optional[int] = None
    ansattid: Optional[int] = None
    kundenavn: Optional[str] = None
    ordredato: Optional[datetime] = None
    leveringsdato: Optional[datetime] = None
    fakturadato: Optional[datetime] = None
    sendestil: Optional[str] = None
    betalingsmate: Optional[int] = None
    lagerok: Optional[bool] = None
    informasjon: Optional[str] = None
    ordrestatusid: Optional[int] = None
    fakturaid: Optional[float] = None
    kansellertdato: Optional[datetime] = None
    sentbekreftelse: Optional[bool] = None
    sentregnskap: Optional[datetime] = None
    ordrelevert: Optional[str] = None
    levertagresso: Optional[str] = None


class OrdrerCreate(OrdrerBase):
    """Schema for creating an order."""
    kundeid: int
    ordredato: datetime = datetime.now()


class OrdrerUpdate(OrdrerBase):
    """Schema for updating an order."""
    pass


class Ordrer(OrdrerBase):
    """Order response schema."""
    ordreid: int
    ssma_timestamp: Optional[str] = None
    kundegruppenavn: Optional[str] = None