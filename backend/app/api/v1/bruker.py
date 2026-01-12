"""Bruker (user) CRUD endpoints."""
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_db
from app.core.security import get_password_hash
from app.domain.entities.user import User
from app.models.ansatte import Ansatte
from app.schemas.bruker import (
    Bruker,
    BrukerCreate,
    BrukerListResponse,
    BrukerMedAnsatt,
    BrukerUpdate,
)

router = APIRouter()


def require_admin(current_user: User) -> User:
    """Check if current user is admin."""
    if current_user.rolle != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Kun administratorer kan utføre denne handlingen"
        )
    return current_user


@router.get("/", response_model=BrukerListResponse)
async def get_brukere(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    rolle: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query("id"),
    sort_order: Literal["asc", "desc"] = Query("asc"),
) -> BrukerListResponse:
    """Get all users with pagination, search and filtering."""
    require_admin(current_user)

    # Base query with eager loading of ansatt
    query = select(User).options(selectinload(User.ansatt))
    count_query = select(func.count()).select_from(User)

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        search_filter = or_(
            User.email.ilike(search_term),
            User.full_name.ilike(search_term),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Apply rolle filter
    if rolle:
        query = query.where(User.rolle == rolle)
        count_query = count_query.where(User.rolle == rolle)

    # Apply is_active filter
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(User, sort_by, None)
    if sort_column is None:
        sort_column = User.id

    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return BrukerListResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{bruker_id}", response_model=BrukerMedAnsatt)
async def get_bruker(
    bruker_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BrukerMedAnsatt:
    """Get a user by ID."""
    require_admin(current_user)

    result = await db.execute(
        select(User)
        .options(selectinload(User.ansatt))
        .where(User.id == bruker_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Bruker ikke funnet")

    return user


@router.get("/ansatt/{ansattid}", response_model=BrukerMedAnsatt)
async def get_bruker_by_ansatt(
    ansattid: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BrukerMedAnsatt:
    """Get user by employee ID."""
    require_admin(current_user)

    result = await db.execute(
        select(User)
        .options(selectinload(User.ansatt))
        .where(User.ansattid == ansattid)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Ingen bruker funnet for denne ansatt"
        )

    return user


@router.post("/", response_model=BrukerMedAnsatt)
async def create_bruker(
    data: BrukerCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BrukerMedAnsatt:
    """Create a new user."""
    require_admin(current_user)

    # Check if email already exists
    existing = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="E-postadressen er allerede i bruk"
        )

    # Validate ansattid if provided
    if data.ansattid:
        ansatt_result = await db.execute(
            select(Ansatte).where(Ansatte.ansattid == data.ansattid)
        )
        if not ansatt_result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Ugyldig ansatt-ID"
            )

        # Check if ansatt already has a user
        existing_user = await db.execute(
            select(User).where(User.ansattid == data.ansattid)
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Denne ansatt har allerede en brukerkonto"
            )

    # Create user
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        ansattid=data.ansattid,
        rolle=data.rolle,
        is_active=data.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Reload with ansatt relationship
    result = await db.execute(
        select(User)
        .options(selectinload(User.ansatt))
        .where(User.id == user.id)
    )
    return result.scalar_one()


@router.put("/{bruker_id}", response_model=BrukerMedAnsatt)
async def update_bruker(
    bruker_id: int,
    data: BrukerUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> BrukerMedAnsatt:
    """Update a user."""
    require_admin(current_user)

    result = await db.execute(
        select(User).where(User.id == bruker_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Bruker ikke funnet")

    # Check email uniqueness if changing
    if data.email and data.email != user.email:
        existing = await db.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="E-postadressen er allerede i bruk"
            )

    # Validate ansattid if changing
    if data.ansattid is not None and data.ansattid != user.ansattid:
        if data.ansattid:
            ansatt_result = await db.execute(
                select(Ansatte).where(Ansatte.ansattid == data.ansattid)
            )
            if not ansatt_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="Ugyldig ansatt-ID"
                )

            # Check if ansatt already has another user
            existing_user = await db.execute(
                select(User).where(
                    User.ansattid == data.ansattid,
                    User.id != bruker_id
                )
            )
            if existing_user.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="Denne ansatt har allerede en brukerkonto"
                )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)

    # Handle password separately
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            user.hashed_password = get_password_hash(password)

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    # Reload with ansatt relationship
    result = await db.execute(
        select(User)
        .options(selectinload(User.ansatt))
        .where(User.id == user.id)
    )
    return result.scalar_one()


@router.delete("/{bruker_id}")
async def delete_bruker(
    bruker_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Soft delete a user (set is_active=False)."""
    require_admin(current_user)

    # Prevent self-deletion
    if bruker_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Du kan ikke slette din egen brukerkonto"
        )

    result = await db.execute(
        select(User).where(User.id == bruker_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Bruker ikke funnet")

    # Soft delete
    user.is_active = False
    await db.commit()

    return {"message": "Bruker deaktivert"}


@router.post("/{bruker_id}/activate")
async def activate_bruker(
    bruker_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Reactivate a user."""
    require_admin(current_user)

    result = await db.execute(
        select(User).where(User.id == bruker_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Bruker ikke funnet")

    user.is_active = True
    await db.commit()

    return {"message": "Bruker aktivert"}
