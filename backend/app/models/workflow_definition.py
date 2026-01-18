"""Workflow Definition Model - Main workflow configuration."""
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, Optional

from app.infrastructure.database.session import Base


class WorkflowDefinition(Base):
    """Main workflow definition table.

    Stores the core configuration for automated workflows.
    """
    __tablename__ = "workflow_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    workflow_type: Mapped[str] = mapped_column(
        String(50),
        default="scheduled",
        nullable=False
    )  # scheduled | event_based
    created_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    steps: Mapped[List["WorkflowStep"]] = relationship(
        "WorkflowStep",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowStep.step_order"
    )
    schedule: Mapped[Optional["WorkflowSchedule"]] = relationship(
        "WorkflowSchedule",
        back_populates="workflow",
        uselist=False,
        cascade="all, delete-orphan"
    )
    executions: Mapped[List["WorkflowExecution"]] = relationship(
        "WorkflowExecution",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="WorkflowExecution.started_at.desc()"
    )

    def __repr__(self) -> str:
        return f"<WorkflowDefinition(id={self.id}, name='{self.name}', active={self.is_active})>"
