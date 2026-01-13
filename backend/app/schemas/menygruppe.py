"""Menu group schemas."""
from typing import Optional
from pydantic import BaseModel, Field


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
    # Use validation_alias to read from 'menygruppeid' on the model
    # and serialization_alias to output as 'gruppeid'
    gruppeid: int = Field(validation_alias="menygruppeid")

    class Config:
        from_attributes = True
        populate_by_name = True
