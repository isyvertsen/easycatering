"""Product model (tblprodukter)."""
from sqlalchemy import Column, BigInteger, Boolean, Float, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Produkter(Base):
    """Product table (tblprodukter)."""
    __tablename__ = "tblprodukter"

    produktid = Column(BigInteger, primary_key=True, index=True)
    produktnavn = Column(Text)
    leverandorsproduktnr = Column(Text)
    antalleht = Column(Float)
    pakningstype = Column(Text)
    pakningsstorrelse = Column(Text)
    pris = Column(Float)
    paknpris = Column(Text)
    levrandorid = Column(BigInteger, ForeignKey("tblleverandorer.leverandorid"))
    kategoriid = Column(BigInteger, ForeignKey("tblkategorier.kategoriid"))
    lagermengde = Column(Float)
    bestillingsgrense = Column(Float)
    bestillingsmengde = Column(Float)
    ean_kode = Column(Text)
    utgatt = Column(Boolean)
    oppdatert = Column(Boolean)
    webshop = Column(Boolean)
    mvaverdi = Column(Float)
    ssma_timestamp = Column(Text)
    lagerid = Column(Float)
    utregningsfaktor = Column(Float)
    utregnetpris = Column(Float)
    visningsnavn = Column(Text)
    visningsnavn2 = Column(Text)
    rett_komponent = Column(Boolean, default=False)
    # Removed columns that no longer exist in database:
    # allergenprodukt, energikj, kalorier, fett, mettetfett,
    # karbohydrater, sukkerarter, kostfiber, protein, salt,
    # monodisakk, matvareid, webshopsted

    # Relationships
    meny_produkter = relationship("MenyProdukt", back_populates="produkt")