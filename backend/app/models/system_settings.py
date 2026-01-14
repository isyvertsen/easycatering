"""Database model for system settings."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.infrastructure.database.session import Base


class SystemSettings(Base):
    """
    Systeminnstillinger - nøkkel-verdi par for applikasjonskonfigurasjon.

    Lagrer konfigurerbare innstillinger som kan endres uten kodeendringer.
    Verdier lagres som JSONB for fleksibilitet.
    """
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(JSONB, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
