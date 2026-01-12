"""Activity log model for tracking system events."""
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class ActivityLog(Base):
    """Activity log table for audit trail and metrics."""
    __tablename__ = "activity_logs"

    id = Column(BigInteger, primary_key=True, index=True)

    # User information (denormalized for retention after user deletion)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_email = Column(String(255))
    user_name = Column(String(255))

    # Action details
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True)

    # Request context
    http_method = Column(String(10))
    endpoint = Column(String(500))
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)

    # API metrics
    response_status = Column(Integer, index=True)
    response_time_ms = Column(Integer)

    # Additional data
    details = Column(JSONB)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationship to user (optional, for eager loading)
    user = relationship("User", lazy="joined")

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action={self.action}, resource={self.resource_type})>"
