"""Workflow Execution Model - Tracks workflow execution instances."""
from sqlalchemy import Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, Optional

from app.infrastructure.database.session import Base


class WorkflowExecution(Base):
    """Records of workflow executions.

    Each time a workflow runs, an execution record is created to track progress and results.
    """
    __tablename__ = "workflow_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow_definitions.id"),
        nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="running",
        nullable=False
    )  # running, completed, failed, paused
    current_step: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )  # Current step order being executed
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    workflow: Mapped["WorkflowDefinition"] = relationship(
        "WorkflowDefinition",
        back_populates="executions"
    )
    action_logs: Mapped[List["WorkflowActionLog"]] = relationship(
        "WorkflowActionLog",
        back_populates="execution",
        cascade="all, delete-orphan",
        order_by="WorkflowActionLog.performed_at"
    )

    def __repr__(self) -> str:
        return (
            f"<WorkflowExecution(id={self.id}, workflow_id={self.workflow_id}, "
            f"status='{self.status}', started={self.started_at})>"
        )
