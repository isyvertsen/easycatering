"""Menu API endpoints."""
import logging
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.meny import Meny as MenyModel
from app.schemas.meny import Meny, MenyCreate, MenyUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


class MenyListResponse(BaseModel):
    """Paginated response for meny list."""
    items: List[Meny]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/", response_model=MenyListResponse)
async def get_menyer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    gruppe_id: Optional[int] = Query(None, description="Filter by menu group"),
    search: Optional[str] = Query(None, max_length=200, description="Search in beskrivelse"),
) -> MenyListResponse:
    """Get all menus with pagination and search."""
    # Base query
    query = select(MenyModel)
    count_query = select(func.count()).select_from(MenyModel)

    # Filter by group
    if gruppe_id:
        query = query.where(MenyModel.menygruppe == gruppe_id)
        count_query = count_query.where(MenyModel.menygruppe == gruppe_id)

    # Search filter
    if search:
        search_term = f"%{search}%"
        search_cond = MenyModel.beskrivelse.ilike(search_term)
        query = query.where(search_cond)
        count_query = count_query.where(search_cond)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.order_by(MenyModel.menyid).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Calculate pagination info
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return MenyListResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


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
    logger.info(f"Creating menu with data: {meny_data.model_dump()}")
    try:
        meny = MenyModel(**meny_data.model_dump())
        db.add(meny)
        await db.commit()
        await db.refresh(meny)
        logger.info(f"Successfully created menu with ID: {meny.menyid}")
        return meny
    except Exception as e:
        await db.rollback()
        # Log the full error with stack trace
        logger.error(
            f"Failed to create menu. Data: {meny_data.model_dump()}, "
            f"Error type: {type(e).__name__}, Error: {str(e)}",
            exc_info=True
        )

        # Check if it's a foreign key constraint error
        error_str = str(e).lower()
        if "foreign key" in error_str or "menygruppe" in error_str:
            logger.warning(f"Foreign key constraint violation. Menygruppe: {meny_data.menygruppe}")
            raise HTTPException(
                status_code=400,
                detail="Ugyldig menygruppe. Velg en gyldig menygruppe fra listen."
            )

        # Log and return generic database error
        logger.error(f"Database error during menu creation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Kunne ikke opprette meny: {str(e)}"
        )


@router.put("/{meny_id}", response_model=Meny)
async def update_meny(
    meny_id: int,
    meny_data: MenyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Meny:
    """Update a menu."""
    logger.info(f"Updating menu ID {meny_id} with data: {meny_data.model_dump(exclude_unset=True)}")
    result = await db.execute(
        select(MenyModel).where(MenyModel.menyid == meny_id)
    )
    meny = result.scalar_one_or_none()

    if not meny:
        logger.warning(f"Menu ID {meny_id} not found for update")
        raise HTTPException(status_code=404, detail="Meny ikke funnet")

    try:
        update_data = meny_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(meny, field, value)

        await db.commit()
        await db.refresh(meny)
        logger.info(f"Successfully updated menu ID {meny_id}")
        return meny
    except Exception as e:
        await db.rollback()
        # Log the full error with stack trace
        logger.error(
            f"Failed to update menu ID {meny_id}. Data: {update_data}, "
            f"Error type: {type(e).__name__}, Error: {str(e)}",
            exc_info=True
        )

        # Check if it's a foreign key constraint error
        error_str = str(e).lower()
        if "foreign key" in error_str or "menygruppe" in error_str:
            logger.warning(f"Foreign key constraint violation on update. Menygruppe: {update_data.get('menygruppe')}")
            raise HTTPException(
                status_code=400,
                detail="Ugyldig menygruppe. Velg en gyldig menygruppe fra listen."
            )

        # Generic database error
        logger.error(f"Database error during menu update: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Kunne ikke oppdatere meny: {str(e)}"
        )


@router.delete("/{meny_id}")
async def delete_meny(
    meny_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a menu."""
    logger.info(f"Attempting to delete menu ID {meny_id}")
    result = await db.execute(
        select(MenyModel).where(MenyModel.menyid == meny_id)
    )
    meny = result.scalar_one_or_none()

    if not meny:
        logger.warning(f"Menu ID {meny_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Meny ikke funnet")

    try:
        await db.delete(meny)
        await db.commit()
        logger.info(f"Successfully deleted menu ID {meny_id}")
        return {"message": "Meny slettet"}
    except Exception as e:
        await db.rollback()
        # Log the full error with stack trace
        logger.error(
            f"Failed to delete menu ID {meny_id}. "
            f"Error type: {type(e).__name__}, Error: {str(e)}",
            exc_info=True
        )

        # Check if it's a foreign key constraint error (menu is referenced elsewhere)
        error_str = str(e).lower()
        if "foreign key" in error_str or "constraint" in error_str:
            logger.warning(f"Cannot delete menu ID {meny_id} - referenced by other entities")
            raise HTTPException(
                status_code=400,
                detail="Kan ikke slette menyen. Den er i bruk i perioder eller ordrer."
            )

        # Generic database error
        logger.error(f"Database error during menu deletion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Kunne ikke slette meny: {str(e)}"
        )