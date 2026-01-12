"""Model for tracking Matinfo GTIN updates."""
from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text
from sqlalchemy.sql import func

from app.infrastructure.database.session import Base


class MatinfoGTINUpdate(Base):
    """Table to track GTIN updates from Matinfo API."""
    __tablename__ = "matinfo_gtin_updates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gtin = Column(String(20), nullable=False, unique=True, index=True)
    update_date = Column(DateTime, nullable=False, comment="Date when GTIN was updated in Matinfo")
    sync_date = Column(DateTime, server_default=func.now(), comment="Date when we fetched this update")
    synced = Column(Boolean, default=False, comment="Whether product data has been synced")
    sync_status = Column(String(50), comment="Status of sync: pending, success, failed, skipped")
    error_message = Column(Text, nullable=True, comment="Error message if sync failed")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class MatinfoSyncLog(Base):
    """Table to log Matinfo sync operations."""
    __tablename__ = "matinfo_sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_type = Column(String(50), comment="Type of sync: full, incremental, single")
    start_date = Column(DateTime, nullable=False, comment="Start date of sync operation")
    end_date = Column(DateTime, nullable=True, comment="End date of sync operation")
    since_date = Column(DateTime, nullable=True, comment="Date from which updates were fetched")
    total_gtins = Column(Integer, default=0, comment="Total number of GTINs to process")
    synced_count = Column(Integer, default=0, comment="Number of successfully synced products")
    failed_count = Column(Integer, default=0, comment="Number of failed syncs")
    status = Column(String(50), comment="Status: running, completed, failed")
    error_message = Column(Text, nullable=True, comment="Error message if sync failed")
    created_at = Column(DateTime, server_default=func.now())