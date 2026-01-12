"""Report templates model."""
from sqlalchemy import Column, BigInteger, Text, DateTime, Boolean
from sqlalchemy.sql import func

from app.infrastructure.database.session import Base


class ReportTemplates(Base):
    """Report templates table for storing custom report designs."""
    __tablename__ = "report_templates"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(Text, nullable=False, unique=True, index=True)
    description = Column(Text)
    html = Column(Text, nullable=False)
    css = Column(Text)
    category = Column(Text)  # e.g., "ordre", "kunde", "produkt"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(BigInteger)  # User ID
