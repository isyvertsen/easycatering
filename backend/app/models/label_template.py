"""Label template models."""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Boolean,
    DateTime, ForeignKey, Numeric, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class LabelTemplate(Base):
    """Label template table."""
    __tablename__ = "label_templates"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template_json = Column(JSONB, nullable=False)  # pdfme template structure
    width_mm = Column(Numeric(10, 2), default=100)
    height_mm = Column(Numeric(10, 2), default=50)
    owner_id = Column(Integer, ForeignKey("users.id"))
    is_global = Column(Boolean, default=False)
    thumbnail_url = Column(String(500))
    printer_config = Column(JSONB)  # Zebra printer settings (darkness, speed, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    parameters = relationship(
        "TemplateParameter",
        back_populates="template",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    shares = relationship(
        "TemplateShare",
        back_populates="template",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class TemplateParameter(Base):
    """Template parameter table."""
    __tablename__ = "template_parameters"

    id = Column(BigInteger, primary_key=True, index=True)
    template_id = Column(BigInteger, ForeignKey("label_templates.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(100), nullable=False)  # Name in pdfme schema
    display_name = Column(String(255), nullable=False)  # Display name in UI
    parameter_type = Column(String(50), default="text")  # text, number, date, barcode, qr, image
    source_type = Column(String(50), default="manual")  # manual, database, api
    source_config = Column(JSONB)  # {"table": "products", "column": "name"}
    is_required = Column(Boolean, default=True)
    default_value = Column(Text)
    validation_regex = Column(String(500))
    sort_order = Column(Integer, default=0)

    # Relationships
    template = relationship("LabelTemplate", back_populates="parameters")


class TemplateShare(Base):
    """Template share table."""
    __tablename__ = "template_shares"

    id = Column(BigInteger, primary_key=True, index=True)
    template_id = Column(BigInteger, ForeignKey("label_templates.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    permission = Column(String(20), default="view")  # view, edit
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('template_id', 'shared_with_user_id', name='uq_template_share'),
    )

    # Relationships
    template = relationship("LabelTemplate", back_populates="shares")
    shared_with = relationship("User", foreign_keys=[shared_with_user_id])


class PrintHistory(Base):
    """Print history table."""
    __tablename__ = "print_history"

    id = Column(BigInteger, primary_key=True, index=True)
    template_id = Column(BigInteger, ForeignKey("label_templates.id", ondelete="SET NULL"))
    user_id = Column(Integer, ForeignKey("users.id"))
    printer_name = Column(String(255))
    input_data = Column(JSONB)
    copies = Column(Integer, default=1)
    status = Column(String(50))  # success, failed
    error_message = Column(Text)
    printed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    template = relationship("LabelTemplate")
    user = relationship("User", foreign_keys=[user_id])
