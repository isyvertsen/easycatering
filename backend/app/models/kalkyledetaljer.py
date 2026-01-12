"""Recipe calculation details model (tbl_rpkalkyledetaljer)."""
from sqlalchemy import Column, BigInteger, Text, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Kalkyledetaljer(Base):
    """Recipe calculation details table (tbl_rpkalkyledetaljer)."""
    __tablename__ = "tbl_rpkalkyledetaljer"

    # Primary key
    tblkalkyledetaljerid = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign keys
    kalkylekode = Column(BigInteger, ForeignKey("tbl_rpkalkyle.kalkylekode"), nullable=False)
    produktid = Column(BigInteger, ForeignKey("tblprodukter.produktid"), nullable=False)
    
    # Product info
    produktnavn = Column(Text)
    leverandorsproduktnr = Column(Text)
    pris = Column(Float)
    porsjonsmengde = Column(BigInteger)
    enh = Column(Text)
    totmeng = Column(Float)
    kostpris = Column(Text)
    visningsenhet = Column(Text)
    svinnprosent = Column(Text)
    
    # Nutrition info
    energikj = Column(Text)
    kalorier = Column(Text)
    fett = Column(Text)
    mettetfett = Column(Text)
    karbohydrater = Column(Text)
    sukkerarter = Column(Text)
    kostfiber = Column(Text)
    protein = Column(Text)
    salt = Column(Text)
    monodisakk = Column(Text)
    
    # Relationships
    kalkyle = relationship("Kalkyle", back_populates="detaljer")
    produkt = relationship("Produkter")