"""Customer schemas."""
from typing import Optional
from datetime import datetime
from .base import BaseSchema


class KunderBase(BaseSchema):
    """Base customer schema."""
    kundenavn: Optional[str] = None
    avdeling: Optional[str] = None
    kontaktid: Optional[str] = None
    telefonnummer: Optional[str] = None
    bestillernr: Optional[str] = None
    lopenr: Optional[float] = None
    merknad: Optional[str] = None
    adresse: Optional[str] = None
    postboks: Optional[float] = None
    postnr: Optional[str] = None
    sted: Optional[str] = None
    velgsone: Optional[int] = None
    leveringsdag: Optional[int] = None
    kundeinaktiv: Optional[bool] = None
    kundenragresso: Optional[float] = None
    e_post: Optional[str] = None
    webside: Optional[str] = None
    kundegruppe: Optional[int] = None
    bestillerselv: Optional[bool] = None
    rute: Optional[int] = None
    menyinfo: Optional[str] = None
    ansattid: Optional[int] = None
    sjaforparute: Optional[float] = None
    diett: Optional[bool] = None
    menygruppeid: Optional[float] = None
    utdato: Optional[datetime] = None
    inndato: Optional[datetime] = None
    avsluttet: Optional[bool] = None
    eksportkatalog: Optional[str] = None
    mobilnummer: Optional[str] = None
    formkost: Optional[bool] = None
    sykehjemid: Optional[int] = None
    e_post2: Optional[str] = None


class KunderCreate(KunderBase):
    """Schema for creating a customer."""
    kundenavn: str


class KunderUpdate(KunderBase):
    """Schema for updating a customer."""
    pass


class Kunder(KunderBase):
    """Customer response schema."""
    kundeid: int
    ssma_timestamp: Optional[str] = None