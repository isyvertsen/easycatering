"""Menu group model (tblmenygruppe)."""
from sqlalchemy import Column, Integer, Text
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Menygruppe(Base):
    """Menu group table (tblmenygruppe)."""
    __tablename__ = "tblmenygruppe"

    menygruppeid = Column(Integer, primary_key=True, index=True)
    beskrivelse = Column(Text)
    kode = Column(Text)

    # Alias for backward compatibility
    @property
    def gruppeid(self):
        return self.menygruppeid

    # Relationships
    menyer = relationship("Meny", back_populates="gruppe")