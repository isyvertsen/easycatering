"""Menu group schemas."""
from typing import Optional
from pydantic import BaseModel


class MenygruppeBase(BaseModel):
    """Base menu group schema."""
    beskrivelse: Optional[str] = None


class MenygruppeCreate(MenygruppeBase):
    """Schema for creating a menu group."""
    beskrivelse: str


class MenygruppeUpdate(MenygruppeBase):
    """Schema for updating a menu group."""
    pass


class Menygruppe(MenygruppeBase):
    """Menu group response schema."""
    gruppeid: int

    class Config:
        from_attributes = True
