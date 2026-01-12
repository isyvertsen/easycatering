"""Webshop schemas for customer ordering."""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from .base import BaseSchema


# =============================================================================
# Product schemas
# =============================================================================

class WebshopProduct(BaseSchema):
    """Product available in webshop."""
    produktid: int
    produktnavn: Optional[str] = None
    visningsnavn: Optional[str] = None
    pris: Optional[float] = None
    pakningstype: Optional[str] = None
    pakningsstorrelse: Optional[str] = None
    kategoriid: Optional[int] = None
    ean_kode: Optional[str] = None


class WebshopProductListResponse(BaseSchema):
    """Paginated response for webshop products."""
    items: List[WebshopProduct]
    total: int
    page: int
    page_size: int
    total_pages: int


# =============================================================================
# Order schemas
# =============================================================================

class WebshopOrderLineCreate(BaseModel):
    """Single order line when creating an order."""
    produktid: int
    antall: float = Field(..., gt=0)
    pris: Optional[float] = None  # If not provided, use product price


class WebshopOrderCreate(BaseModel):
    """Schema for creating a webshop order."""
    ordrelinjer: List[WebshopOrderLineCreate]
    leveringsdato: Optional[datetime] = None
    informasjon: Optional[str] = None


class WebshopOrderLine(BaseSchema):
    """Order line in response."""
    produktid: int
    produktnavn: Optional[str] = None
    visningsnavn: Optional[str] = None
    antall: float
    pris: float
    total: float


class WebshopOrder(BaseSchema):
    """Order response schema."""
    ordreid: int
    kundeid: Optional[int] = None
    kundenavn: Optional[str] = None
    ordredato: Optional[datetime] = None
    leveringsdato: Optional[datetime] = None
    informasjon: Optional[str] = None
    ordrestatusid: Optional[int] = None
    ordrestatus_navn: Optional[str] = None


class WebshopOrderDetail(WebshopOrder):
    """Order with order lines."""
    ordrelinjer: List[WebshopOrderLine] = []
    total_sum: float = 0


class WebshopOrderCreateResponse(BaseSchema):
    """Response after creating an order."""
    ordre: WebshopOrder
    message: str
    email_token: Optional[str] = None


class WebshopOrderListResponse(BaseSchema):
    """Paginated response for orders."""
    items: List[WebshopOrder]
    total: int
    page: int
    page_size: int
    total_pages: int


# =============================================================================
# Order by token (public access)
# =============================================================================

class WebshopOrderByTokenResponse(BaseSchema):
    """Response when fetching order by token."""
    ordre: WebshopOrder
    ordrelinjer: List[WebshopOrderLine]
    token_utlopt: bool = False
    token_utloper: Optional[datetime] = None


# =============================================================================
# Admin approval schemas
# =============================================================================

class WebshopOrderStatusUpdate(BaseModel):
    """Schema for updating order status.

    Valid statuses from tblordrestatus:
    10=Startet, 15=Bestilt, 20=Godkjent, 25=Plukkliste skrevet,
    30=Plukket, 35=Pakkliste skrevet, 80=Godkjent av mottaker,
    85=Fakturert, 90=Sendt til regnskap, 95=Kreditert,
    98=For sen kansellering, 99=Kansellert
    """
    ordrestatusid: int = Field(..., ge=10, le=99)


class WebshopBatchApproveRequest(BaseModel):
    """Schema for batch approving orders."""
    ordre_ids: List[int]
    ordrestatusid: int = Field(..., ge=10, le=99)


class WebshopBatchApproveResponse(BaseSchema):
    """Response after batch approval."""
    message: str
    updated_count: int


# =============================================================================
# Webshop access check
# =============================================================================

class WebshopAccessResponse(BaseSchema):
    """Response for webshop access check."""
    has_access: bool
    kunde_navn: Optional[str] = None
    kundegruppe_navn: Optional[str] = None
    message: Optional[str] = None


# =============================================================================
# Cancellation schemas
# =============================================================================

class WebshopCancelRequest(BaseModel):
    """Schema for cancelling an order.

    Status values:
    - 98 = For sen kansellering (customer cancelled after deadline)
    - 99 = Kansellert (normal cancellation)
    """
    arsak: Optional[str] = Field(None, description="Reason for cancellation")
    for_sen: bool = Field(False, description="True if cancelled after deadline (status 98)")


class WebshopCancelResponse(BaseSchema):
    """Response after cancelling an order."""
    message: str
    ordrestatusid: int


# =============================================================================
# Draft order schemas (auto-save)
# =============================================================================

class WebshopDraftOrderLineUpdate(BaseModel):
    """Single order line for draft order update."""
    produktid: int
    antall: float = Field(..., gt=0)
    pris: Optional[float] = None


class WebshopDraftOrderUpdate(BaseModel):
    """Schema for updating a draft order's lines."""
    ordrelinjer: List[WebshopDraftOrderLineUpdate]


class WebshopDraftOrder(BaseSchema):
    """Draft order response."""
    ordreid: int
    kundeid: Optional[int] = None
    kundenavn: Optional[str] = None
    ordredato: Optional[datetime] = None
    ordrestatusid: int
    ordrelinjer: List[WebshopOrderLine] = []
    total_sum: float = 0
