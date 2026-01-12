"""Database model for preparation instructions."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.infrastructure.database.session import Base


class PreparationInstruction(Base):
    """
    Tilberedningsinstruksjoner - forhåndsdefinerte instruksjoner for oppvarming og tilberedning.

    Lagrer instruksjoner som kan brukes på kombinerte retter.
    AI kan evaluere og forbedre instruksjonene før de lagres.
    """
    __tablename__ = "preparation_instructions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Optional: Track if this was AI-enhanced
    ai_enhanced = Column(Boolean, default=False, nullable=False)
