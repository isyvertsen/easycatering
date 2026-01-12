"""Pydantic schemas for PeriodeMeny model."""
from pydantic import BaseModel

from app.schemas.base import BaseSchema


class PeriodeMenyBase(BaseModel):
    """Base schema for PeriodeMeny."""
    periodeid: int
    menyid: int


class PeriodeMenyCreate(PeriodeMenyBase):
    """Schema for creating a PeriodeMeny."""
    pass


class PeriodeMenyInDB(BaseSchema, PeriodeMenyBase):
    """Schema for PeriodeMeny in database."""
    
    class Config:
        from_attributes = True


class PeriodeMeny(PeriodeMenyInDB):
    """Schema for PeriodeMeny response."""
    pass