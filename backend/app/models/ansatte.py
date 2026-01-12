"""Employee model (tblansatte)."""
from sqlalchemy import Column, BigInteger, Boolean, Float, Text
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Ansatte(Base):
    """Employee table (tblansatte)."""
    __tablename__ = "tblansatte"

    ansattid = Column(BigInteger, primary_key=True, index=True)
    fornavn = Column(Text)
    etternavn = Column(Text)
    tittel = Column(Text)
    adresse = Column(Text)
    postnr = Column(Text)
    poststed = Column(Text)
    tlfprivat = Column(Text)
    avdeling = Column(Text)
    fodselsdato = Column(Text)
    personnr = Column(Float)
    sluttet = Column(Boolean)
    stillings_prosent = Column(Float)
    resussnr = Column(BigInteger)
    e_postjobb = Column(Text)
    e_postprivat = Column(Text)
    ssma_timestamp = Column(Text)
    windowsbruker = Column(Text)
    defaultprinter = Column(Text)

    # Relationship to User (one-to-one)
    bruker = relationship("User", back_populates="ansatt", uselist=False)