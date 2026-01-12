"""User service."""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.user import User
from app.core.security import get_password_hash, verify_password


class UserService:
    """User service for business logic."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Get user by Google ID."""
        result = await self.db.execute(select(User).where(User.google_id == google_id))
        return result.scalar_one_or_none()
    
    async def create(
        self,
        email: str,
        full_name: str,
        password: Optional[str] = None,
        google_id: Optional[str] = None,
        is_active: bool = True,
    ) -> User:
        """Create new user."""
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password) if password else None,
            google_id=google_id,
            is_active=is_active,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password."""
        user = await self.get_by_email(email)
        if not user or not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user