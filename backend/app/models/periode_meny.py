"""
PeriodeMeny model for the tblperiodemeny table.

This model represents the many-to-many relationship between periods and menus.
"""

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class PeriodeMeny(Base):
    """Model for linking periods to menus."""
    
    __tablename__ = "tblperiodemeny"
    
    periodeid = Column(Integer, ForeignKey("tblperiode.menyperiodeid"), primary_key=True)
    menyid = Column(Integer, ForeignKey("tblmeny.menyid"), primary_key=True)
    
    # Relationships
    periode = relationship("Periode", back_populates="periode_menyer")
    meny = relationship("Meny", back_populates="periode_menyer")
    
    def __repr__(self):
        return f"<PeriodeMeny(periodeid={self.periodeid}, menyid={self.menyid})>"