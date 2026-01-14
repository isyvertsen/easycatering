"""Customer API endpoints."""
from typing import List, Optional
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.kunder import Kunder as KunderModel
from app.schemas.kunder import Kunder, KunderCreate, KunderUpdate
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[Kunder])
async def get_kunder(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    aktiv: Optional[bool] = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, max_length=200, description="Search in customer name (standard parameter)"),
    sok: Optional[str] = Query(None, description="Search in customer name (deprecated, use 'search')"),
    kundegruppe: Optional[str] = Query(None, description="Filter by customer group name"),
    sort_by: Optional[str] = Query(None, description="Sort by field (kundenavn, kundeid)"),
    sort_order: Optional[str] = Query("asc", description="Sort order (asc, desc)"),
) -> PaginatedResponse[Kunder]:
    """Get all customers with pagination info."""
    from app.models.kunde_gruppe import Kundegruppe as KundegruppeModel

    # Support both 'search' and 'sok' for backward compatibility
    search_term_input = search or sok

    # Base query for counting
    count_query = select(func.count()).select_from(KunderModel)
    query = select(KunderModel)

    # Filter by active status
    if aktiv is not None:
        if aktiv:
            filter_condition = or_(KunderModel.kundeinaktiv == False, KunderModel.kundeinaktiv == None)
        else:
            filter_condition = KunderModel.kundeinaktiv == True
        count_query = count_query.where(filter_condition)
        query = query.where(filter_condition)

    # Filter by customer group name
    if kundegruppe:
        # Find group IDs matching the name
        group_subquery = select(KundegruppeModel.gruppeid).where(
            KundegruppeModel.gruppe.ilike(f"%{kundegruppe}%")
        )
        group_condition = KunderModel.kundegruppe.in_(group_subquery)
        count_query = count_query.where(group_condition)
        query = query.where(group_condition)

    # Search by name
    if search_term_input:
        search_term = f"%{search_term_input}%"
        search_condition = or_(
            KunderModel.kundenavn.ilike(search_term),
            KunderModel.adresse.ilike(search_term),
            KunderModel.sted.ilike(search_term)
        )
        count_query = count_query.where(search_condition)
        query = query.where(search_condition)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = KunderModel.kundenavn  # default
    if sort_by == "kundeid":
        sort_column = KunderModel.kundeid
    elif sort_by == "kundenavn":
        sort_column = KunderModel.kundenavn

    if sort_order == "desc":
        sort_column = sort_column.desc()

    # Get paginated data
    query = query.order_by(sort_column).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Calculate pagination info
    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit if total > 0 else 0

    return PaginatedResponse[Kunder](
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/{kunde_id}", response_model=Kunder)
async def get_kunde(
    kunde_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kunder:
    """Get a customer by ID."""
    result = await db.execute(
        select(KunderModel).where(KunderModel.kundeid == kunde_id)
    )
    kunde = result.scalar_one_or_none()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde ikke funnet")
    
    return kunde


@router.post("/", response_model=Kunder)
async def create_kunde(
    kunde_data: KunderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kunder:
    """Create a new customer."""
    kunde = KunderModel(**kunde_data.model_dump())
    db.add(kunde)
    await db.commit()
    await db.refresh(kunde)
    return kunde


@router.put("/{kunde_id}", response_model=Kunder)
async def update_kunde(
    kunde_id: int,
    kunde_data: KunderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kunder:
    """Update a customer."""
    result = await db.execute(
        select(KunderModel).where(KunderModel.kundeid == kunde_id)
    )
    kunde = result.scalar_one_or_none()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde ikke funnet")
    
    update_data = kunde_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kunde, field, value)
    
    await db.commit()
    await db.refresh(kunde)
    return kunde


@router.delete("/{kunde_id}")
async def delete_kunde(
    kunde_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a customer (soft delete by setting kundeinaktiv=True)."""
    result = await db.execute(
        select(KunderModel).where(KunderModel.kundeid == kunde_id)
    )
    kunde = result.scalar_one_or_none()
    
    if not kunde:
        raise HTTPException(status_code=404, detail="Kunde ikke funnet")
    
    kunde.kundeinaktiv = True
    await db.commit()
    
    return {"message": "Kunde deaktivert"}