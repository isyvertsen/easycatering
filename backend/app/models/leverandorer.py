"""Supplier model (tblleverandorer)."""
from sqlalchemy import Column, BigInteger, Boolean, Text

from app.infrastructure.database.session import Base


class Leverandorer(Base):
    """Supplier table (tblleverandorer)."""
    __tablename__ = "tblleverandorer"

    leverandorid = Column(BigInteger, primary_key=True, index=True)
    refkundenummer = Column(Text)
    leverandornavn = Column(Text)
    adresse = Column(Text)
    e_post = Column(Text)
    postnummer = Column(Text)
    poststed = Column(Text)
    telefonnummer = Column(Text)
    bestillingsnr = Column(Text)
    utgatt = Column(Boolean)
    webside = Column(Text)
    ssma_timestamp = Column(Text)