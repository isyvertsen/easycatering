"""Customer access token model for self-service ordering."""
from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.infrastructure.database.session import Base


class CustomerAccessToken(Base):
    """Token for customer self-service order access."""
    __tablename__ = "customer_access_tokens"

    id = Column(Integer, primary_key=True, index=True)
    kundeid = Column(BigInteger, ForeignKey("tblkunder.kundeid"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    kunde = relationship("Kunder", lazy="joined")
