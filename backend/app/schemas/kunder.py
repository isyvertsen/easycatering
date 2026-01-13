"""Customer schemas."""
from typing import Optional
from datetime import datetime
from pydantic import Field, EmailStr, field_validator
import re
from .base import BaseSchema


class KunderBase(BaseSchema):
    """Base customer schema."""
    kundenavn: Optional[str] = Field(None, min_length=1, max_length=200)
    avdeling: Optional[str] = Field(None, max_length=100)
    kontaktid: Optional[str] = Field(None, max_length=50)
    telefonnummer: Optional[str] = Field(None, max_length=20)
    bestillernr: Optional[str] = Field(None, max_length=50)
    lopenr: Optional[float] = None
    merknad: Optional[str] = Field(None, max_length=1000)
    adresse: Optional[str] = Field(None, max_length=200)
    postboks: Optional[float] = None
    postnr: Optional[str] = Field(None, max_length=10)
    sted: Optional[str] = Field(None, max_length=100)
    velgsone: Optional[int] = None
    leveringsdag: Optional[int] = Field(None, ge=0, le=6)
    kundeinaktiv: Optional[bool] = None
    kundenragresso: Optional[float] = None
    e_post: Optional[EmailStr] = None
    webside: Optional[str] = Field(None, max_length=200)
    kundegruppe: Optional[int] = None
    bestillerselv: Optional[bool] = None
    rute: Optional[int] = None
    menyinfo: Optional[str] = Field(None, max_length=500)
    ansattid: Optional[int] = None
    sjaforparute: Optional[float] = None
    diett: Optional[bool] = None
    menygruppeid: Optional[float] = None
    utdato: Optional[datetime] = None
    inndato: Optional[datetime] = None
    avsluttet: Optional[bool] = None
    eksportkatalog: Optional[str] = Field(None, max_length=200)
    mobilnummer: Optional[str] = Field(None, max_length=20)
    formkost: Optional[bool] = None
    sykehjemid: Optional[int] = None
    e_post2: Optional[EmailStr] = None

    @field_validator('telefonnummer', 'mobilnummer', mode='before')
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format."""
        if v is None:
            return v
        # Remove spaces and dashes for validation
        cleaned = re.sub(r'[\s\-]', '', str(v))
        if not re.match(r'^\+?[\d]{6,15}$', cleaned):
            raise ValueError('Invalid phone number format')
        return v


class KunderCreate(KunderBase):
    """Schema for creating a customer."""
    kundenavn: str


class KunderUpdate(KunderBase):
    """Schema for updating a customer."""
    pass


class Kunder(KunderBase):
    """Customer response schema."""
    kundeid: int