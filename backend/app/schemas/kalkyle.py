"""Recipe calculation schemas."""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseSchema


class KalkyleBase(BaseSchema):
    """Base recipe calculation schema."""
    kalkylenavn: Optional[str] = None
    ansattid: Optional[int] = None
    informasjon: Optional[str] = None
    refporsjon: Optional[str] = None
    kategorikode: Optional[str] = None
    antallporsjoner: Optional[int] = None
    produksjonsmetode: Optional[str] = None
    gruppeid: Optional[int] = None
    alergi: Optional[str] = None
    leveringsdato: Optional[datetime] = None
    merknad: Optional[str] = None
    brukestil: Optional[str] = None
    enhet: Optional[str] = None
    naeringsinnhold: Optional[str] = None
    twporsjon: Optional[float] = None


class KalkyleCreate(KalkyleBase):
    """Schema for creating a recipe calculation."""
    kalkylenavn: str
    ansattid: int


class KalkyleUpdate(KalkyleBase):
    """Schema for updating a recipe calculation."""
    pass


class Kalkyle(KalkyleBase):
    """Recipe calculation response schema."""
    kalkylekode: int
    opprettetdato: Optional[datetime] = None
    revidertdato: Optional[datetime] = None


class KalkyleDetaljerBase(BaseSchema):
    """Base recipe calculation details schema."""
    produktid: int
    produktnavn: Optional[str] = None
    leverandorsproduktnr: Optional[str] = None
    pris: Optional[float] = None
    porsjonsmengde: Optional[int] = None
    enh: Optional[str] = None
    totmeng: Optional[float] = None
    kostpris: Optional[str] = None
    visningsenhet: Optional[str] = None
    svinnprosent: Optional[str] = None
    # Nutrition info
    energikj: Optional[str] = None
    kalorier: Optional[str] = None
    fett: Optional[str] = None
    mettetfett: Optional[str] = None
    karbohydrater: Optional[str] = None
    sukkerarter: Optional[str] = None
    kostfiber: Optional[str] = None
    protein: Optional[str] = None
    salt: Optional[str] = None


class KalkyleDetaljerCreate(KalkyleDetaljerBase):
    """Schema for creating recipe details."""
    pass


class KalkyleDetaljer(KalkyleDetaljerBase):
    """Recipe calculation details response schema."""
    tblkalkyledetaljerid: int
    kalkylekode: int


# New schemas for refactored API
class KalkyleDetaljerSimple(BaseModel):
    """Simplified ingredient schema for API."""
    produktid: Optional[int] = None
    ingrediensnavn: Optional[str] = None
    mengde: Optional[float] = None
    enhet: Optional[str] = None
    pris: Optional[float] = None
    leverandorid: Optional[int] = None
    merknad: Optional[str] = None
    
    class Config:
        from_attributes = True


class KalkyleResponse(BaseModel):
    """Response schema for kalkyle listing."""
    kalkylekode: int
    kalkylenavn: str
    ansattid: Optional[int] = None
    opprettetdato: Optional[datetime] = None
    revidertdato: Optional[datetime] = None
    informasjon: Optional[str] = None
    refporsjon: Optional[str] = None
    kategorikode: Optional[str] = None
    antallporsjoner: Optional[int] = None
    produksjonsmetode: Optional[str] = None
    gruppeid: Optional[int] = None
    alergi: Optional[str] = None
    leveringsdato: Optional[datetime] = None
    merknad: Optional[str] = None
    brukestil: Optional[str] = None
    enhet: Optional[str] = None
    naeringsinnhold: Optional[str] = None
    twporsjon: Optional[float] = None
    
    class Config:
        from_attributes = True


class KalkyleDetailResponse(KalkyleResponse):
    """Response schema with full details including ingredients."""
    detaljer: List[KalkyleDetaljerSimple] = Field(default_factory=list)


class KalkylegruppeResponse(BaseModel):
    """Response schema for kalkyle groups."""
    gruppeid: int
    gruppenavn: str
    beskrivelse: Optional[str] = None
    sortering: Optional[int] = None
    
    class Config:
        from_attributes = True


class KalkyleCostResponse(BaseModel):
    """Response schema for cost calculation."""
    total_cost: float = Field(..., description="Total kostnad for oppskriften")
    cost_per_portion: float = Field(..., description="Kostnad per porsjon")
    portions: int = Field(..., description="Antall porsjoner")
    ingredients: List[Dict[str, Any]] = Field(default_factory=list, description="Kostnad per ingrediens")