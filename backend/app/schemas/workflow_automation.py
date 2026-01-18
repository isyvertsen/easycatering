"""Workflow Automation schemas for workflow definitions, steps, executions, and logs."""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseSchema


# Workflow Definition Schemas

class WorkflowDefinitionBase(BaseSchema):
    """Base workflow definition schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    workflow_type: str = Field(default="scheduled", pattern="^(scheduled|event_based)$")


class WorkflowDefinitionCreate(WorkflowDefinitionBase):
    """Schema for creating a workflow definition."""
    created_by: int


class WorkflowDefinitionUpdate(BaseSchema):
    """Schema for updating a workflow definition."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WorkflowDefinition(WorkflowDefinitionBase):
    """Workflow definition response schema."""
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime


# Workflow Step Schemas

class WorkflowStepBase(BaseSchema):
    """Base workflow step schema."""
    step_order: int = Field(..., ge=1)
    step_type: str = Field(
        ...,
        pattern="^(send_email|check_condition|create_order|wait_until|send_notification|generate_report|custom_action)$"
    )
    trigger_type: str = Field(
        ...,
        pattern="^(time_based|condition_based|immediate)$"
    )
    trigger_config: Optional[Dict[str, Any]] = None
    action_config: Optional[Dict[str, Any]] = None
    condition_config: Optional[Dict[str, Any]] = None
    is_active: bool = True


class WorkflowStepCreate(WorkflowStepBase):
    """Schema for creating a workflow step."""
    workflow_id: int


class WorkflowStepUpdate(BaseSchema):
    """Schema for updating a workflow step."""
    step_order: Optional[int] = Field(None, ge=1)
    step_type: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    action_config: Optional[Dict[str, Any]] = None
    condition_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class WorkflowStep(WorkflowStepBase):
    """Workflow step response schema."""
    id: int
    workflow_id: int


# Workflow Schedule Schemas

class WorkflowScheduleBase(BaseSchema):
    """Base workflow schedule schema."""
    schedule_type: str = Field(
        ...,
        pattern="^(daily|weekly|monthly|cron)$"
    )
    schedule_config: Dict[str, Any] = Field(
        ...,
        description="Schedule configuration: {day: 'monday', time: '09:00'} or {cron: '0 9 * * 1'}"
    )


class WorkflowScheduleCreate(WorkflowScheduleBase):
    """Schema for creating a workflow schedule."""
    workflow_id: int


class WorkflowScheduleUpdate(BaseSchema):
    """Schema for updating a workflow schedule."""
    schedule_type: Optional[str] = None
    schedule_config: Optional[Dict[str, Any]] = None
    next_run: Optional[datetime] = None


class WorkflowSchedule(WorkflowScheduleBase):
    """Workflow schedule response schema."""
    id: int
    workflow_id: int
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None


# Workflow Execution Schemas

class WorkflowExecutionBase(BaseSchema):
    """Base workflow execution schema."""
    workflow_id: int
    status: str = Field(
        default="running",
        pattern="^(running|completed|failed|paused)$"
    )
    current_step: Optional[int] = None
    error_message: Optional[str] = None


class WorkflowExecutionCreate(BaseSchema):
    """Schema for creating a workflow execution."""
    workflow_id: int


class WorkflowExecutionUpdate(BaseSchema):
    """Schema for updating a workflow execution."""
    status: Optional[str] = None
    current_step: Optional[int] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class WorkflowExecution(WorkflowExecutionBase):
    """Workflow execution response schema."""
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None


# Workflow Action Log Schemas

class WorkflowActionLogBase(BaseSchema):
    """Base workflow action log schema."""
    action_type: str
    target_id: Optional[int] = None
    target_type: Optional[str] = None
    status: str = Field(
        default="success",
        pattern="^(success|failed|skipped)$"
    )
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class WorkflowActionLogCreate(WorkflowActionLogBase):
    """Schema for creating a workflow action log."""
    execution_id: int
    step_id: int


class WorkflowActionLog(WorkflowActionLogBase):
    """Workflow action log response schema."""
    id: int
    execution_id: int
    step_id: int
    performed_at: datetime


# Complex Workflow Schemas (with relationships)

class WorkflowStepWithLogs(WorkflowStep):
    """Workflow step with action logs."""
    action_logs: List[WorkflowActionLog] = []


class WorkflowExecutionDetailed(WorkflowExecution):
    """Workflow execution with detailed logs."""
    action_logs: List[WorkflowActionLog] = []
    workflow: Optional[WorkflowDefinition] = None


class WorkflowDefinitionDetailed(WorkflowDefinition):
    """Workflow definition with steps, schedule, and recent executions."""
    steps: List[WorkflowStep] = []
    schedule: Optional[WorkflowSchedule] = None
    executions: List[WorkflowExecution] = []


# Workflow Creation (Full Definition with Steps)

class WorkflowStepInput(BaseModel):
    """Input schema for creating a workflow step within a workflow."""
    step_order: int = Field(..., ge=1)
    step_type: str
    trigger_type: str
    trigger_config: Optional[Dict[str, Any]] = None
    action_config: Optional[Dict[str, Any]] = None
    condition_config: Optional[Dict[str, Any]] = None


class WorkflowScheduleInput(BaseModel):
    """Input schema for creating a workflow schedule within a workflow."""
    schedule_type: str
    schedule_config: Dict[str, Any]


class WorkflowCreateFull(BaseModel):
    """Schema for creating a complete workflow with steps and schedule."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    workflow_type: str = Field(default="scheduled")
    created_by: int
    steps: List[WorkflowStepInput] = Field(default_factory=list)
    schedule: Optional[WorkflowScheduleInput] = None


# Workflow Execution Request

class WorkflowExecutionRequest(BaseModel):
    """Request schema for manually executing a workflow."""
    workflow_id: int


# Workflow Statistics

class WorkflowStatistics(BaseModel):
    """Statistics for a workflow."""
    workflow_id: int
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    average_duration_seconds: Optional[float] = None
    last_execution: Optional[datetime] = None
    next_scheduled_run: Optional[datetime] = None
