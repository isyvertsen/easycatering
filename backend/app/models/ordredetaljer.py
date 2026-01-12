"""Order detail model (tblordredetaljer)."""
from sqlalchemy import Column, BigInteger, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Ordredetaljer(Base):
    """Order detail table (tblordredetaljer)."""
    __tablename__ = "tblordredetaljer"

    ordreid = Column(BigInteger, ForeignKey("tblordrer.ordreid"), primary_key=True)
    produktid = Column(BigInteger, ForeignKey("tblprodukter.produktid"), primary_key=True)
    unik = Column(BigInteger, primary_key=True)
    levdato = Column(DateTime)
    pris = Column(Float)
    antall = Column(Float)
    rabatt = Column(Float)
    ssma_timestamp = Column(Text)
    ident = Column(Text)

    # Relationships
    produkt = relationship("Produkter", foreign_keys=[produktid], lazy="joined")