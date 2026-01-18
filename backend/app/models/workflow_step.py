"""Workflow Step Model - Individual steps in a workflow."""
from sqlalchemy import Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Dict, Any, List, Optional

from app.infrastructure.database.session import Base


class WorkflowStep(Base):
    """Individual step in a workflow.

    Each step represents an action to be performed (send email, check condition, etc).
    """
    __tablename__ = "workflow_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflow_definitions.id"),
        nullable=False
    )
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    step_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )  # send_email, check_condition, create_order, wait_until, etc
    trigger_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )  # time_based, condition_based, immediate

    # JSON configurations for different aspects
    trigger_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )  # {"day": "monday", "time": "09:00"}
    action_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )  # {"template_id": 1, "recipients": "all_customers"}
    condition_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True
    )  # {"check": "orders_missing", "days_back": 3}

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    workflow: Mapped["WorkflowDefinition"] = relationship(
        "WorkflowDefinition",
        back_populates="steps"
    )
    action_logs: Mapped[List["WorkflowActionLog"]] = relationship(
        "WorkflowActionLog",
        back_populates="step",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<WorkflowStep(id={self.id}, workflow_id={self.workflow_id}, "
            f"order={self.step_order}, type='{self.step_type}')>"
        )
