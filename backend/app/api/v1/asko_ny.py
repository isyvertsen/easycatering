"""Asko NY product API endpoints.

Asko NY er en produktkatalog fra leverandøren Asko.
'NY' betyr 'nye produkter'.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.asko_ny import AskoNy as AskoNyModel
from app.schemas.asko_ny import AskoNy, AskoNyCreate, AskoNyUpdate

router = APIRouter()


@router.get("/", response_model=List[AskoNy])
async def get_asko_ny_products(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    sok: Optional[str] = Query(None, description="Search in product name or EAN"),
) -> List[AskoNy]:
    """Get all Asko NY products."""
    query = select(AskoNyModel)

    # Search by name or EAN
    if sok:
        search_term = f"%{sok}%"
        query = query.where(
            (AskoNyModel.varenavn.ilike(search_term)) |
            (AskoNyModel.eannummer.ilike(search_term))
        )

    query = query.order_by(AskoNyModel.varenavn).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{epdnummer}", response_model=AskoNy)
async def get_asko_ny_product(
    epdnummer: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AskoNy:
    """Get an Asko NY product by EPD number."""
    result = await db.execute(
        select(AskoNyModel).where(AskoNyModel.epdnummer == epdnummer)
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")

    return product