"""Database models for combined dishes."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.infrastructure.database.session import Base


class CombinedDish(Base):
    """
    Kombinerte retter - sammensatte retter fra flere oppskrifter og/eller produkter.

    Lagrer ferdig komponerte retter som kan hentes senere.
    Næringsverdier beregnes dynamisk hver gang retten hentes for å sikre oppdaterte verdier.
    """
    __tablename__ = "combined_dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    preparation_instructions = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    recipe_components = relationship("CombinedDishRecipe", back_populates="combined_dish", cascade="all, delete-orphan")
    product_components = relationship("CombinedDishProduct", back_populates="combined_dish", cascade="all, delete-orphan")
    created_by = relationship("User")


class CombinedDishRecipe(Base):
    """
    Oppskriftskomponenter i en kombinert rett.
    """
    __tablename__ = "combined_dish_recipes"

    id = Column(Integer, primary_key=True, index=True)
    combined_dish_id = Column(Integer, ForeignKey("combined_dishes.id", ondelete="CASCADE"), nullable=False)
    kalkylekode = Column(Integer, ForeignKey("tbl_rpkalkyle.kalkylekode"), nullable=False)
    amount_grams = Column(Float, nullable=False)

    # Relationships
    combined_dish = relationship("CombinedDish", back_populates="recipe_components")
    recipe = relationship("Kalkyle")


class CombinedDishProduct(Base):
    """
    Produktkomponenter i en kombinert rett.
    """
    __tablename__ = "combined_dish_products"

    id = Column(Integer, primary_key=True, index=True)
    combined_dish_id = Column(Integer, ForeignKey("combined_dishes.id", ondelete="CASCADE"), nullable=False)
    produktid = Column(Integer, ForeignKey("tblprodukter.produktid"), nullable=False)
    amount_grams = Column(Float, nullable=False)

    # Relationships
    combined_dish = relationship("CombinedDish", back_populates="product_components")
    product = relationship("Produkter")
