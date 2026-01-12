"""Customer group API endpoints."""
from typing import List, Optional, Literal
from sqlalchemy import select, func, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.kunde_gruppe import Kundegruppe as KundegruppeModel
from app.schemas.kunde_gruppe import Kundegruppe, KundegruppeCreate, KundegruppeUpdate

router = APIRouter()


class KundegruppeListResponse(BaseModel):
    """Paginated response for kundegrupper list."""
    items: List[Kundegruppe]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=KundegruppeListResponse)
async def get_kundegrupper(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by group name"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("asc", description="Sort order"),
) -> KundegruppeListResponse:
    """Get all customer groups with pagination, search and sorting."""
    # Base query
    query = select(KundegruppeModel)
    count_query = select(func.count()).select_from(KundegruppeModel)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(KundegruppeModel.gruppe.ilike(search_term))
        count_query = count_query.where(KundegruppeModel.gruppe.ilike(search_term))

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(KundegruppeModel, sort_by, None) if sort_by else KundegruppeModel.gruppe
    if sort_column is None:
        sort_column = KundegruppeModel.gruppe

    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return KundegruppeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{gruppe_id}", response_model=Kundegruppe)
async def get_kundegruppe(
    gruppe_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kundegruppe:
    """Get a customer group by ID."""
    result = await db.execute(
        select(KundegruppeModel).where(KundegruppeModel.gruppeid == gruppe_id)
    )
    gruppe = result.scalar_one_or_none()
    if not gruppe:
        raise HTTPException(status_code=404, detail="Kundegruppe ikke funnet")
    return gruppe


@router.post("/", response_model=Kundegruppe)
async def create_kundegruppe(
    data: KundegruppeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kundegruppe:
    """Create a new customer group."""
    gruppe = KundegruppeModel(
        gruppe=data.gruppe,
        webshop=data.webshop,
        autofaktura=data.autofaktura,
    )
    db.add(gruppe)
    await db.commit()
    await db.refresh(gruppe)
    return gruppe


@router.put("/{gruppe_id}", response_model=Kundegruppe)
async def update_kundegruppe(
    gruppe_id: int,
    data: KundegruppeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kundegruppe:
    """Update a customer group."""
    result = await db.execute(
        select(KundegruppeModel).where(KundegruppeModel.gruppeid == gruppe_id)
    )
    gruppe = result.scalar_one_or_none()
    if not gruppe:
        raise HTTPException(status_code=404, detail="Kundegruppe ikke funnet")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gruppe, field, value)

    await db.commit()
    await db.refresh(gruppe)
    return gruppe


@router.delete("/{gruppe_id}")
async def delete_kundegruppe(
    gruppe_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a customer group."""
    result = await db.execute(
        select(KundegruppeModel).where(KundegruppeModel.gruppeid == gruppe_id)
    )
    gruppe = result.scalar_one_or_none()
    if not gruppe:
        raise HTTPException(status_code=404, detail="Kundegruppe ikke funnet")

    await db.delete(gruppe)
    await db.commit()
    return {"message": "Kundegruppe slettet"}


@router.post("/bulk-delete")
async def bulk_delete_kundegrupper(
    ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Bulk delete customer groups."""
    if not ids:
        raise HTTPException(status_code=400, detail="Ingen IDer oppgitt")

    result = await db.execute(
        select(KundegruppeModel).where(KundegruppeModel.gruppeid.in_(ids))
    )
    grupper = result.scalars().all()

    if not grupper:
        raise HTTPException(status_code=404, detail="Ingen kundegrupper funnet")

    count = len(grupper)
    for gruppe in grupper:
        await db.delete(gruppe)

    await db.commit()

    return {"message": f"{count} kundegrupper slettet"}