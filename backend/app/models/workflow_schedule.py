"""Workflow Schedule Model - Scheduling configuration for workflows."""
from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Dict, Any, Optional

from app.infrastructure.database.session import Base


class WorkflowSchedule(Base):
    """Scheduling configuration for a workflow.

    Defines when and how often a workflow should be executed.
    """
    __tablename__ = "workflow_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow_definitions.id"),
        nullable=False,
        unique=True  # One schedule per workflow
    )
    schedule_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )  # daily, weekly, monthly, cron

    schedule_config: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False
    )  # {"day": "monday", "time": "09:00"} or {"cron": "0 9 * * 1"}

    next_run: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )
    last_run: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Relationships
    workflow: Mapped["WorkflowDefinition"] = relationship(
        "WorkflowDefinition",
        back_populates="schedule"
    )

    def __repr__(self) -> str:
        return (
            f"<WorkflowSchedule(id={self.id}, workflow_id={self.workflow_id}, "
            f"type='{self.schedule_type}', next_run={self.next_run})>"
        )
