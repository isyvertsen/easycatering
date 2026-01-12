"""Supplier API endpoints."""
from typing import List, Optional, Literal
from sqlalchemy import select, or_, func, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.leverandorer import Leverandorer as LeverandorerModel
from app.schemas.leverandorer import Leverandorer, LeverandorerCreate, LeverandorerUpdate

router = APIRouter()


class LeverandorListResponse(BaseModel):
    """Paginated response for leverandorer list."""
    items: List[Leverandorer]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=LeverandorListResponse)
async def get_leverandorer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    aktiv: Optional[bool] = Query(True, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: Literal["asc", "desc"] = Query("asc", description="Sort order"),
) -> LeverandorListResponse:
    """Get all suppliers with pagination, search and sorting."""
    # Base query
    query = select(LeverandorerModel)
    count_query = select(func.count()).select_from(LeverandorerModel)

    # Filter by utgatt status (inverted - utgatt=False means active)
    if aktiv is not None:
        if aktiv:
            filter_cond = or_(LeverandorerModel.utgatt == False, LeverandorerModel.utgatt == None)
        else:
            filter_cond = LeverandorerModel.utgatt == True
        query = query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    # Search filter
    if search:
        search_term = f"%{search}%"
        search_cond = or_(
            LeverandorerModel.leverandornavn.ilike(search_term),
            LeverandorerModel.e_post.ilike(search_term),
            LeverandorerModel.telefonnummer.ilike(search_term),
            LeverandorerModel.poststed.ilike(search_term),
        )
        query = query.where(search_cond)
        count_query = count_query.where(search_cond)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(LeverandorerModel, sort_by, None) if sort_by else LeverandorerModel.leverandornavn
    if sort_column is None:
        sort_column = LeverandorerModel.leverandornavn

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

    return LeverandorListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{leverandor_id}", response_model=Leverandorer)
async def get_leverandor(
    leverandor_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Leverandorer:
    """Get a supplier by ID."""
    result = await db.execute(
        select(LeverandorerModel).where(LeverandorerModel.leverandorid == leverandor_id)
    )
    leverandor = result.scalar_one_or_none()
    
    if not leverandor:
        raise HTTPException(status_code=404, detail="Leverandør ikke funnet")
    
    return leverandor


@router.post("/", response_model=Leverandorer)
async def create_leverandor(
    leverandor_data: LeverandorerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Leverandorer:
    """Create a new supplier."""
    leverandor = LeverandorerModel(**leverandor_data.model_dump())
    db.add(leverandor)
    await db.commit()
    await db.refresh(leverandor)
    return leverandor


@router.put("/{leverandor_id}", response_model=Leverandorer)
async def update_leverandor(
    leverandor_id: int,
    leverandor_data: LeverandorerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Leverandorer:
    """Update a supplier."""
    result = await db.execute(
        select(LeverandorerModel).where(LeverandorerModel.leverandorid == leverandor_id)
    )
    leverandor = result.scalar_one_or_none()
    
    if not leverandor:
        raise HTTPException(status_code=404, detail="Leverandør ikke funnet")
    
    update_data = leverandor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(leverandor, field, value)
    
    await db.commit()
    await db.refresh(leverandor)
    return leverandor


@router.delete("/{leverandor_id}")
async def delete_leverandor(
    leverandor_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a supplier (soft delete by setting utgatt=True)."""
    result = await db.execute(
        select(LeverandorerModel).where(LeverandorerModel.leverandorid == leverandor_id)
    )
    leverandor = result.scalar_one_or_none()

    if not leverandor:
        raise HTTPException(status_code=404, detail="Leverandør ikke funnet")

    leverandor.utgatt = True
    await db.commit()

    return {"message": "Leverandør deaktivert"}


@router.post("/bulk-delete")
async def bulk_delete_leverandorer(
    ids: List[int],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Bulk soft delete suppliers by setting utgatt=True."""
    if not ids:
        raise HTTPException(status_code=400, detail="Ingen IDer oppgitt")

    result = await db.execute(
        select(LeverandorerModel).where(LeverandorerModel.leverandorid.in_(ids))
    )
    leverandorer = result.scalars().all()

    if not leverandorer:
        raise HTTPException(status_code=404, detail="Ingen leverandører funnet")

    count = 0
    for leverandor in leverandorer:
        leverandor.utgatt = True
        count += 1

    await db.commit()

    return {"message": f"{count} leverandører deaktivert"}