"""Recipe calculation group model (tbl_rpkalkylegruppe)."""
from sqlalchemy import Column, Integer, Text
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Kalkylegruppe(Base):
    """Recipe calculation group table (tbl_rpkalkylegruppe)."""
    __tablename__ = "tbl_rpkalkylegruppe"

    gruppeid = Column(Integer, primary_key=True, index=True)
    beskrivelse = Column(Text)
    
    # Relationships
    kalkyler = relationship("Kalkyle", back_populates="gruppe")