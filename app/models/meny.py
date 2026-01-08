"""Menu model (tblmeny)."""
from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Meny(Base):
    """Menu table (tblmeny)."""
    __tablename__ = "tblmeny"

    menyid = Column(Integer, primary_key=True, index=True)
    beskrivelse = Column(Text)
    menygruppe = Column(Integer, ForeignKey("tblmenygruppe.menygruppeid"))
    
    # Relationships
    gruppe = relationship("Menygruppe", back_populates="menyer")
    periode_menyer = relationship("PeriodeMeny", back_populates="meny")
    meny_produkter = relationship("MenyProdukt", back_populates="meny")