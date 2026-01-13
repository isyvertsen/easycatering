"""Order API endpoints."""
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.ordrer import Ordrer as OrdrerModel
from app.models.ordredetaljer import Ordredetaljer as OrdredetaljerModel
from app.models.kunder import Kunder as KunderModel
from app.schemas.ordrer import Ordrer, OrdrerCreate, OrdrerUpdate
from app.schemas.ordredetaljer import Ordredetaljer, OrdredetaljerCreate
from app.schemas.pagination import PaginatedResponse
from app.services.order_status_service import OrderStatusService, OrderStatusError

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[Ordrer])
async def get_ordrer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, max_length=200, description="Search by customer name or order ID"),
    kunde_id: Optional[int] = Query(None, description="Filter by customer ID"),
    fra_dato: Optional[date] = Query(None, description="From date"),
    til_dato: Optional[date] = Query(None, description="To date"),
    kundegruppe_ids: Optional[List[int]] = Query(None, description="Filter by customer group IDs"),
    status_ids: Optional[List[int]] = Query(None, description="Filter by order status IDs"),
    sort_by: Optional[str] = Query("leveringsdato", description="Sort field (leveringsdato or ordredato)"),
    sort_order: Optional[str] = Query("asc", description="Sort order (asc or desc)"),
) -> PaginatedResponse[Ordrer]:
    """Get all orders."""
    from sqlalchemy import or_, cast, String

    # Base query for counting
    count_query = select(func.count()).select_from(OrdrerModel)

    # Data query with customer join
    query = select(OrdrerModel).options(joinedload(OrdrerModel.kunde))

    # Search filter - search by customer name or order ID
    if search:
        search_term = f"%{search}%"
        # Join with customers for search
        count_query = count_query.outerjoin(KunderModel, OrdrerModel.kundeid == KunderModel.kundeid)
        query = query.outerjoin(KunderModel, OrdrerModel.kundeid == KunderModel.kundeid, full=False)

        try:
            # If search is a number, also search by order ID
            order_id = int(search)
            search_filter = or_(
                KunderModel.kundenavn.ilike(search_term),
                OrdrerModel.ordreid == order_id,
                OrdrerModel.kundenavn.ilike(search_term),
            )
        except ValueError:
            search_filter = or_(
                KunderModel.kundenavn.ilike(search_term),
                OrdrerModel.kundenavn.ilike(search_term),
            )

        count_query = count_query.where(search_filter)
        query = query.where(search_filter)

    # Apply filters to both queries
    if kunde_id:
        count_query = count_query.where(OrdrerModel.kundeid == kunde_id)
        query = query.where(OrdrerModel.kundeid == kunde_id)
    
    if fra_dato:
        count_query = count_query.where(OrdrerModel.ordredato >= fra_dato)
        query = query.where(OrdrerModel.ordredato >= fra_dato)
    if til_dato:
        count_query = count_query.where(OrdrerModel.ordredato <= til_dato)
        query = query.where(OrdrerModel.ordredato <= til_dato)
    
    # Filter by customer groups if specified
    if kundegruppe_ids:
        # Need to join with customers to filter by kundegruppe
        from app.models.kunder import Kunder as KunderModel
        count_query = count_query.join(KunderModel, OrdrerModel.kundeid == KunderModel.kundeid)
        count_query = count_query.where(KunderModel.kundegruppe.in_(kundegruppe_ids))

        query = query.join(KunderModel, OrdrerModel.kundeid == KunderModel.kundeid)
        query = query.where(KunderModel.kundegruppe.in_(kundegruppe_ids))

    # Filter by order status IDs if specified
    if status_ids:
        count_query = count_query.where(OrdrerModel.ordrestatusid.in_(status_ids))
        query = query.where(OrdrerModel.ordrestatusid.in_(status_ids))

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply sorting
    if sort_by == "leveringsdato":
        sort_column = OrdrerModel.leveringsdato
    elif sort_by == "ordredato":
        sort_column = OrdrerModel.ordredato
    else:
        sort_column = OrdrerModel.leveringsdato  # Default
    
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Get paginated data
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Update kundenavn and kundegruppenavn from the joined customer data
    for item in items:
        if hasattr(item, 'kunde') and item.kunde:
            if not item.kundenavn:
                item.kundenavn = item.kunde.kundenavn
            # Add customer group name
            if hasattr(item.kunde, 'gruppe') and item.kunde.gruppe:
                item.kundegruppenavn = item.kunde.gruppe.gruppe
    
    # Calculate pagination info
    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    
    return PaginatedResponse[Ordrer](
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/{ordre_id}", response_model=Ordrer)
async def get_ordre(
    ordre_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ordrer:
    """Get an order by ID."""
    result = await db.execute(
        select(OrdrerModel)
        .options(joinedload(OrdrerModel.kunde))
        .where(OrdrerModel.ordreid == ordre_id)
    )
    ordre = result.scalar_one_or_none()
    
    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")
    
    # Update kundenavn and kundegruppenavn from the joined customer data
    if hasattr(ordre, 'kunde') and ordre.kunde:
        if not ordre.kundenavn:
            ordre.kundenavn = ordre.kunde.kundenavn
        # Add customer group name
        if hasattr(ordre.kunde, 'gruppe') and ordre.kunde.gruppe:
            ordre.kundegruppenavn = ordre.kunde.gruppe.gruppe
    
    return ordre


@router.get("/{ordre_id}/detaljer", response_model=List[Ordredetaljer])
async def get_ordre_detaljer(
    ordre_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Ordredetaljer]:
    """Get order details with product info."""
    result = await db.execute(
        select(OrdredetaljerModel)
        .options(joinedload(OrdredetaljerModel.produkt))
        .where(OrdredetaljerModel.ordreid == ordre_id)
    )
    return result.scalars().all()


@router.post("/", response_model=Ordrer)
async def create_ordre(
    ordre_data: OrdrerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ordrer:
    """Create a new order."""
    ordre = OrdrerModel(**ordre_data.model_dump())
    db.add(ordre)
    await db.commit()
    await db.refresh(ordre)
    return ordre


@router.post("/{ordre_id}/detaljer", response_model=Ordredetaljer)
async def add_ordre_detalj(
    ordre_id: int,
    detalj_data: OrdredetaljerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ordredetaljer:
    """Add detail to an order."""
    # Check if order exists
    result = await db.execute(
        select(OrdrerModel).where(OrdrerModel.ordreid == ordre_id)
    )
    ordre = result.scalar_one_or_none()
    
    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")
    
    # Get next unik value
    max_unik_result = await db.execute(
        select(func.max(OrdredetaljerModel.unik)).where(
            OrdredetaljerModel.ordreid == ordre_id
        )
    )
    max_unik = max_unik_result.scalar() or 0
    
    detalj = OrdredetaljerModel(
        ordreid=ordre_id,
        unik=max_unik + 1,
        **detalj_data.model_dump()
    )
    db.add(detalj)
    await db.commit()

    # Re-fetch with product relationship loaded
    result = await db.execute(
        select(OrdredetaljerModel)
        .options(joinedload(OrdredetaljerModel.produkt))
        .where(
            OrdredetaljerModel.ordreid == ordre_id,
            OrdredetaljerModel.unik == detalj.unik
        )
    )
    return result.scalar_one()


@router.put("/{ordre_id}/detaljer/{unik}", response_model=Ordredetaljer)
async def update_ordre_detalj(
    ordre_id: int,
    unik: int,
    detalj_data: OrdredetaljerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ordredetaljer:
    """Update an order detail."""
    result = await db.execute(
        select(OrdredetaljerModel).where(
            OrdredetaljerModel.ordreid == ordre_id,
            OrdredetaljerModel.unik == unik
        )
    )
    detalj = result.scalar_one_or_none()

    if not detalj:
        raise HTTPException(status_code=404, detail="Ordrelinje ikke funnet")

    update_data = detalj_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(detalj, field, value)

    await db.commit()

    # Re-fetch with product relationship
    result = await db.execute(
        select(OrdredetaljerModel)
        .options(joinedload(OrdredetaljerModel.produkt))
        .where(
            OrdredetaljerModel.ordreid == ordre_id,
            OrdredetaljerModel.unik == unik
        )
    )
    return result.scalar_one()


@router.delete("/{ordre_id}/detaljer/{unik}")
async def delete_ordre_detalj(
    ordre_id: int,
    unik: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete an order detail."""
    result = await db.execute(
        select(OrdredetaljerModel).where(
            OrdredetaljerModel.ordreid == ordre_id,
            OrdredetaljerModel.unik == unik
        )
    )
    detalj = result.scalar_one_or_none()

    if not detalj:
        raise HTTPException(status_code=404, detail="Ordrelinje ikke funnet")

    await db.delete(detalj)
    await db.commit()
    return {"message": "Ordrelinje slettet"}


@router.put("/{ordre_id}", response_model=Ordrer)
async def update_ordre(
    ordre_id: int,
    ordre_data: OrdrerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ordrer:
    """Update an order."""
    result = await db.execute(
        select(OrdrerModel).where(OrdrerModel.ordreid == ordre_id)
    )
    ordre = result.scalar_one_or_none()
    
    if not ordre:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")
    
    update_data = ordre_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ordre, field, value)
    
    await db.commit()
    await db.refresh(ordre)
    return ordre


@router.delete("/{ordre_id}")
async def cancel_ordre(
    ordre_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancel an order."""
    service = OrderStatusService(db)

    try:
        await service.cancel_order(ordre_id)
        return {"message": "Ordre kansellert"}
    except OrderStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{ordre_id}/duplicate", response_model=Ordrer)
async def duplicate_ordre(
    ordre_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Ordrer:
    """Duplicate an existing order with all its details."""
    # Get original order
    result = await db.execute(
        select(OrdrerModel).where(OrdrerModel.ordreid == ordre_id)
    )
    original = result.scalar_one_or_none()

    if not original:
        raise HTTPException(status_code=404, detail="Ordre ikke funnet")

    # Create new order with same data
    new_ordre = OrdrerModel(
        kundeid=original.kundeid,
        kundenavn=original.kundenavn,
        ordredato=date.today(),
        leveringsdato=original.leveringsdato,
        informasjon=f"Kopi av ordre #{original.ordreid}. {original.informasjon or ''}".strip(),
        betalingsmate=original.betalingsmate,
        ordrestatusid=10,  # Startet (fra tblordrestatus)
    )
    db.add(new_ordre)
    await db.flush()  # Get the new order ID

    # Copy order details
    details_result = await db.execute(
        select(OrdredetaljerModel).where(OrdredetaljerModel.ordreid == ordre_id)
    )
    original_details = details_result.scalars().all()

    for idx, detail in enumerate(original_details, 1):
        new_detail = OrdredetaljerModel(
            ordreid=new_ordre.ordreid,
            unik=idx,
            produktid=detail.produktid,
            antall=detail.antall,
            pris=detail.pris,
            rabatt=detail.rabatt,
            levdato=detail.levdato,
            ident=detail.ident,
        )
        db.add(new_detail)

    await db.commit()
    await db.refresh(new_ordre)
    return new_ordre


@router.put("/{ordre_id}/status")
async def update_ordre_status(
    ordre_id: int,
    status_id: int = Query(..., description="New status ID (1=Ny, 2=Under behandling, 3=Godkjent, 4=Levert)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update order status with workflow logic."""
    service = OrderStatusService(db)

    try:
        success, message = await service.update_status(ordre_id, status_id)
        return {"message": message}
    except OrderStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/batch/status")
async def batch_update_status(
    ordre_ids: List[int] = Query(..., description="List of order IDs to update"),
    status_id: int = Query(..., description="New status ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Batch update order status for multiple orders."""
    service = OrderStatusService(db)

    try:
        result = await service.batch_update_status(ordre_ids, status_id)
        return {
            "message": result["message"],
            "updated_count": result["updated_count"]
        }
    except OrderStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)