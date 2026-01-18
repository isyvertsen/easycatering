"""User entity."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


# Association table for user-customer many-to-many relationship
user_kunder = Table(
    'user_kunder',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    Column('kundeid', BigInteger, ForeignKey('tblkunder.kundeid', ondelete='CASCADE'), nullable=False),
    Column('created_at', DateTime, default=datetime.utcnow),
)


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

    # Many-to-many relationship to Kunder (for webshop users with access to multiple customers)
    kunder = relationship("Kunder", secondary=user_kunder, lazy="noload")