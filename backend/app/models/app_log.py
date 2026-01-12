"""Application log model for storing system logs."""
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB

from app.infrastructure.database.session import Base


class AppLog(Base):
    """Application log table for errors, warnings, and info logs."""
    __tablename__ = "app_logs"

    id = Column(BigInteger, primary_key=True, index=True)

    # Log level and message
    level = Column(String(20), nullable=False, index=True)
    logger_name = Column(String(255), index=True)
    message = Column(Text, nullable=False)

    # Exception info
    exception_type = Column(String(255), index=True)
    exception_message = Column(Text)
    traceback = Column(Text)

    # Context
    module = Column(String(255))
    function_name = Column(String(255))
    line_number = Column(Integer)
    path = Column(String(500))

    # Request context (if available)
    request_id = Column(String(100))
    user_id = Column(Integer)
    user_email = Column(String(255))
    ip_address = Column(String(45))
    endpoint = Column(String(500))
    http_method = Column(String(10))

    # Extra data
    extra = Column(JSONB)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<AppLog(id={self.id}, level={self.level}, message={self.message[:50]}...)>"
