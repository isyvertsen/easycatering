"""Order status model (tblordrestatus)."""
from sqlalchemy import Column, BigInteger, Text

from app.infrastructure.database.session import Base


class Ordrestatus(Base):
    """Order status lookup table (tblordrestatus)."""
    __tablename__ = "tblordrestatus"

    statusid = Column(BigInteger, primary_key=True, index=True)
    statusnavn = Column(Text, nullable=False)
    beskrivelse = Column(Text)
