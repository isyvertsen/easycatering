"""Production order models (tbl_rpproduksjon)."""
from sqlalchemy import Column, Integer, BigInteger, String, Text, Date, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class Produksjon(Base):
    """Production order table (tbl_rpproduksjon).

    Pre-order system for production planning:
    1. Template is distributed to customers in group 12
    2. Customers fill out quantities (webshop-like)
    3. Admin approves
    4. Approved orders are transferred to tblordrer
    """
    __tablename__ = "tbl_rpproduksjon"

    produksjonkode = Column(Integer, primary_key=True, index=True)
    kundeid = Column(Integer, ForeignKey("tblkunder.kundeid"), nullable=False)
    ansattid = Column(Integer, ForeignKey("tblansatte.ansattid"), nullable=False)
    informasjon = Column(Text)
    refporsjon = Column(String(255))
    antallporsjoner = Column(Integer)
    leveringsdato = Column(DateTime)
    merknad = Column(String(255))
    created = Column(DateTime)

    # New fields for template-based workflow
    template_id = Column(Integer, ForeignKey("tbl_produksjonstemplate.template_id"))
    periodeid = Column(Integer, ForeignKey("tblperiode.menyperiodeid"))
    status = Column(String(50), default='draft')  # draft, submitted, approved, rejected, transferred, produced
    opprettet_av = Column(Integer, ForeignKey("users.id"))
    oppdatert_dato = Column(DateTime)
    innsendt_dato = Column(DateTime)
    godkjent_dato = Column(DateTime)
    godkjent_av = Column(Integer, ForeignKey("users.id"))

    # Order transfer fields (Phase 6)
    ordre_id = Column(BigInteger, ForeignKey("tblordrer.ordreid"))
    overfort_dato = Column(DateTime)
    overfort_av = Column(Integer, ForeignKey("users.id"))

    # Relationships
    kunde = relationship("Kunder", foreign_keys=[kundeid], lazy="joined")
    ansatt = relationship("Ansatte", foreign_keys=[ansattid], lazy="joined")
    template = relationship("ProduksjonsTemplate", back_populates="produksjoner", lazy="joined")
    periode = relationship("Periode", lazy="joined")
    detaljer = relationship(
        "ProduksjonsDetaljer",
        back_populates="produksjon",
        cascade="all, delete-orphan",
        lazy="raise"
    )
    ordre = relationship("Ordrer", foreign_keys=[ordre_id], lazy="joined")
    opprettet_av_bruker = relationship("User", foreign_keys=[opprettet_av], lazy="joined")
    godkjent_av_bruker = relationship("User", foreign_keys=[godkjent_av], lazy="joined")
    overfort_av_bruker = relationship("User", foreign_keys=[overfort_av], lazy="joined")


class ProduksjonsDetaljer(Base):
    """Production order details table (tbl_rpproduksjondetaljer).

    Contains the actual quantities ordered by the customer.
    Each row is either a product (produktid) or a recipe (kalkyleid).
    """
    __tablename__ = "tbl_rpproduksjondetaljer"

    # Note: This table doesn't have a dedicated primary key in the existing schema
    # Using composite key of produksjonskode + produktid
    produksjonskode = Column(BigInteger, ForeignKey("tbl_rpproduksjon.produksjonkode", ondelete="CASCADE"), primary_key=True, nullable=False)
    produktid = Column(BigInteger, ForeignKey("tblprodukter.produktid"), primary_key=True, nullable=False)

    # Denormalized fields (from existing table)
    produktnavn = Column(Text)
    leverandorsproduktnr = Column(Text)
    pris = Column(Float)
    porsjonsmengde = Column(Float)
    enh = Column(Text)
    totmeng = Column(Float)
    kostpris = Column(Float)
    visningsenhet = Column(Text)
    dag = Column(Float)
    antallporsjoner = Column(Float)

    # New fields
    kalkyleid = Column(Integer, ForeignKey("tbl_rpkalkyle.kalkylekode", ondelete="CASCADE"))
    kommentar = Column(Text)
    linje_nummer = Column(Integer)

    # Relationships
    produksjon = relationship("Produksjon", back_populates="detaljer")
    produkt = relationship("Produkter", foreign_keys=[produktid], lazy="joined")
    kalkyle = relationship("Kalkyle", foreign_keys=[kalkyleid], lazy="joined")
