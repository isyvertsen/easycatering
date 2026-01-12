"""
Matinfo oppslagstabeller - KUN for Matinfo.no produkt data.

VIKTIG: Dette er IKKE hovedproduktene!
- Hovedprodukter: tblprodukter (Produkter modell i produkter.py)
- Matinfo data: matinfo_* tabeller (denne filen)

Matinfo tabeller brukes kun som oppslag for næringsdata og allergener.
"""
from sqlalchemy import Column, String, Text, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base

__all__ = [
    "MatinfoProduct",
    "MatinfoNutrient",
    "MatinfoAllergen"
]


# MATINFO OPPSLAGSTABELLER - Fra Matinfo.no API
class MatinfoProduct(Base):
    """Matinfo product table (matinfo_products).

    Note: Column names match existing database schema (camelCase without underscores).
    """
    __tablename__ = "matinfo_products"

    id = Column(String(24), primary_key=True)
    gtin = Column(String(20), unique=True, index=True)
    name = Column(String(255))
    itemnumber = Column(String(50))
    epdnumber = Column(String(50))
    producername = Column(String(255))
    providername = Column(String(255))
    brandname = Column(String(255))
    ingredientstatement = Column(Text)
    producturl = Column(String(500))
    markings = Column(Text)
    images = Column(Text)
    packagesize = Column(String(100))
    productdescription = Column(Text)
    countryoforigin = Column(String(100))
    countryofpreparation = Column(String(100))
    fpakk = Column(String(20))
    dpakk = Column(String(20))
    pall = Column(String(20))
    created = Column(String(50))
    updated = Column(String(50))

    # Relationships
    nutrients = relationship("MatinfoNutrient", back_populates="product", cascade="all, delete-orphan")
    allergens = relationship("MatinfoAllergen", back_populates="product", cascade="all, delete-orphan")


class MatinfoNutrient(Base):
    """Matinfo nutrient table (matinfo_nutrients).

    Note: Column names match existing database schema (camelCase without underscores).
    """
    __tablename__ = "matinfo_nutrients"

    nutrientid = Column(Integer, primary_key=True, autoincrement=True)
    productid = Column(String(24), ForeignKey("matinfo_products.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(255))
    measurement = Column(Numeric(10, 2))
    measurementprecision = Column(String(50))
    measurementtype = Column(String(50))

    # Relationships
    product = relationship("MatinfoProduct", back_populates="nutrients")


class MatinfoAllergen(Base):
    """Matinfo allergen table (matinfo_allergens).

    Note: Column names match existing database schema (camelCase without underscores).
    """
    __tablename__ = "matinfo_allergens"

    allergenid = Column(Integer, primary_key=True, autoincrement=True)
    productid = Column(String(24), ForeignKey("matinfo_products.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(255))
    level = Column(Integer)

    # Relationships
    product = relationship("MatinfoProduct", back_populates="allergens")
