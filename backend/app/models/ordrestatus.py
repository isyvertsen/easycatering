"""Order status model (tblordrestatus)."""
from sqlalchemy import Column, Integer, String

from app.infrastructure.database.session import Base


class Ordrestatus(Base):
    """Order status lookup table (tblordrestatus)."""
    __tablename__ = "tblordrestatus"

    statusid = Column(Integer, primary_key=True, index=True)
    status = Column(String, nullable=False)
