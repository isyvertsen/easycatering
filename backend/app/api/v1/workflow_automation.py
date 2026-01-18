"""Workflow Automation API endpoints for creating and managing automated workflows."""
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.domain.entities.user import User
from app.services.workflow_automation_service import WorkflowAutomationService
from app.schemas.workflow_automation import (
    WorkflowDefinition,
    WorkflowDefinitionCreate,
    WorkflowDefinitionUpdate,
    WorkflowDefinitionDetailed,
    WorkflowStep,
    WorkflowStepCreate,
    WorkflowStepUpdate,
    WorkflowSchedule,
    WorkflowScheduleCreate,
    WorkflowScheduleUpdate,
    WorkflowExecution,
    WorkflowExecutionCreate,
    WorkflowExecutionUpdate,
    WorkflowExecutionDetailed,
    WorkflowActionLog,
    WorkflowActionLogCreate,
    WorkflowCreateFull,
    WorkflowStatistics,
)
from pydantic import BaseModel

router = APIRouter()


# Response models for pagination
class WorkflowListResponse(BaseModel):
    """Response model for workflow list with pagination."""
    items: List[WorkflowDefinition]
    total: int
    page: int
    page_size: int
    total_pages: int


class WorkflowExecutionListResponse(BaseModel):
    """Response model for execution list with pagination."""
    items: List[WorkflowExecution]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========================================
# Workflow Definition Endpoints
# ========================================

@router.post("/workflows", response_model=WorkflowDefinition, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowDefinitionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workflow definition."""
    service = WorkflowAutomationService(db)
    # Override created_by with current user
    data.created_by = current_user.id
    return await service.create_workflow(data)


@router.post("/workflows/full", response_model=WorkflowDefinitionDetailed, status_code=status.HTTP_201_CREATED)
async def create_workflow_full(
    data: WorkflowCreateFull,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a complete workflow with steps and schedule in one request."""
    service = WorkflowAutomationService(db)
    # Override created_by with current user
    data.created_by = current_user.id
    workflow = await service.create_workflow_full(data)
    # Fetch with relationships
    return await service.get_workflow(
        workflow.id,
        include_steps=True,
        include_schedule=True,
        include_executions=True
    )


@router.get("/workflows", response_model=WorkflowListResponse)
async def list_workflows(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    workflow_type: Optional[str] = Query(None),
    created_by: Optional[int] = Query(None),
    search: Optional[str] = Query(None, max_length=200),
):
    """List all workflows with pagination and filters."""
    service = WorkflowAutomationService(db)
    items, total = await service.list_workflows(
        page=page,
        page_size=page_size,
        is_active=is_active,
        workflow_type=workflow_type,
        created_by=created_by,
        search=search,
    )

    total_pages = (total + page_size - 1) // page_size

    return WorkflowListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/workflows/{workflow_id}", response_model=WorkflowDefinitionDetailed)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    include_steps: bool = Query(True),
    include_schedule: bool = Query(True),
    include_executions: bool = Query(False),
):
    """Get a workflow by ID with optional related data."""
    service = WorkflowAutomationService(db)
    workflow = await service.get_workflow(
        workflow_id,
        include_steps=include_steps,
        include_schedule=include_schedule,
        include_executions=include_executions,
    )

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )

    return workflow


