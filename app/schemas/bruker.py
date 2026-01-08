"""Bruker (user) schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .base import BaseSchema


class AnsattInfo(BaseSchema):
    """Nested schema for employee info in user responses."""
    ansattid: int
    fornavn: Optional[str] = None
    etternavn: Optional[str] = None
    e_postjobb: Optional[str] = None


class BrukerBase(BaseSchema):
    """Base schema for users."""
    email: EmailStr
    full_name: str = Field(..., min_length=1)
    ansattid: Optional[int] = None
    rolle: str = Field(default="bruker")
    is_active: bool = True


class BrukerCreate(BrukerBase):
    """Schema for creating users."""
    password: str = Field(..., min_length=8)


class BrukerUpdate(BaseModel):
    """Schema for updating users (all optional)."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    ansattid: Optional[int] = None
    rolle: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)

    class Config:
        from_attributes = True


class Bruker(BrukerBase):
    """Schema for user responses."""
    id: int
    is_superuser: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BrukerMedAnsatt(Bruker):
    """Schema for user responses with employee info."""
    ansatt: Optional[AnsattInfo] = None


class BrukerListResponse(BaseSchema):
    """Paginated response for users list."""
    items: list[BrukerMedAnsatt]
    total: int
    page: int
    page_size: int
    total_pages: int
