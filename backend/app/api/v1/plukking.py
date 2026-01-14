"""Picking workflow API endpoints."""
from datetime import datetime
from typing import Optional, List
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from pydantic import BaseModel

from app.api.deps import get_db, get_current_active_user
from app.domain.entities.user import User
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.models.ordrestatus import Ordrestatus
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe
from app.schemas.ordredetaljer import RegisterPickRequest
from app.services.pick_list_scanner_service import get_pick_list_scanner_service

router = APIRouter(prefix="/plukking", tags=["Plukking"])

# Ordrestatus IDs from tblordrestatus
ORDRESTATUS_PLUKKLISTE = 25  # Klar til plukking
ORDRESTATUS_PLUKKET = 30     # Plukket


class OrdreForPlukking(BaseModel):
    """Order for picking list."""
    ordreid: int
    kundenavn: Optional[str]
    kundeid: Optional[int]
    kundegruppe_navn: Optional[str]
    kundegruppe_id: Optional[int]
    leveringsdato: Optional[datetime]
    ordredato: Optional[datetime]
    plukket_dato: Optional[datetime]
    plukket_av_navn: Optional[str]
    pakkseddel_skrevet: Optional[datetime]
    antall_produkter: int = 0
    ordrestatusid: Optional[int] = None
    ordrestatus_navn: Optional[str] = None

    class Config:
        from_attributes = True


class PlukkingListResponse(BaseModel):
    """Response for picking list."""
    items: List[OrdreForPlukking]
    total: int
    page: int
    page_size: int
    total_pages: int


class PlukkingStats(BaseModel):
    """Statistics for picking."""
    total_ordrer: int
    klar_til_plukking: int
    plukket: int


class UpdateOrdreStatusRequest(BaseModel):
    """Request to update order status."""
    ordrestatusid: int


class UpdateOrdreStatusResponse(BaseModel):
    """Response after updating order status."""
    ordreid: int
    ordrestatusid: int
    ordrestatus_navn: Optional[str]
    plukket_dato: Optional[datetime]
    plukket_av_navn: Optional[str]
    message: str


