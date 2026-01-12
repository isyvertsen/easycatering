"""
MenyProdukt model for the tblmenyprodukt table.

This model represents the many-to-many relationship between menus and products.
"""

from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class MenyProdukt(Base):
    """Model for linking menus to products."""
    
    __tablename__ = "tblmenyprodukt"
    
    menyid = Column(Integer, ForeignKey("tblmeny.menyid"), primary_key=True)
    produktid = Column(Integer, ForeignKey("tblprodukter.produktid"), primary_key=True)
    
    # Relationships
    meny = relationship("Meny", back_populates="meny_produkter")
    produkt = relationship("Produkter", back_populates="meny_produkter")
    
    def __repr__(self):
        return f"<MenyProdukt(menyid={self.menyid}, produktid={self.produktid})>"