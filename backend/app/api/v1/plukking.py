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
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe

router = APIRouter(prefix="/plukking", tags=["Plukking"])


class PlukkStatus(str, Enum):
    """Picking status values."""
    KLAR_TIL_PLUKKING = "KLAR_TIL_PLUKKING"
    PLUKKET = "PLUKKET"


class OrdreForPlukking(BaseModel):
    """Order for picking list."""
    ordreid: int
    kundenavn: Optional[str]
    kundeid: Optional[int]
    kundegruppe_navn: Optional[str]
    kundegruppe_id: Optional[int]
    leveringsdato: Optional[datetime]
    ordredato: Optional[datetime]
    plukkstatus: Optional[str]
    plukket_dato: Optional[datetime]
    plukket_av_navn: Optional[str]
    pakkseddel_skrevet: Optional[datetime]
    antall_produkter: int = 0

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
    uten_status: int


class UpdatePlukkStatusRequest(BaseModel):
    """Request to update picking status."""
    plukkstatus: PlukkStatus


class UpdatePlukkStatusResponse(BaseModel):
    """Response after updating picking status."""
    ordreid: int
    plukkstatus: str
    plukket_dato: Optional[datetime]
    plukket_av_navn: Optional[str]
    message: str


@router.get("/", response_model=PlukkingListResponse)
async def get_plukking_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    kundegruppe_id: Optional[int] = Query(None, description="Filter by customer group"),
    plukkstatus: Optional[str] = Query(None, description="Filter by picking status"),
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
    - plukkstatus: KLAR_TIL_PLUKKING, PLUKKET, or NULL for no status
    - leveringsdato_fra/til: Delivery date range
    """
    # Build query
    query = (
        select(Ordrer)
        .options(
            joinedload(Ordrer.kunde).joinedload(Kunder.gruppe),
            joinedload(Ordrer.plukker)
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

    # Filter by plukkstatus
    if plukkstatus:
        if plukkstatus == "NULL":
            conditions.append(Ordrer.plukkstatus.is_(None))
        else:
            conditions.append(Ordrer.plukkstatus == plukkstatus)

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
            plukkstatus=ordre.plukkstatus,
            plukket_dato=ordre.plukket_dato,
            plukket_av_navn=ordre.plukker.name if ordre.plukker else None,
            pakkseddel_skrevet=ordre.pakkseddel_skrevet,
            antall_produkter=len(ordre.detaljer) if ordre.detaljer else 0,
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
    """Get statistics for picking workflow."""
    # Base query conditions (exclude cancelled)
    base_conditions = [Ordrer.kansellertdato.is_(None)]

    if kundegruppe_id is not None:
        # Need to join with Kunder for group filter
        pass

    if leveringsdato_fra:
        base_conditions.append(Ordrer.leveringsdato >= leveringsdato_fra)
    if leveringsdato_til:
        base_conditions.append(Ordrer.leveringsdato <= leveringsdato_til)

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

    # Count by status
    async def count_by_status(status_value):
        if status_value is None:
            status_condition = Ordrer.plukkstatus.is_(None)
        else:
            status_condition = Ordrer.plukkstatus == status_value

        if kundegruppe_id is not None:
            q = (
                select(func.count(Ordrer.ordreid))
                .join(Ordrer.kunde)
                .where(and_(*base_conditions, status_condition, Kunder.kundegruppe == kundegruppe_id))
            )
        else:
            q = select(func.count(Ordrer.ordreid)).where(and_(*base_conditions, status_condition))

        res = await db.execute(q)
        return res.scalar() or 0

    klar_til_plukking = await count_by_status(PlukkStatus.KLAR_TIL_PLUKKING.value)
    plukket = await count_by_status(PlukkStatus.PLUKKET.value)
    uten_status = await count_by_status(None)

    return PlukkingStats(
        total_ordrer=total,
        klar_til_plukking=klar_til_plukking,
        plukket=plukket,
        uten_status=uten_status,
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


@router.put("/{ordre_id}/status", response_model=UpdatePlukkStatusResponse)
async def update_plukkstatus(
    ordre_id: int,
    request: UpdatePlukkStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update picking status for an order.

    When setting to PLUKKET, automatically sets plukket_dato and plukket_av.
    """
    # Get order
    result = await db.execute(
        select(Ordrer).where(Ordrer.ordreid == ordre_id)
    )
    ordre = result.scalar_one_or_none()

    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    if ordre.kansellertdato:
        raise HTTPException(status_code=400, detail="Kan ikke endre status på kansellert ordre")

    # Update status
    ordre.plukkstatus = request.plukkstatus.value

    # If marking as picked, set timestamp and user
    if request.plukkstatus == PlukkStatus.PLUKKET:
        ordre.plukket_dato = datetime.utcnow()
        ordre.plukket_av = current_user.id
    elif request.plukkstatus == PlukkStatus.KLAR_TIL_PLUKKING:
        # Reset picked info when changing back to ready
        ordre.plukket_dato = None
        ordre.plukket_av = None

    await db.commit()
    await db.refresh(ordre)

    return UpdatePlukkStatusResponse(
        ordreid=ordre.ordreid,
        plukkstatus=ordre.plukkstatus,
        plukket_dato=ordre.plukket_dato,
        plukket_av_navn=current_user.name if ordre.plukket_av else None,
        message=f"Plukkstatus oppdatert til {request.plukkstatus.value}",
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
async def bulk_update_plukkstatus(
    ordre_ids: List[int],
    plukkstatus: PlukkStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update picking status for multiple orders at once."""
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

    updated_count = 0
    for ordre in orders:
        ordre.plukkstatus = plukkstatus.value

        if plukkstatus == PlukkStatus.PLUKKET:
            ordre.plukket_dato = datetime.utcnow()
            ordre.plukket_av = current_user.id
        elif plukkstatus == PlukkStatus.KLAR_TIL_PLUKKING:
            ordre.plukket_dato = None
            ordre.plukket_av = None

        updated_count += 1

    await db.commit()

    return {
        "message": f"{updated_count} ordrer oppdatert til {plukkstatus.value}",
        "updated_count": updated_count,
    }
