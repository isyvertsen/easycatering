"""Customer model (tblkunder)."""
from sqlalchemy import Column, BigInteger, Boolean, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Kunder(Base):
    """Customer table (tblkunder)."""
    __tablename__ = "tblkunder"

    kundeid = Column(BigInteger, primary_key=True, index=True)
    kundenavn = Column(Text)
    avdeling = Column(Text)
    kontaktid = Column(Text)
    telefonnummer = Column(Text)
    bestillernr = Column(Text)
    lopenr = Column(Float)
    merknad = Column(Text)
    adresse = Column(Text)
    postboks = Column(Float)
    postnr = Column(Text)
    sted = Column(Text)
    velgsone = Column(Integer)
    leveringsdag = Column(Integer)
    kundeinaktiv = Column(Boolean)
    kundenragresso = Column(Float)
    e_post = Column(Text)
    webside = Column(Text)
    kundegruppe = Column(Integer)
    bestillerselv = Column(Boolean)
    rute = Column(BigInteger)
    menyinfo = Column(Text)
    ansattid = Column(BigInteger, ForeignKey("tblansatte.ansattid"))
    sjaforparute = Column(Float)
    diett = Column(Boolean)
    menygruppeid = Column(Float)
    utdato = Column(DateTime)
    inndato = Column(DateTime)
    avsluttet = Column(Boolean)
    eksportkatalog = Column(Text)
    ssma_timestamp = Column(Text)
    mobilnummer = Column(Text)
    formkost = Column(Boolean)
    sykehjemid = Column(BigInteger, ForeignKey("tblkunder.kundeid"))
    e_post2 = Column(Text)
    
    # Relationships
    gruppe = relationship("Kundegruppe", foreign_keys=[kundegruppe], primaryjoin="Kunder.kundegruppe == Kundegruppe.gruppeid", lazy="joined")