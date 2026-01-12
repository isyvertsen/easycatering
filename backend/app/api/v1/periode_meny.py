"""API endpoints for PeriodeMeny management."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import get_db
from app.models import PeriodeMeny, Periode, Meny
from app.schemas.periode_meny import (
    PeriodeMeny as PeriodeMenySchema,
    PeriodeMenyCreate
)

router = APIRouter()


@router.get("/", response_model=List[PeriodeMenySchema])
async def get_periode_menyer(
    periode_id: int = None,
    meny_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Get period-menu associations with optional filtering."""
    query = select(PeriodeMeny)
    
    if periode_id:
        query = query.where(PeriodeMeny.periodeid == periode_id)
    if meny_id:
        query = query.where(PeriodeMeny.menyid == meny_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=PeriodeMenySchema)
async def create_periode_meny(
    periode_meny_in: PeriodeMenyCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new period-menu association."""
    # Check if periode exists
    periode_query = select(Periode).where(Periode.menyperiodeid == periode_meny_in.periodeid)
    periode_result = await db.execute(periode_query)
    if not periode_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Period not found")
    
    # Check if meny exists
    meny_query = select(Meny).where(Meny.menyid == periode_meny_in.menyid)
    meny_result = await db.execute(meny_query)
    if not meny_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Menu not found")
    
    # Check if association already exists
    existing_query = select(PeriodeMeny).where(
        and_(
            PeriodeMeny.periodeid == periode_meny_in.periodeid,
            PeriodeMeny.menyid == periode_meny_in.menyid
        )
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This association already exists")
    
    periode_meny = PeriodeMeny(**periode_meny_in.dict())
    db.add(periode_meny)
    await db.commit()
    await db.refresh(periode_meny)
    return periode_meny


@router.delete("/")
async def delete_periode_meny(
    periode_id: int,
    meny_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a period-menu association."""
    query = select(PeriodeMeny).where(
        and_(
            PeriodeMeny.periodeid == periode_id,
            PeriodeMeny.menyid == meny_id
        )
    )
    result = await db.execute(query)
    periode_meny = result.scalar_one_or_none()
    
    if not periode_meny:
        raise HTTPException(status_code=404, detail="Association not found")
    
    await db.delete(periode_meny)
    await db.commit()
    return {"message": "Association deleted successfully"}