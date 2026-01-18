"""Production template models (tbl_produksjonstemplate)."""
from sqlalchemy import Column, Integer, String, Text, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class ProduksjonsTemplate(Base):
    """Production template table (tbl_produksjonstemplate).

    Templates define what products/recipes are available for production orders.
    Typically used for customer group 12 (mottakskjøkken/receiving kitchens).
    """
    __tablename__ = "tbl_produksjonstemplate"

    template_id = Column(Integer, primary_key=True, index=True)
    template_navn = Column(String(255), nullable=False)
    beskrivelse = Column(Text)
    kundegruppe = Column(Integer, default=12)
    gyldig_fra = Column(Date)
    gyldig_til = Column(Date)
    aktiv = Column(Boolean, default=True)
    opprettet_dato = Column(DateTime)
    opprettet_av = Column(Integer, ForeignKey("users.id"))

    # Relationships
    detaljer = relationship(
        "ProduksjonsTemplateDetaljer",
        back_populates="template",
        cascade="all, delete-orphan",
        lazy="raise"
    )
    produksjoner = relationship(
        "Produksjon",
        back_populates="template",
        lazy="raise"
    )


class ProduksjonsTemplateDetaljer(Base):
    """Production template details table (tbl_produksjonstemplate_detaljer).

    Contains the products and recipes that are part of a production template.
    Each row is either a product (produktid) or a recipe (kalkyleid).
    """
    __tablename__ = "tbl_produksjonstemplate_detaljer"

    template_detaljid = Column(Integer, primary_key=True, index=True)
    template_id = Column(
        Integer,
        ForeignKey("tbl_produksjonstemplate.template_id", ondelete="CASCADE"),
        nullable=False
    )
    produktid = Column(Integer, ForeignKey("tblprodukter.produktid", ondelete="CASCADE"))
    kalkyleid = Column(Integer, ForeignKey("tbl_rpkalkyle.kalkylekode", ondelete="CASCADE"))
    standard_antall = Column(Integer)
    maks_antall = Column(Integer)
    paakrevd = Column(Boolean, default=False)
    linje_nummer = Column(Integer)

    # Relationships
    template = relationship("ProduksjonsTemplate", back_populates="detaljer")
    produkt = relationship("Produkter", lazy="joined")
    kalkyle = relationship("Kalkyle", lazy="joined")
