"""
Periode model for the tblperiode table.

This model represents menu periods (typically weekly) in the catering system.
"""

from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Periode(Base):
    """Model for menu periods."""
    
    __tablename__ = "tblperiode"
    
    menyperiodeid = Column(Integer, primary_key=True, index=True)
    ukenr = Column(Integer, nullable=True)
    fradato = Column(DateTime, nullable=True)
    tildato = Column(DateTime, nullable=True)
    
    # Relationships
    periode_menyer = relationship("PeriodeMeny", back_populates="periode")
    
    def __repr__(self):
        return f"<Periode(id={self.menyperiodeid}, uke={self.ukenr}, fra={self.fradato}, til={self.tildato})>"