"""Pydantic schemas for AI Workflow Agent."""
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ChatRole(str, Enum):
    """Chat message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """A single chat message."""
    role: ChatRole
    content: str
    timestamp: Optional[datetime] = None


class WorkflowStep(BaseModel):
    """A single step in a workflow execution."""
    tool_name: str
    tool_description: str
    parameters: Dict[str, Any]
    status: str = "pending"  # pending, executing, completed, failed
    result: Optional[Any] = None
    error: Optional[str] = None
    executed_at: Optional[datetime] = None


class ConfirmationRequest(BaseModel):
    """Request for user confirmation before executing action."""
    workflow_id: str
    summary: str
    details: List[str]
    safety_level: str
    steps: List[WorkflowStep]


class WorkflowChatRequest(BaseModel):
    """Request to the workflow chat endpoint."""
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: Optional[List[ChatMessage]] = Field(default=None)
    confirmed_workflow_id: Optional[str] = Field(
        default=None,
        description="If set, confirms and executes a previously pending workflow"
    )


class WorkflowChatResponse(BaseModel):
    """Response from the workflow chat endpoint."""
    success: bool
    message: str
    requires_confirmation: bool = False
    confirmation_request: Optional[ConfirmationRequest] = None
    executed_steps: Optional[List[WorkflowStep]] = None
    error: Optional[str] = None


class WorkflowConfirmRequest(BaseModel):
    """Request to confirm a pending workflow."""
    workflow_id: str
    confirmed: bool = True


class WorkflowConfirmResponse(BaseModel):
    """Response after confirming a workflow."""
    success: bool
    message: str
    executed_steps: Optional[List[WorkflowStep]] = None
    error: Optional[str] = None
