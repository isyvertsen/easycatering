"""Order schemas."""
from typing import Optional, List
from datetime import datetime
from pydantic import Field
from .base import BaseSchema


class OrdrerBase(BaseSchema):
    """Base order schema."""
    kundeid: Optional[int] = Field(None, gt=0)
    ansattid: Optional[int] = Field(None, gt=0)
    kundenavn: Optional[str] = Field(None, max_length=200)
    ordredato: Optional[datetime] = None
    leveringsdato: Optional[datetime] = None
    fakturadato: Optional[datetime] = None
    sendestil: Optional[str] = Field(None, max_length=200)
    betalingsmate: Optional[int] = Field(None, ge=0)
    lagerok: Optional[bool] = None
    informasjon: Optional[str] = Field(None, max_length=2000)
    ordrestatusid: Optional[int] = Field(None, ge=0)
    fakturaid: Optional[float] = None
    kansellertdato: Optional[datetime] = None
    sentbekreftelse: Optional[bool] = None
    sentregnskap: Optional[datetime] = None
    ordrelevert: Optional[str] = Field(None, max_length=100)
    levertagresso: Optional[str] = Field(None, max_length=100)


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
    kundegruppenavn: Optional[str] = None