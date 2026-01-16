"""Unit conversion table model (tbl_rptabenheter)."""
from sqlalchemy import Column, Text, Float, Integer

from app.infrastructure.database.session import Base


class TabEnhet(Base):
    """Unit conversion table (tbl_rptabenheter)."""
    __tablename__ = "tbl_rptabenheter"

    enhet = Column(Text, primary_key=True)
    visningsfaktor = Column(Float)
    kalkuler = Column(Integer)  # 0 or 1 (boolean flag)
