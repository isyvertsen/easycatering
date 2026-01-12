"""Schemas for periode view with complete menu data."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.schemas.base import BaseSchema


class ProduktInMeny(BaseSchema):
    """Produkt med grunnleggende info for menyvisning."""
    produktid: int
    produktnavn: Optional[str] = None
    pris: Optional[float] = None
    pakningstype: Optional[str] = None
    visningsnavn: Optional[str] = None


class MenyMedProdukter(BaseSchema):
    """Meny med alle tilknyttede produkter."""
    menyid: int
    beskrivelse: Optional[str] = None
    menygruppe: Optional[int] = None
    menygruppe_beskrivelse: Optional[str] = None
    produkter: List[ProduktInMeny] = []
    produkt_antall: int = 0


class MenygruppeMedMenyer(BaseSchema):
    """Menygruppe med alle tilknyttede menyer."""
    gruppeid: int
    beskrivelse: Optional[str] = None
    menyer: List[MenyMedProdukter] = []


class PeriodeMedKomplettMeny(BaseSchema):
    """Komplett periode med menyer gruppert etter menygruppe."""
    menyperiodeid: int
    ukenr: Optional[int] = None
    fradato: Optional[datetime] = None
    tildato: Optional[datetime] = None
    menygrupper: List[MenygruppeMedMenyer] = []
    total_menyer: int = 0
    total_produkter: int = 0


class PeriodeViewListResponse(BaseSchema):
    """Paginert respons for periode-visning."""
    items: List[PeriodeMedKomplettMeny]
    total: int
    page: int
    page_size: int
    total_pages: int


class KopierPeriodeRequest(BaseModel):
    """Request for a kopiere en periode med alle menyer."""
    kilde_periode_id: int
    ukenr: int
    fradato: datetime
    tildato: datetime
    kopier_produkter: bool = True


class KopierPeriodeResponse(BaseSchema):
    """Respons etter kopiering av periode."""
    ny_periode_id: int
    kopierte_menyer: int
    kopierte_produkter: int
    message: str


class OpprettMenyIPeriodeRequest(BaseModel):
    """Request for a opprette en ny meny og legge den til i en periode."""
    beskrivelse: str
    menygruppe_id: int
    produkt_ids: List[int] = []


class BulkTilordneMenyerRequest(BaseModel):
    """Request for a tilordne flere menyer til en periode."""
    meny_ids: List[int]


class BulkFjernMenyerRequest(BaseModel):
    """Request for a fjerne flere menyer fra en periode."""
    meny_ids: List[int]
