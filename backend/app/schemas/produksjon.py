"""Production system schemas."""
from typing import Optional, List
from datetime import datetime, date
from pydantic import Field
from .base import BaseSchema


# ============================================================================
# Production Template Schemas
# ============================================================================

class ProduksjonsTemplateDetaljerBase(BaseSchema):
    """Base schema for template details."""
    produktid: Optional[int] = Field(None, gt=0)
    kalkyleid: Optional[int] = Field(None, gt=0)
    standard_antall: Optional[int] = Field(None, ge=0)
    maks_antall: Optional[int] = Field(None, ge=0)
    paakrevd: Optional[bool] = False
    linje_nummer: Optional[int] = Field(None, ge=0)


class ProduksjonsTemplateDetaljerCreate(ProduksjonsTemplateDetaljerBase):
    """Schema for creating template details."""
    pass


class ProduksjonsTemplateDetaljerUpdate(ProduksjonsTemplateDetaljerBase):
    """Schema for updating template details."""
    pass


class ProduksjonsTemplateDetaljer(ProduksjonsTemplateDetaljerBase):
    """Schema for template details response."""
    template_detaljid: int
    template_id: int


class ProduksjonsTemplateBase(BaseSchema):
    """Base schema for production template."""
    template_navn: str = Field(..., min_length=1, max_length=255)
    beskrivelse: Optional[str] = None
    kundegruppe: Optional[int] = Field(12, ge=1)
    gyldig_fra: Optional[date] = None
    gyldig_til: Optional[date] = None
    aktiv: Optional[bool] = True


class ProduksjonsTemplateCreate(ProduksjonsTemplateBase):
    """Schema for creating production template."""
    detaljer: Optional[List[ProduksjonsTemplateDetaljerCreate]] = []


class ProduksjonsTemplateUpdate(ProduksjonsTemplateBase):
    """Schema for updating production template."""
    template_navn: Optional[str] = Field(None, min_length=1, max_length=255)
    detaljer: Optional[List[ProduksjonsTemplateDetaljerCreate]] = None


class ProduksjonsTemplate(ProduksjonsTemplateBase):
    """Schema for production template response."""
    template_id: int
    opprettet_dato: Optional[datetime] = None
    opprettet_av: Optional[int] = None
    detaljer: Optional[List[ProduksjonsTemplateDetaljer]] = []


# ============================================================================
# Production Order Schemas
# ============================================================================

class ProduksjonsDetaljerBase(BaseSchema):
    """Base schema for production order details."""
    produktid: int = Field(..., gt=0)
    produktnavn: Optional[str] = None
    leverandorsproduktnr: Optional[str] = None
    pris: Optional[float] = Field(None, ge=0)
    porsjonsmengde: Optional[float] = Field(None, ge=0)
    enh: Optional[str] = None
    totmeng: Optional[float] = Field(None, ge=0)
    kostpris: Optional[float] = Field(None, ge=0)
    visningsenhet: Optional[str] = None
    dag: Optional[float] = None
    antallporsjoner: Optional[float] = Field(None, ge=0)
    kalkyleid: Optional[int] = Field(None, gt=0)
    kommentar: Optional[str] = None
    linje_nummer: Optional[int] = Field(None, ge=0)


class ProduksjonsDetaljerCreate(ProduksjonsDetaljerBase):
    """Schema for creating production order details."""
    pass


class ProduksjonsDetaljerUpdate(ProduksjonsDetaljerBase):
    """Schema for updating production order details."""
    produktid: Optional[int] = Field(None, gt=0)


class ProduksjonsDetaljer(ProduksjonsDetaljerBase):
    """Schema for production order details response."""
    produksjonskode: int


class ProduksjonsBase(BaseSchema):
    """Base schema for production order."""
    kundeid: int = Field(..., gt=0)
    ansattid: int = Field(..., gt=0)
    informasjon: Optional[str] = None
    refporsjon: Optional[str] = Field(None, max_length=255)
    antallporsjoner: Optional[int] = Field(None, ge=0)
    leveringsdato: Optional[datetime] = None
    merknad: Optional[str] = Field(None, max_length=255)
    template_id: Optional[int] = Field(None, gt=0)
    periodeid: Optional[int] = Field(None, gt=0)
    status: Optional[str] = Field('draft', pattern='^(draft|submitted|approved|rejected|transferred|produced)$')


class ProduksjonsCreate(ProduksjonsBase):
    """Schema for creating production order."""
    detaljer: Optional[List[ProduksjonsDetaljerCreate]] = []


class ProduksjonsUpdate(ProduksjonsBase):
    """Schema for updating production order."""
    kundeid: Optional[int] = Field(None, gt=0)
    ansattid: Optional[int] = Field(None, gt=0)
    status: Optional[str] = Field(None, pattern='^(draft|submitted|approved|rejected|transferred|produced)$')
    detaljer: Optional[List[ProduksjonsDetaljerCreate]] = None


class Produksjon(ProduksjonsBase):
    """Schema for production order response."""
    produksjonkode: int
    created: Optional[datetime] = None
    opprettet_av: Optional[int] = None
    oppdatert_dato: Optional[datetime] = None
    innsendt_dato: Optional[datetime] = None
    godkjent_dato: Optional[datetime] = None
    godkjent_av: Optional[int] = None
    ordre_id: Optional[int] = None
    overfort_dato: Optional[datetime] = None
    overfort_av: Optional[int] = None
    detaljer: Optional[List[ProduksjonsDetaljer]] = []


# ============================================================================
# Special Operation Schemas
# ============================================================================

class DistributeTemplateRequest(BaseSchema):
    """Schema for distributing template to customers."""
    template_id: int = Field(..., gt=0)
    kunde_ids: Optional[List[int]] = Field(None, description="Specific customer IDs, or None for all in kundegruppe")


class ApproveProductionRequest(BaseSchema):
    """Schema for approving production orders."""
    produksjonskode_list: List[int] = Field(..., min_length=1)
    godkjent_av: int = Field(..., gt=0)


class TransferToOrderRequest(BaseSchema):
    """Schema for transferring production to order."""
    produksjonskode: int = Field(..., gt=0)
    leveringsdato: Optional[date] = None


class BulkTransferToOrderRequest(BaseSchema):
    """Schema for bulk transfer of production orders."""
    produksjonskode_list: List[int] = Field(..., min_length=1)
    leveringsdato: Optional[date] = None
