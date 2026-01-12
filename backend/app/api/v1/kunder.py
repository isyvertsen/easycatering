"""Customer API endpoints."""
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.kunder import Kunder as KunderModel
from app.schemas.kunder import Kunder, KunderCreate, KunderUpdate

router = APIRouter()


@router.get("/", response_model=List[Kunder])
async def get_kunder(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    aktiv: Optional[bool] = Query(True, description="Filter by active status"),
    sok: Optional[str] = Query(None, description="Search in customer name"),
) -> List[Kunder]:
    """Get all customers."""
    query = select(KunderModel)
    
    # Filter by active status
    if aktiv is not None:
        if aktiv:
            query = query.where(
                or_(KunderModel.kundeinaktiv == False, KunderModel.kundeinaktiv == None)
            )
        else:
            query = query.where(KunderModel.kundeinaktiv == True)
    
    # Search by name
    if sok:
        search_term = f"%{sok}%"
        query = query.where(
            or_(
                KunderModel.kundenavn.ilike(search_term),
                KunderModel.adresse.ilike(search_term),
                KunderModel.sted.ilike(search_term)
            )
        )
    
    query = query.order_by(KunderModel.kundenavn).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


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