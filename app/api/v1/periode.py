"""API endpoints for Periode management."""
from typing import List, Optional, Literal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, asc, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.api.deps import get_db
from app.models import Periode, PeriodeMeny, Meny
from app.schemas.periode import (
    Periode as PeriodeSchema,
    PeriodeCreate,
    PeriodeUpdate,
    PeriodeWithMenus
)

router = APIRouter()


class PeriodeListResponse(BaseModel):
    """Paginated response for perioder list."""
    items: List[PeriodeSchema]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=PeriodeListResponse)
async def get_perioder(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by week number"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all periods with pagination, search and sorting."""
    # Base query
    query = select(Periode)
    count_query = select(func.count()).select_from(Periode)

    # Date filtering
    if from_date:
        query = query.where(Periode.tildato >= from_date)
        count_query = count_query.where(Periode.tildato >= from_date)
    if to_date:
        query = query.where(Periode.fradato <= to_date)
        count_query = count_query.where(Periode.fradato <= to_date)

    # Search filter (by week number)
    if search:
        try:
            week_num = int(search)
            query = query.where(Periode.ukenr == week_num)
            count_query = count_query.where(Periode.ukenr == week_num)
        except ValueError:
            pass  # If not a number, don't filter by week

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(Periode, sort_by, None) if sort_by else Periode.fradato
    if sort_column is None:
        sort_column = Periode.fradato

    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PeriodeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/active", response_model=List[PeriodeWithMenus])
async def get_active_perioder(
    date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get active periods for a specific date (default: today)."""
    if not date:
        date = datetime.now()
    
    query = select(Periode).options(
        selectinload(Periode.periode_menyer).selectinload(PeriodeMeny.meny)
    ).where(
        and_(
            Periode.fradato <= date,
            Periode.tildato >= date
        )
    )
    
    result = await db.execute(query)
    perioder = result.scalars().all()
    
    # Transform to include menus directly
    response = []
    for periode in perioder:
        periode_dict = {
            "menyperiodeid": periode.menyperiodeid,
            "ukenr": periode.ukenr,
            "fradato": periode.fradato,
            "tildato": periode.tildato,
            "menus": [pm.meny for pm in periode.periode_menyer]
        }
        response.append(periode_dict)
    
    return response


@router.get("/{periode_id}", response_model=PeriodeWithMenus)
async def get_periode(
    periode_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific period by ID."""
    query = select(Periode).options(
        selectinload(Periode.periode_menyer).selectinload(PeriodeMeny.meny)
    ).where(Periode.menyperiodeid == periode_id)
    
    result = await db.execute(query)
    periode = result.scalar_one_or_none()
    
    if not periode:
        raise HTTPException(status_code=404, detail="Period not found")
    
    # Transform to include menus directly
    periode_dict = {
        "menyperiodeid": periode.menyperiodeid,
        "ukenr": periode.ukenr,
        "fradato": periode.fradato,
        "tildato": periode.tildato,
        "menus": [pm.meny for pm in periode.periode_menyer]
    }
    
    return periode_dict


@router.post("/", response_model=PeriodeSchema)
async def create_periode(
    periode_in: PeriodeCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new period."""
    periode = Periode(**periode_in.dict())
    db.add(periode)
    await db.commit()
    await db.refresh(periode)
    return periode


@router.put("/{periode_id}", response_model=PeriodeSchema)
async def update_periode(
    periode_id: int,
    periode_in: PeriodeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing period."""
    query = select(Periode).where(Periode.menyperiodeid == periode_id)
    result = await db.execute(query)
    periode = result.scalar_one_or_none()
    
    if not periode:
        raise HTTPException(status_code=404, detail="Period not found")
    
    update_data = periode_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(periode, field, value)
    
    await db.commit()
    await db.refresh(periode)
    return periode


@router.delete("/{periode_id}")
async def delete_periode(
    periode_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a period."""
    query = select(Periode).where(Periode.menyperiodeid == periode_id)
    result = await db.execute(query)
    periode = result.scalar_one_or_none()
    
    if not periode:
        raise HTTPException(status_code=404, detail="Period not found")
    
    await db.delete(periode)
    await db.commit()
    return {"message": "Period deleted successfully"}