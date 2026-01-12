"""Customer group model (tblkundgruppe)."""
from sqlalchemy import Column, BigInteger, Text, Boolean

from app.infrastructure.database.session import Base


class Kundegruppe(Base):
    """Customer group table (tblkundgruppe)."""
    __tablename__ = "tblkundgruppe"

    gruppeid = Column(BigInteger, primary_key=True, index=True)
    gruppe = Column(Text)
    webshop = Column(Boolean)
    autofaktura = Column(Boolean)