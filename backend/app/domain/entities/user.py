"""User entity."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class User(Base):
    """User entity."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    google_id = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Link to employee (ansatt)
    ansattid = Column(BigInteger, ForeignKey("tblansatte.ansattid"), nullable=True, index=True)
    rolle = Column(String(50), default="bruker", index=True)  # bruker, admin, etc.

    # Relationship to Ansatte
    ansatt = relationship("Ansatte", back_populates="bruker", lazy="joined")