@router.patch("/workflows/{workflow_id}", response_model=WorkflowDefinition)
async def update_workflow(
    workflow_id: int,
    data: WorkflowDefinitionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a workflow definition."""
    service = WorkflowAutomationService(db)
    workflow = await service.update_workflow(workflow_id, data)

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )

    return workflow


@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workflow (cascade deletes steps, schedule, executions)."""
    service = WorkflowAutomationService(db)
    deleted = await service.delete_workflow(workflow_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )


# ========================================
# Workflow Step Endpoints
# ========================================

@router.post("/workflows/{workflow_id}/steps", response_model=WorkflowStep, status_code=status.HTTP_201_CREATED)
async def create_step(
    workflow_id: int,
    data: WorkflowStepCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new step for a workflow."""
    service = WorkflowAutomationService(db)
    # Ensure workflow exists
    workflow = await service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )

    # Override workflow_id
    data.workflow_id = workflow_id
    return await service.create_step(data)


@router.get("/workflows/{workflow_id}/steps", response_model=List[WorkflowStep])
async def list_steps(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all steps for a workflow."""
    service = WorkflowAutomationService(db)
    return await service.list_steps(workflow_id)


@router.get("/steps/{step_id}", response_model=WorkflowStep)
async def get_step(
    step_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a workflow step by ID."""
    service = WorkflowAutomationService(db)
    step = await service.get_step(step_id)

    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Step med ID {step_id} ble ikke funnet"
        )

    return step


@router.patch("/steps/{step_id}", response_model=WorkflowStep)
async def update_step(
    step_id: int,
    data: WorkflowStepUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a workflow step."""
    service = WorkflowAutomationService(db)
    step = await service.update_step(step_id, data)

    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Step med ID {step_id} ble ikke funnet"
        )

    return step


@router.delete("/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_step(
    step_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workflow step."""
    service = WorkflowAutomationService(db)
    deleted = await service.delete_step(step_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Step med ID {step_id} ble ikke funnet"
        )


# ========================================
# Workflow Schedule Endpoints
# ========================================

@router.post("/workflows/{workflow_id}/schedule", response_model=WorkflowSchedule, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    workflow_id: int,
    data: WorkflowScheduleCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a schedule for a workflow."""
    service = WorkflowAutomationService(db)
    # Ensure workflow exists
    workflow = await service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )

    # Check if schedule already exists
    existing = await service.get_schedule(workflow_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow har allerede en schedule. Bruk PATCH for å oppdatere."
        )

    data.workflow_id = workflow_id
    return await service.create_schedule(data)


@router.get("/workflows/{workflow_id}/schedule", response_model=WorkflowSchedule)
async def get_schedule(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the schedule for a workflow."""
    service = WorkflowAutomationService(db)
    schedule = await service.get_schedule(workflow_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingen schedule funnet for workflow {workflow_id}"
        )

    return schedule


@router.patch("/workflows/{workflow_id}/schedule", response_model=WorkflowSchedule)
async def update_schedule(
    workflow_id: int,
    data: WorkflowScheduleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a workflow schedule."""
    service = WorkflowAutomationService(db)
    schedule = await service.update_schedule(workflow_id, data)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingen schedule funnet for workflow {workflow_id}"
        )

    return schedule


@router.delete("/workflows/{workflow_id}/schedule", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workflow schedule."""
    service = WorkflowAutomationService(db)
    deleted = await service.delete_schedule(workflow_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingen schedule funnet for workflow {workflow_id}"
        )


# ========================================
# Workflow Execution Endpoints
# ========================================

@router.post("/workflows/{workflow_id}/execute", response_model=WorkflowExecution, status_code=status.HTTP_201_CREATED)
async def execute_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually execute a workflow now."""
    service = WorkflowAutomationService(db)

    # Ensure workflow exists
    workflow = await service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )

    # Create execution record
    execution = await service.create_execution(workflow_id)

    # TODO: Trigger actual workflow execution (via Celery task in Phase 2)
    # For now, just create the execution record

    return execution


@router.get("/executions", response_model=WorkflowExecutionListResponse)
async def list_executions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    workflow_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List workflow executions with filters."""
    service = WorkflowAutomationService(db)
    items, total = await service.list_executions(
        workflow_id=workflow_id,
        status=status,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size

    return WorkflowExecutionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/executions/{execution_id}", response_model=WorkflowExecutionDetailed)
async def get_execution(
    execution_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    include_logs: bool = Query(True),
):
    """Get a workflow execution by ID."""
    service = WorkflowAutomationService(db)
    execution = await service.get_execution(execution_id, include_logs=include_logs)

    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Execution med ID {execution_id} ble ikke funnet"
        )

    return execution


@router.get("/executions/{execution_id}/logs", response_model=List[WorkflowActionLog])
async def get_execution_logs(
    execution_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all action logs for an execution."""
    service = WorkflowAutomationService(db)
    return await service.list_action_logs(execution_id)


# ========================================
# Statistics Endpoints
# ========================================

@router.get("/workflows/{workflow_id}/statistics", response_model=WorkflowStatistics)
async def get_workflow_statistics(
    workflow_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for a workflow."""
    service = WorkflowAutomationService(db)

    # Ensure workflow exists
    workflow = await service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow med ID {workflow_id} ble ikke funnet"
        )

    return await service.get_workflow_statistics(workflow_id)
