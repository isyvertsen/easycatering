"""Category API endpoints."""
from typing import List, Optional, Literal
from sqlalchemy import select, or_, func, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.kategorier import Kategorier as KategorierModel
from app.schemas.kategorier import Kategorier, KategorierCreate, KategorierUpdate

router = APIRouter()


class KategorierListResponse(BaseModel):
    """Paginated response for kategorier list."""
    items: List[Kategorier]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=KategorierListResponse)
async def get_kategorier(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("asc", description="Sort order"),
) -> KategorierListResponse:
    """Get all categories with pagination, search and sorting."""
    # Base query
    query = select(KategorierModel)
    count_query = select(func.count()).select_from(KategorierModel)

    # Search filter
    if search:
        search_term = f"%{search}%"
        search_filter = or_(
            KategorierModel.kategori.ilike(search_term),
            KategorierModel.beskrivelse.ilike(search_term),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(KategorierModel, sort_by, None) if sort_by else KategorierModel.kategori
    if sort_column is None:
        sort_column = KategorierModel.kategori

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

    return KategorierListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{kategori_id}", response_model=Kategorier)
async def get_kategori(
    kategori_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kategorier:
    """Get a category by ID."""
    result = await db.execute(
        select(KategorierModel).where(KategorierModel.kategoriid == kategori_id)
    )
    kategori = result.scalar_one_or_none()
    
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori ikke funnet")
    
    return kategori


@router.post("/", response_model=Kategorier)
async def create_kategori(
    kategori_data: KategorierCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kategorier:
    """Create a new category."""
    kategori = KategorierModel(**kategori_data.model_dump())
    db.add(kategori)
    await db.commit()
    await db.refresh(kategori)
    return kategori


@router.put("/{kategori_id}", response_model=Kategorier)
async def update_kategori(
    kategori_id: int,
    kategori_data: KategorierUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Kategorier:
    """Update a category."""
    result = await db.execute(
        select(KategorierModel).where(KategorierModel.kategoriid == kategori_id)
    )
    kategori = result.scalar_one_or_none()
    
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori ikke funnet")
    
    update_data = kategori_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kategori, field, value)
    
    await db.commit()
    await db.refresh(kategori)
    return kategori


@router.delete("/{kategori_id}")
async def delete_kategori(
    kategori_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a category."""
    result = await db.execute(
        select(KategorierModel).where(KategorierModel.kategoriid == kategori_id)
    )
    kategori = result.scalar_one_or_none()
    
    if not kategori:
        raise HTTPException(status_code=404, detail="Kategori ikke funnet")
    
    await db.delete(kategori)
    await db.commit()
    
    return {"message": "Kategori slettet"}