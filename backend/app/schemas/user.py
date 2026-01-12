"""User schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str


class UserUpdate(UserBase):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    password: Optional[str] = None


class User(UserBase):
    """User response schema."""
    id: int
    google_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(User):
    """User response schema."""
    id: int
    google_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True