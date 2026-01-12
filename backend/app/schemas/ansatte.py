"""Employee schemas."""
from typing import Optional
from .base import BaseSchema


class AnsatteBase(BaseSchema):
    """Base employee schema."""
    fornavn: Optional[str] = None
    etternavn: Optional[str] = None
    tittel: Optional[str] = None
    adresse: Optional[str] = None
    postnr: Optional[str] = None
    poststed: Optional[str] = None
    tlfprivat: Optional[str] = None
    avdeling: Optional[str] = None
    fodselsdato: Optional[str] = None
    personnr: Optional[float] = None
    sluttet: Optional[bool] = None
    stillings_prosent: Optional[float] = None
    resussnr: Optional[int] = None
    e_postjobb: Optional[str] = None
    e_postprivat: Optional[str] = None
    windowsbruker: Optional[str] = None
    defaultprinter: Optional[str] = None


class AnsatteCreate(AnsatteBase):
    """Schema for creating an employee."""
    fornavn: str
    etternavn: str


class AnsatteUpdate(AnsatteBase):
    """Schema for updating an employee."""
    pass


class Ansatte(AnsatteBase):
    """Employee response schema."""
    ansattid: int
    ssma_timestamp: Optional[str] = None