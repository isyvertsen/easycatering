"""API endpoints for MenyProdukt management."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models import MenyProdukt, Meny, Produkter
from app.schemas.meny_produkt import (
    MenyProdukt as MenyProduktSchema,
    MenyProduktCreate,
    MenyProduktWithDetails
)

router = APIRouter()


@router.get("/", response_model=List[MenyProduktSchema])
async def get_meny_produkter(
    meny_id: int = None,
    produkt_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Get menu-product associations with optional filtering."""
    query = select(MenyProdukt)
    
    if meny_id:
        query = query.where(MenyProdukt.menyid == meny_id)
    if produkt_id:
        query = query.where(MenyProdukt.produktid == produkt_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/details", response_model=List[MenyProduktWithDetails])
async def get_meny_produkter_with_details(
    meny_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get menu products with full product details."""
    query = select(MenyProdukt).options(
        selectinload(MenyProdukt.produkt)
    ).where(MenyProdukt.menyid == meny_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=MenyProduktSchema)
async def create_meny_produkt(
    meny_produkt_in: MenyProduktCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new menu-product association."""
    # Check if meny exists
    meny_query = select(Meny).where(Meny.menyid == meny_produkt_in.menyid)
    meny_result = await db.execute(meny_query)
    if not meny_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Menu not found")
    
    # Check if produkt exists
    produkt_query = select(Produkter).where(Produkter.produktid == meny_produkt_in.produktid)
    produkt_result = await db.execute(produkt_query)
    if not produkt_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if association already exists
    existing_query = select(MenyProdukt).where(
        and_(
            MenyProdukt.menyid == meny_produkt_in.menyid,
            MenyProdukt.produktid == meny_produkt_in.produktid
        )
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This association already exists")
    
    meny_produkt = MenyProdukt(**meny_produkt_in.dict())
    db.add(meny_produkt)
    await db.commit()
    await db.refresh(meny_produkt)
    return meny_produkt


@router.delete("/")
async def delete_meny_produkt(
    meny_id: int,
    produkt_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a menu-product association."""
    query = select(MenyProdukt).where(
        and_(
            MenyProdukt.menyid == meny_id,
            MenyProdukt.produktid == produkt_id
        )
    )
    result = await db.execute(query)
    meny_produkt = result.scalar_one_or_none()
    
    if not meny_produkt:
        raise HTTPException(status_code=404, detail="Association not found")
    
    await db.delete(meny_produkt)
    await db.commit()
    return {"message": "Association deleted successfully"}


@router.post("/bulk", response_model=List[MenyProduktSchema])
async def create_meny_produkter_bulk(
    meny_id: int,
    produkt_ids: List[int],
    db: AsyncSession = Depends(get_db)
):
    """Add multiple products to a menu at once."""
    # Check if meny exists
    meny_query = select(Meny).where(Meny.menyid == meny_id)
    meny_result = await db.execute(meny_query)
    if not meny_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Menu not found")

    if not produkt_ids:
        return []

    # Batch query: Get all existing products in one query
    existing_products_query = select(Produkter.produktid).where(
        Produkter.produktid.in_(produkt_ids)
    )
    existing_products_result = await db.execute(existing_products_query)
    valid_produkt_ids = set(row[0] for row in existing_products_result.all())

    # Batch query: Get all existing associations in one query
    existing_assoc_query = select(MenyProdukt.produktid).where(
        and_(
            MenyProdukt.menyid == meny_id,
            MenyProdukt.produktid.in_(produkt_ids)
        )
    )
    existing_assoc_result = await db.execute(existing_assoc_query)
    existing_assoc_ids = set(row[0] for row in existing_assoc_result.all())

    # Create associations only for valid products that don't already exist
    created = []
    for produkt_id in produkt_ids:
        if produkt_id not in valid_produkt_ids:
            continue  # Skip non-existent products
        if produkt_id in existing_assoc_ids:
            continue  # Skip existing associations

        meny_produkt = MenyProdukt(menyid=meny_id, produktid=produkt_id)
        db.add(meny_produkt)
        created.append(meny_produkt)

    if created:
        await db.commit()
        for mp in created:
            await db.refresh(mp)

    return created