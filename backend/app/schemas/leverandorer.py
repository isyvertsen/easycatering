"""Supplier schemas."""
from typing import Optional, Union
from pydantic import field_validator
from .base import BaseSchema


class LeverandorerBase(BaseSchema):
    """Base supplier schema."""
    leverandornavn: Optional[str] = None
    refkundenummer: Optional[str] = None
    adresse: Optional[str] = None
    e_post: Optional[str] = None
    postnummer: Optional[str] = None
    poststed: Optional[str] = None
    telefonnummer: Optional[str] = None
    bestillingsnr: Optional[str] = None
    utgatt: Optional[bool] = None
    webside: Optional[str] = None


class LeverandorerCreate(LeverandorerBase):
    """Schema for creating a supplier."""
    leverandornavn: str


class LeverandorerUpdate(LeverandorerBase):
    """Schema for updating a supplier."""
    pass


class Leverandorer(LeverandorerBase):
    """Supplier response schema."""
    leverandorid: int
    ssma_timestamp: Optional[str] = None
    
    @field_validator('refkundenummer', 'postnummer', 'bestillingsnr', mode='before')
    @classmethod
    def convert_numeric_to_str(cls, v):
        """Convert numeric values to strings."""
        if v is None:
            return None
        if isinstance(v, (int, float)):
            # Convert floats that are whole numbers to int first
            if isinstance(v, float) and v.is_integer():
                return str(int(v))
            return str(v)
        return v