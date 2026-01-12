"""Category model (tblkategorier)."""
from sqlalchemy import Column, BigInteger, Text

from app.infrastructure.database.session import Base


class Kategorier(Base):
    """Category table (tblkategorier)."""
    __tablename__ = "tblkategorier"

    kategoriid = Column(BigInteger, primary_key=True, index=True)
    kategori = Column(Text)
    beskrivelse = Column(Text)
    ssma_timestamp = Column(Text)