"""Customer group schemas."""
from typing import Optional
from pydantic import BaseModel


class KundegruppeBase(BaseModel):
    """Base schema for customer groups."""
    gruppe: str
    webshop: bool
    autofaktura: bool


class KundegruppeCreate(KundegruppeBase):
    """Schema for creating customer groups."""
    pass


class KundegruppeUpdate(BaseModel):
    """Schema for updating customer groups."""
    gruppe: Optional[str] = None
    webshop: Optional[bool] = None
    autofaktura: Optional[bool] = None


class Kundegruppe(KundegruppeBase):
    """Schema for customer groups."""
    gruppeid: int

    class Config:
        """Pydantic config."""
        from_attributes = True