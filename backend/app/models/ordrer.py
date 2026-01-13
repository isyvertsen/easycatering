"""Order model (tblordrer)."""
from sqlalchemy import Column, BigInteger, Boolean, Float, Text, DateTime, ForeignKey, Integer, String
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
    kansellertdato = Column(DateTime)
    sentbekreftelse = Column(Boolean)
    sentregnskap = Column(DateTime)
    ordrelevert = Column(Text)
    levertagresso = Column(Text)

    # Picking workflow fields
    plukkstatus = Column(String(50))  # KLAR_TIL_PLUKKING, PLUKKET, etc.
    plukket_dato = Column(DateTime)
    plukket_av = Column(Integer, ForeignKey("users.id"))
    pakkseddel_skrevet = Column(DateTime)

    # Webshop order tracking
    bestilt_av = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    kunde = relationship("Kunder", foreign_keys=[kundeid], lazy="joined")
    ansatt = relationship("Ansatte", foreign_keys=[ansattid], lazy="joined")
    detaljer = relationship("Ordredetaljer", foreign_keys="Ordredetaljer.ordreid", lazy="select")
    plukker = relationship("User", foreign_keys=[plukket_av], lazy="joined")
    bestiller = relationship("User", foreign_keys=[bestilt_av], lazy="joined")