"""Menu API endpoints."""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.meny import Meny as MenyModel
from app.schemas.meny import Meny, MenyCreate, MenyUpdate

router = APIRouter()


@router.get("/", response_model=List[Meny])
async def get_menyer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    gruppe_id: Optional[int] = Query(None, description="Filter by menu group"),
) -> List[Meny]:
    """Get all menus."""
    query = select(MenyModel)
    
    # Filter by group
    if gruppe_id:
        query = query.where(MenyModel.menygruppe == gruppe_id)
    
    query = query.order_by(MenyModel.beskrivelse).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{meny_id}", response_model=Meny)
async def get_meny(
    meny_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Meny:
    """Get a menu by ID."""
    result = await db.execute(
        select(MenyModel).where(MenyModel.menyid == meny_id)
    )
    meny = result.scalar_one_or_none()
    
    if not meny:
        raise HTTPException(status_code=404, detail="Meny ikke funnet")
    
    return meny


@router.post("/", response_model=Meny)
async def create_meny(
    meny_data: MenyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Meny:
    """Create a new menu."""
    meny = MenyModel(**meny_data.model_dump())
    db.add(meny)
    await db.commit()
    await db.refresh(meny)
    return meny


@router.put("/{meny_id}", response_model=Meny)
async def update_meny(
    meny_id: int,
    meny_data: MenyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Meny:
    """Update a menu."""
    result = await db.execute(
        select(MenyModel).where(MenyModel.menyid == meny_id)
    )
    meny = result.scalar_one_or_none()
    
    if not meny:
        raise HTTPException(status_code=404, detail="Meny ikke funnet")
    
    update_data = meny_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meny, field, value)
    
    await db.commit()
    await db.refresh(meny)
    return meny


@router.delete("/{meny_id}")
async def delete_meny(
    meny_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a menu."""
    result = await db.execute(
        select(MenyModel).where(MenyModel.menyid == meny_id)
    )
    meny = result.scalar_one_or_none()
    
    if not meny:
        raise HTTPException(status_code=404, detail="Meny ikke funnet")
    
    await db.delete(meny)
    await db.commit()
    
    return {"message": "Meny slettet"}