@router.get("/", response_model=PlukkingListResponse)
async def get_plukking_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    kundegruppe_id: Optional[int] = Query(None, description="Filter by customer group"),
    ordrestatusid: Optional[int] = Query(None, description="Filter by order status ID"),
    leveringsdato_fra: Optional[datetime] = Query(None, description="Delivery date from"),
    leveringsdato_til: Optional[datetime] = Query(None, description="Delivery date to"),
    include_cancelled: bool = Query(False, description="Include cancelled orders"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get list of orders for picking workflow.

    Can filter by:
    - kundegruppe_id: Customer group ID
    - ordrestatusid: Filter by order status (25=Plukkliste, 30=Plukket)
    - leveringsdato_fra/til: Delivery date range
    """
    # Build query
    query = (
        select(Ordrer)
        .options(
            joinedload(Ordrer.kunde).joinedload(Kunder.gruppe),
            joinedload(Ordrer.plukker),
            joinedload(Ordrer.detaljer),
            joinedload(Ordrer.status),
        )
    )

    # Base filters
    conditions = []

    # Exclude cancelled unless explicitly included
    if not include_cancelled:
        conditions.append(Ordrer.kansellertdato.is_(None))

    # Filter by kundegruppe
    if kundegruppe_id is not None:
        query = query.join(Ordrer.kunde)
        conditions.append(Kunder.kundegruppe == kundegruppe_id)

    # Filter by ordrestatusid
    if ordrestatusid is not None:
        conditions.append(Ordrer.ordrestatusid == ordrestatusid)

    # Filter by delivery date range
    if leveringsdato_fra:
        conditions.append(Ordrer.leveringsdato >= leveringsdato_fra)
    if leveringsdato_til:
        conditions.append(Ordrer.leveringsdato <= leveringsdato_til)

    if conditions:
        query = query.where(and_(*conditions))

    # Order by delivery date
    query = query.order_by(Ordrer.leveringsdato.asc(), Ordrer.ordreid.asc())

    # Count total
    count_query = select(func.count()).select_from(Ordrer)
    if conditions:
        if kundegruppe_id is not None:
            count_query = count_query.join(Ordrer.kunde)
        count_query = count_query.where(and_(*conditions))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    orders = result.unique().scalars().all()

    # Transform to response
    items = []
    for ordre in orders:
        item = OrdreForPlukking(
            ordreid=ordre.ordreid,
            kundenavn=ordre.kundenavn,
            kundeid=ordre.kundeid,
            kundegruppe_navn=ordre.kunde.gruppe.gruppe if ordre.kunde and ordre.kunde.gruppe else None,
            kundegruppe_id=ordre.kunde.kundegruppe if ordre.kunde else None,
            leveringsdato=ordre.leveringsdato,
            ordredato=ordre.ordredato,
            plukket_dato=ordre.plukket_dato,
            plukket_av_navn=ordre.plukker.full_name if ordre.plukker else None,
            pakkseddel_skrevet=ordre.pakkseddel_skrevet,
            antall_produkter=len(ordre.detaljer) if ordre.detaljer else 0,
            ordrestatusid=ordre.ordrestatusid,
            ordrestatus_navn=ordre.status.status if ordre.status else None,
        )
        items.append(item)

    return PlukkingListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 1,
    )


@router.get("/stats", response_model=PlukkingStats)
async def get_plukking_stats(
    kundegruppe_id: Optional[int] = Query(None, description="Filter by customer group"),
    leveringsdato_fra: Optional[datetime] = Query(None, description="Delivery date from"),
    leveringsdato_til: Optional[datetime] = Query(None, description="Delivery date to"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get statistics for picking workflow based on ordrestatusid."""
    # Base query conditions (exclude cancelled)
    base_conditions = [Ordrer.kansellertdato.is_(None)]

    if leveringsdato_fra:
        base_conditions.append(Ordrer.leveringsdato >= leveringsdato_fra)
    if leveringsdato_til:
        base_conditions.append(Ordrer.leveringsdato <= leveringsdato_til)

    # Count by ordrestatusid
    async def count_by_ordrestatus(status_id: int) -> int:
        if kundegruppe_id is not None:
            q = (
                select(func.count(Ordrer.ordreid))
                .join(Ordrer.kunde)
                .where(and_(*base_conditions, Ordrer.ordrestatusid == status_id, Kunder.kundegruppe == kundegruppe_id))
            )
        else:
            q = select(func.count(Ordrer.ordreid)).where(and_(*base_conditions, Ordrer.ordrestatusid == status_id))

        res = await db.execute(q)
        return res.scalar() or 0

    # Count total orders
    if kundegruppe_id is not None:
        total_query = (
            select(func.count(Ordrer.ordreid))
            .join(Ordrer.kunde)
            .where(and_(*base_conditions, Kunder.kundegruppe == kundegruppe_id))
        )
    else:
        total_query = select(func.count(Ordrer.ordreid)).where(and_(*base_conditions))

    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    klar_til_plukking = await count_by_ordrestatus(ORDRESTATUS_PLUKKLISTE)
    plukket = await count_by_ordrestatus(ORDRESTATUS_PLUKKET)

    return PlukkingStats(
        total_ordrer=total,
        klar_til_plukking=klar_til_plukking,
        plukket=plukket,
    )


@router.get("/kundegrupper")
async def get_kundegrupper_for_plukking(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of customer groups for filtering."""
    query = select(Kundegruppe).order_by(Kundegruppe.gruppe)
    result = await db.execute(query)
    groups = result.scalars().all()

    return [
        {"gruppeid": g.gruppeid, "gruppe": g.gruppe}
        for g in groups
    ]


@router.put("/{ordre_id}/status", response_model=UpdateOrdreStatusResponse)
async def update_ordrestatus(
    ordre_id: int,
    request: UpdateOrdreStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update order status (ordrestatusid).

    When setting to PLUKKET (30), automatically sets plukket_dato and plukket_av.
    """
    # Get order with status
    result = await db.execute(
        select(Ordrer).options(joinedload(Ordrer.status)).where(Ordrer.ordreid == ordre_id)
    )
    ordre = result.unique().scalar_one_or_none()

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    if ordre.kansellertdato:
        raise HTTPException(status_code=400, detail="Kan ikke endre status på kansellert ordre")

    # Update ordrestatusid
    ordre.ordrestatusid = request.ordrestatusid

    # If marking as picked (30), set timestamp and user
    if request.ordrestatusid == ORDRESTATUS_PLUKKET:
        ordre.plukket_dato = datetime.utcnow()
        ordre.plukket_av = current_user.id
    elif request.ordrestatusid == ORDRESTATUS_PLUKKLISTE:
        # Reset picked info when changing back to ready
        ordre.plukket_dato = None
        ordre.plukket_av = None

    await db.commit()

    # Get status name
    status_result = await db.execute(
        select(Ordrestatus).where(Ordrestatus.statusid == request.ordrestatusid)
    )
    status = status_result.scalar_one_or_none()

    return UpdateOrdreStatusResponse(
        ordreid=ordre.ordreid,
        ordrestatusid=ordre.ordrestatusid,
        ordrestatus_navn=status.status if status else None,
        plukket_dato=ordre.plukket_dato,
        plukket_av_navn=current_user.full_name if ordre.plukket_av else None,
        message=f"Ordrestatus oppdatert til {status.status if status else request.ordrestatusid}",
    )


@router.post("/{ordre_id}/marker-pakkseddel")
async def marker_pakkseddel_skrevet(
    ordre_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark that packing slip has been printed for an order."""
    result = await db.execute(
        select(Ordrer).where(Ordrer.ordreid == ordre_id)
    )
    ordre = result.scalar_one_or_none()

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    ordre.pakkseddel_skrevet = datetime.utcnow()
    await db.commit()

    return {"message": "Pakkseddel markert som skrevet", "tidspunkt": ordre.pakkseddel_skrevet}


@router.post("/bulk-update-status")
async def bulk_update_ordrestatus(
    ordre_ids: List[int],
    ordrestatusid: int = Query(..., description="New order status ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update order status for multiple orders at once."""
    # Get orders
    result = await db.execute(
        select(Ordrer).where(
            and_(
                Ordrer.ordreid.in_(ordre_ids),
                Ordrer.kansellertdato.is_(None)
            )
        )
    )
    orders = result.scalars().all()

    if not orders:
        raise HTTPException(status_code=404, detail="Ingen gyldige ordrer funnet")

    # Get status name
    status_result = await db.execute(
        select(Ordrestatus).where(Ordrestatus.statusid == ordrestatusid)
    )
    status = status_result.scalar_one_or_none()
    status_navn = status.status if status else str(ordrestatusid)

    updated_count = 0
    for ordre in orders:
        ordre.ordrestatusid = ordrestatusid

        if ordrestatusid == ORDRESTATUS_PLUKKET:
            ordre.plukket_dato = datetime.utcnow()
            ordre.plukket_av = current_user.id
        elif ordrestatusid == ORDRESTATUS_PLUKKLISTE:
            ordre.plukket_dato = None
            ordre.plukket_av = None

        updated_count += 1

    await db.commit()

    return {
        "message": f"{updated_count} ordrer oppdatert til {status_navn}",
        "updated_count": updated_count,
    }


class PickDetailLine(BaseModel):
    """Order line details for pick registration."""
    produktid: int
    unik: int
    produktnavn: Optional[str]
    antall: float
    plukket_antall: Optional[float]
    enhet: Optional[str]

    class Config:
        from_attributes = True


class PickDetailsResponse(BaseModel):
    """Response with order details for pick registration."""
    ordreid: int
    kundenavn: Optional[str]
    leveringsdato: Optional[datetime]
    plukkstatus: Optional[str]
    lines: List[PickDetailLine]


@router.get("/{ordre_id}/plukkdetaljer", response_model=PickDetailsResponse)
async def get_pick_details(
    ordre_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get order details for pick registration.

    Returns the order with all order lines, including ordered and picked quantities.
    """
    result = await db.execute(
        select(Ordrer)
        .options(joinedload(Ordrer.detaljer).joinedload(Ordredetaljer.produkt))
        .where(Ordrer.ordreid == ordre_id)
    )
    ordre = result.unique().scalar_one_or_none()

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    lines = []
    for detalj in ordre.detaljer or []:
        lines.append(PickDetailLine(
            produktid=detalj.produktid,
            unik=detalj.unik,
            produktnavn=detalj.produkt.produktnavn if detalj.produkt else None,
            antall=detalj.antall or 0,
            plukket_antall=detalj.plukket_antall,
            enhet=detalj.produkt.pakningstype if detalj.produkt else "stk",
        ))

    return PickDetailsResponse(
        ordreid=ordre.ordreid,
        kundenavn=ordre.kundenavn,
        leveringsdato=ordre.leveringsdato,
        plukkstatus=ordre.plukkstatus,
        lines=lines,
    )


@router.post("/{ordre_id}/registrer-plukk")
async def register_pick_quantities(
    ordre_id: int,
    request: RegisterPickRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Register picked quantities for order lines.

    Updates the plukket_antall field for each order line and sets
    the order status to PLUKKET.
    """
    # Verify order exists
    ordre_result = await db.execute(
        select(Ordrer).where(Ordrer.ordreid == ordre_id)
    )
    ordre = ordre_result.scalar_one_or_none()

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    if ordre.kansellertdato:
        raise HTTPException(status_code=400, detail="Kan ikke registrere plukk på kansellert ordre")

    # Update each line
    updated_count = 0
    for line_input in request.lines:
        result = await db.execute(
            select(Ordredetaljer).where(
                and_(
                    Ordredetaljer.ordreid == ordre_id,
                    Ordredetaljer.produktid == line_input.produktid,
                    Ordredetaljer.unik == line_input.unik,
                )
            )
        )
        detalj = result.scalar_one_or_none()

        if detalj:
            detalj.plukket_antall = line_input.plukket_antall
            updated_count += 1

    # Update order status to PLUKKET
    ordre.ordrestatusid = ORDRESTATUS_PLUKKET
    ordre.plukket_dato = datetime.utcnow()
    ordre.plukket_av = current_user.id

    await db.commit()

    return {
        "message": f"Plukk registrert for {updated_count} linjer",
        "updated_count": updated_count,
        "ordreid": ordre_id,
        "ordrestatusid": ordre.ordrestatusid,
    }


class ScanPickListRequest(BaseModel):
    """Request body for scanning a pick list image."""
    image_base64: str


class ScannedLine(BaseModel):
    """A scanned line result."""
    produktid: int
    unik: int
    plukket_antall: float


class ScanPickListResponse(BaseModel):
    """Response from scanning a pick list."""
    success: bool
    lines: List[ScannedLine]
    confidence: float
    notes: str
    error: Optional[str] = None


@router.post("/{ordre_id}/scan-plukkliste", response_model=ScanPickListResponse)
async def scan_pick_list(
    ordre_id: int,
    request: ScanPickListRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Scan a pick list image and extract picked quantities using AI Vision.

    The image should be a base64 encoded JPEG/PNG of a filled-out pick list.
    The AI will attempt to read handwritten quantities and match them to order lines.
    """
    # Get order details
    result = await db.execute(
        select(Ordrer)
        .options(joinedload(Ordrer.detaljer).joinedload(Ordredetaljer.produkt))
        .where(Ordrer.ordreid == ordre_id)
    )
    ordre = result.unique().scalar_one_or_none()

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    # Prepare order lines for the scanner
    order_lines = []
    for detalj in ordre.detaljer or []:
        order_lines.append({
            "produktid": detalj.produktid,
            "unik": detalj.unik,
            "produktnavn": detalj.produkt.produktnavn if detalj.produkt else f"Produkt {detalj.produktid}",
            "antall": detalj.antall or 0
        })

    # Scan the image
    scanner = get_pick_list_scanner_service()
    scan_result = await scanner.analyze_pick_list_image(
        image_base64=request.image_base64,
        order_lines=order_lines
    )

    return ScanPickListResponse(
        success=scan_result["success"],
        lines=[ScannedLine(**line) for line in scan_result.get("lines", [])],
        confidence=scan_result.get("confidence", 0.0),
        notes=scan_result.get("notes", ""),
        error=scan_result.get("error")
    )
