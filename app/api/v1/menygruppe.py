"""Menu group API endpoints."""
from typing import List, Optional, Literal
from sqlalchemy import select, func, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.menygruppe import Menygruppe as MenygruppeModel
from app.schemas.menygruppe import Menygruppe, MenygruppeCreate, MenygruppeUpdate

router = APIRouter()


class MenygruppeListResponse(BaseModel):
    """Paginated response for menygrupper list."""
    items: List[Menygruppe]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=MenygruppeListResponse)
async def get_menygrupper(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by description"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("asc", description="Sort order"),
) -> MenygruppeListResponse:
    """Get all menu groups with pagination, search and sorting."""
    # Base query
    query = select(MenygruppeModel)
    count_query = select(func.count()).select_from(MenygruppeModel)

    # Search filter
    if search:
        search_term = f"%{search}%"
        search_cond = MenygruppeModel.beskrivelse.ilike(search_term)
        query = query.where(search_cond)
        count_query = count_query.where(search_cond)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(MenygruppeModel, sort_by, None) if sort_by else MenygruppeModel.beskrivelse
    if sort_column is None:
        sort_column = MenygruppeModel.beskrivelse

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

    return MenygruppeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{gruppe_id}", response_model=Menygruppe)
async def get_menygruppe(
    gruppe_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Menygruppe:
    """Get a menu group by ID."""
    result = await db.execute(
        select(MenygruppeModel).where(MenygruppeModel.gruppeid == gruppe_id)
    )
    gruppe = result.scalar_one_or_none()

    if not gruppe:
        raise HTTPException(status_code=404, detail="Menygruppe ikke funnet")

    return gruppe


@router.post("/", response_model=Menygruppe)
async def create_menygruppe(
    data: MenygruppeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Menygruppe:
    """Create a new menu group."""
    gruppe = MenygruppeModel(beskrivelse=data.beskrivelse)
    db.add(gruppe)
    await db.commit()
    await db.refresh(gruppe)
    return gruppe


@router.put("/{gruppe_id}", response_model=Menygruppe)
async def update_menygruppe(
    gruppe_id: int,
    data: MenygruppeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Menygruppe:
    """Update a menu group."""
    result = await db.execute(
        select(MenygruppeModel).where(MenygruppeModel.gruppeid == gruppe_id)
    )
    gruppe = result.scalar_one_or_none()

    if not gruppe:
        raise HTTPException(status_code=404, detail="Menygruppe ikke funnet")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gruppe, field, value)

    await db.commit()
    await db.refresh(gruppe)
    return gruppe


@router.delete("/{gruppe_id}")
async def delete_menygruppe(
    gruppe_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a menu group."""
    result = await db.execute(
        select(MenygruppeModel).where(MenygruppeModel.gruppeid == gruppe_id)
    )
    gruppe = result.scalar_one_or_none()

    if not gruppe:
        raise HTTPException(status_code=404, detail="Menygruppe ikke funnet")

    await db.delete(gruppe)
    await db.commit()
    return {"message": "Menygruppe slettet"}


@router.post("/bulk-delete")
async def bulk_delete_menygrupper(
    ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Bulk delete menu groups."""
    if not ids:
        raise HTTPException(status_code=400, detail="Ingen IDer oppgitt")

    result = await db.execute(
        select(MenygruppeModel).where(MenygruppeModel.gruppeid.in_(ids))
    )
    grupper = result.scalars().all()

    if not grupper:
        raise HTTPException(status_code=404, detail="Ingen menygrupper funnet")

    count = len(grupper)
    for gruppe in grupper:
        await db.delete(gruppe)

    await db.commit()

    return {"message": f"{count} menygrupper slettet"}
