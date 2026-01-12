from sqlalchemy import Column, Integer, String, Float, ForeignKey, Table, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.infrastructure.database.session import Base

recipe_allergens = Table(
    'recipe_allergens',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id')),
    Column('allergen_id', Integer, ForeignKey('recipe_allergen_types.id'))
)

class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"))
    portions = Column(Integer, default=1)
    preparation_time = Column(Integer)  # minutter
    cooking_time = Column(Integer)  # minutter
    instructions = Column(Text)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Beregnede ernæringsverdier
    total_calories = Column(Float)
    total_protein = Column(Float)
    total_fat = Column(Float)
    total_carbs = Column(Float)
    total_fiber = Column(Float)
    total_salt = Column(Float)
    
    # Kostnadsberegning
    total_cost = Column(Float)
    cost_per_portion = Column(Float)
    
    # Tidsstempler
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relasjoner
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    allergens = relationship("RecipeAllergen", secondary=recipe_allergens, back_populates="recipes")
    category = relationship("Category", back_populates="recipes")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("tblprodukter.produktid"), nullable=False)
    amount = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)  # g, kg, dl, l, stk, etc.
    notes = Column(Text)
    
    # Beregnede verdier basert på mengde
    calories = Column(Float)
    protein = Column(Float)
    fat = Column(Float)
    carbs = Column(Float)
    fiber = Column(Float)
    salt = Column(Float)
    cost = Column(Float)
    
    # Relasjoner
    recipe = relationship("Recipe", back_populates="ingredients")
    product = relationship("Produkter", backref="recipe_ingredients")

class RecipeAllergen(Base):
    __tablename__ = "recipe_allergen_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(10), unique=True)  # NO, GL, EG, ML, etc.
    description = Column(Text)
    icon = Column(String(50))  # For UI visning
    
    # Relasjoner
    recipes = relationship("Recipe", secondary=recipe_allergens, back_populates="allergens")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("categories.id"))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relasjoner
    recipes = relationship("Recipe", back_populates="category")
    parent = relationship("Category", remote_side=[id], backref="subcategories")

class RecipeVersion(Base):
    __tablename__ = "recipe_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    changes_description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Lagre snapshot av oppskriften
    recipe_snapshot = Column(Text)  # JSON med hele oppskriften
    
    # Relasjoner
    recipe = relationship("Recipe", backref="versions")