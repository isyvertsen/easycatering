"""Admin endpoints for user management."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infrastructure.database.session import get_db
from app.domain.entities.user import User
from app.api.deps import get_current_user
from app.schemas.user import UserResponse

router = APIRouter()


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify that current user is an admin."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kun administratorer har tilgang"
        )
    return current_user


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all users (admin only)."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return users


@router.patch("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Activate a user (admin only)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bruker ikke funnet"
        )

    user.is_active = True
    await db.commit()
    await db.refresh(user)

    return {"message": "Bruker aktivert", "user": user}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Deactivate a user (admin only)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bruker ikke funnet"
        )

    # Prevent deactivating yourself
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Du kan ikke deaktivere din egen konto"
        )

    user.is_active = False
    await db.commit()
    await db.refresh(user)

    return {"message": "Bruker deaktivert", "user": user}


@router.patch("/users/{user_id}/make-admin")
async def make_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Make a user an admin (admin only)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bruker ikke funnet"
        )

    user.is_superuser = True
    await db.commit()
    await db.refresh(user)

    return {"message": "Bruker er nå administrator", "user": user}


@router.patch("/users/{user_id}/remove-admin")
async def remove_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Remove admin rights from a user (admin only)."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bruker ikke funnet"
        )

    # Prevent removing your own admin rights
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Du kan ikke fjerne dine egne administratorrettigheter"
        )

    user.is_superuser = False
    await db.commit()
    await db.refresh(user)

    return {"message": "Administratorrettigheter fjernet", "user": user}
