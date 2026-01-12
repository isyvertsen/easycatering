"""Recipe calculation model (tbl_rpkalkyle)."""
from sqlalchemy import Column, Integer, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Kalkyle(Base):
    """Recipe calculation table (tbl_rpkalkyle)."""
    __tablename__ = "tbl_rpkalkyle"

    kalkylekode = Column(Integer, primary_key=True, index=True)
    kalkylenavn = Column(Text)
    ansattid = Column(Integer, ForeignKey("tblansatte.ansattid"))
    opprettetdato = Column(DateTime)
    revidertdato = Column(DateTime)
    informasjon = Column(Text)
    refporsjon = Column(Text)
    kategorikode = Column(Text)
    antallporsjoner = Column(Integer)
    produksjonsmetode = Column(Text)
    gruppeid = Column(Integer, ForeignKey("tbl_rpkalkylegruppe.gruppeid"))
    alergi = Column(Text)
    leveringsdato = Column(DateTime)
    merknad = Column(Text)
    brukestil = Column(Text)
    enhet = Column(Text)
    naeringsinnhold = Column(Text)
    twporsjon = Column(Float)
    
    # Relationships
    ansatt = relationship("Ansatte")
    gruppe = relationship("Kalkylegruppe")
    detaljer = relationship("Kalkyledetaljer", back_populates="kalkyle")