"""Pydantic schemas for Periode model."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.schemas.base import BaseSchema


class PeriodeBase(BaseModel):
    """Base schema for Periode."""
    ukenr: Optional[int] = None
    fradato: Optional[datetime] = None
    tildato: Optional[datetime] = None


class PeriodeCreate(PeriodeBase):
    """Schema for creating a Periode."""
    pass


class PeriodeUpdate(PeriodeBase):
    """Schema for updating a Periode."""
    pass


class PeriodeInDB(BaseSchema, PeriodeBase):
    """Schema for Periode in database."""
    menyperiodeid: int
    
    class Config:
        from_attributes = True


class Periode(PeriodeInDB):
    """Schema for Periode response."""
    pass


class PeriodeWithMenus(Periode):
    """Schema for Periode with associated menus."""
    menus: List["MenyBase"] = []
    
    class Config:
        from_attributes = True


# Avoid circular imports
from app.schemas.meny import MenyBase
PeriodeWithMenus.model_rebuild()