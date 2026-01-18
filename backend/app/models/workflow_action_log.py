"""Workflow Action Log Model - Detailed logging of workflow actions."""
from sqlalchemy import Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Dict, Any, Optional

from app.infrastructure.database.session import Base


class WorkflowActionLog(Base):
    """Detailed log of each action performed in a workflow execution.

    Records what happened, when, and the results of each step execution.
    """
    __tablename__ = "workflow_action_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    execution_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow_executions.id"),
        nullable=False
    )
    step_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow_steps.id"),
        nullable=False
    )
    action_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )  # send_email, check_condition, create_order, etc

    # Target entity (if applicable)
    target_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )  # kunde_id, order_id, etc
    target_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )  # customer, order, product, etc

    performed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="success",
        nullable=False
    )  # success, failed, skipped

    result_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )  # Structured result data (e.g., {"emails_sent": 45, "failed": 2})
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    execution: Mapped["WorkflowExecution"] = relationship(
        "WorkflowExecution",
        back_populates="action_logs"
    )
    step: Mapped["WorkflowStep"] = relationship(
        "WorkflowStep",
        back_populates="action_logs"
    )

    def __repr__(self) -> str:
        return (
            f"<WorkflowActionLog(id={self.id}, execution_id={self.execution_id}, "
            f"action='{self.action_type}', status='{self.status}')>"
        )
