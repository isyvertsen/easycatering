"""Order model (tblordrer)."""
from sqlalchemy import Column, BigInteger, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Ordrer(Base):
    """Order table (tblordrer)."""
    __tablename__ = "tblordrer"

    ordreid = Column(BigInteger, primary_key=True, index=True)
    kundeid = Column(BigInteger, ForeignKey("tblkunder.kundeid"))
    ansattid = Column(BigInteger, ForeignKey("tblansatte.ansattid"))
    kundenavn = Column(Text)
    ordredato = Column(DateTime)
    leveringsdato = Column(DateTime)
    fakturadato = Column(DateTime)
    sendestil = Column(Text)
    betalingsmate = Column(BigInteger)
    lagerok = Column(Boolean)
    informasjon = Column(Text)
    ordrestatusid = Column(BigInteger)
    fakturaid = Column(Float)
    ssma_timestamp = Column(Text)
    kansellertdato = Column(DateTime)
    sentbekreftelse = Column(Boolean)
    sentregnskap = Column(DateTime)
    ordrelevert = Column(Text)
    levertagresso = Column(Text)
    
    # Relationships
    kunde = relationship("Kunder", foreign_keys=[kundeid], lazy="joined")
    ansatt = relationship("Ansatte", foreign_keys=[ansattid], lazy="joined")
    detaljer = relationship("Ordredetaljer", foreign_keys="Ordredetaljer.ordreid", lazy="select")