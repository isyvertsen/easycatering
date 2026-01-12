"""API dependencies."""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import verify_token
from app.infrastructure.database.session import get_db
from app.domain.entities.user import User
from app.domain.services.user_service import UserService

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user if authenticated, otherwise return None."""
    user_service = UserService(db)

    # First check if credentials are provided - always honor explicit auth
    if credentials:
        user_id = verify_token(credentials.credentials)
        if user_id:
            return await user_service.get_by_id(int(user_id))

    # Development bypass - only if no credentials provided
    if settings.AUTH_BYPASS:
        # Additional check to ensure we're not in production
        if settings.APP_ENV == "production":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AUTH_BYPASS cannot be enabled in production environment"
            )

        # Get or create a development user
        dev_user = await user_service.get_by_email("dev@example.com")
        if not dev_user:
            dev_user = await user_service.create(
                email="dev@example.com",
                full_name="Development User",
                password="devpassword",
            )
        return dev_user

    return None


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Get current authenticated user or raise exception."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """Get current active user or raise exception."""
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return user