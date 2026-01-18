"""Workflow Automation Service for managing workflows, execution, and scheduling."""
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy import select, func, and_, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workflow_definition import WorkflowDefinition
from app.models.workflow_step import WorkflowStep
from app.models.workflow_schedule import WorkflowSchedule
from app.models.workflow_execution import WorkflowExecution
from app.models.workflow_action_log import WorkflowActionLog
from app.schemas.workflow_automation import (
    WorkflowDefinitionCreate,
    WorkflowDefinitionUpdate,
    WorkflowStepCreate,
    WorkflowStepUpdate,
    WorkflowScheduleCreate,
    WorkflowScheduleUpdate,
    WorkflowExecutionCreate,
    WorkflowExecutionUpdate,
    WorkflowActionLogCreate,
    WorkflowCreateFull,
    WorkflowStatistics,
)

logger = logging.getLogger(__name__)


class WorkflowAutomationService:
    """Service for workflow automation operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================
    # Workflow Definition CRUD
    # ========================================

    async def create_workflow(
        self,
        data: WorkflowDefinitionCreate
    ) -> WorkflowDefinition:
        """Create a new workflow definition."""
        workflow = WorkflowDefinition(
            name=data.name,
            description=data.description,
            is_active=data.is_active,
            workflow_type=data.workflow_type,
            created_by=data.created_by,
        )
        self.db.add(workflow)
        await self.db.commit()
        await self.db.refresh(workflow)
        logger.info(f"Created workflow: {workflow.id} - {workflow.name}")
        return workflow

    async def create_workflow_full(
        self,
        data: WorkflowCreateFull
    ) -> WorkflowDefinition:
        """Create a complete workflow with steps and schedule."""
        # Create workflow
        workflow = WorkflowDefinition(
            name=data.name,
            description=data.description,
            is_active=data.is_active,
            workflow_type=data.workflow_type,
            created_by=data.created_by,
        )
        self.db.add(workflow)
        await self.db.flush()  # Get workflow.id

        # Create steps
        for step_input in data.steps:
            step = WorkflowStep(
                workflow_id=workflow.id,
                step_order=step_input.step_order,
                step_type=step_input.step_type,
                trigger_type=step_input.trigger_type,
                trigger_config=step_input.trigger_config,
                action_config=step_input.action_config,
                condition_config=step_input.condition_config,
            )
            self.db.add(step)

        # Create schedule if provided
        if data.schedule:
            schedule = WorkflowSchedule(
                workflow_id=workflow.id,
                schedule_type=data.schedule.schedule_type,
                schedule_config=data.schedule.schedule_config,
            )
            # Calculate next_run based on schedule
            schedule.next_run = self._calculate_next_run(
                data.schedule.schedule_type,
                data.schedule.schedule_config
            )
            self.db.add(schedule)

        await self.db.commit()
        await self.db.refresh(workflow)
        logger.info(f"Created full workflow: {workflow.id} with {len(data.steps)} steps")
        return workflow

    async def get_workflow(
        self,
        workflow_id: int,
        include_steps: bool = False,
        include_schedule: bool = False,
        include_executions: bool = False
    ) -> Optional[WorkflowDefinition]:
        """Get a workflow by ID with optional related data."""
        query = select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id)

        if include_steps:
            query = query.options(selectinload(WorkflowDefinition.steps))
        if include_schedule:
            query = query.options(selectinload(WorkflowDefinition.schedule))
        if include_executions:
            query = query.options(selectinload(WorkflowDefinition.executions))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_workflows(
        self,
        page: int = 1,
        page_size: int = 50,
        is_active: Optional[bool] = None,
        workflow_type: Optional[str] = None,
        created_by: Optional[int] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[WorkflowDefinition], int]:
        """List workflows with filters and pagination."""
        query = select(WorkflowDefinition)
        count_query = select(func.count()).select_from(WorkflowDefinition)

        # Apply filters
        filters = []
        if is_active is not None:
            filters.append(WorkflowDefinition.is_active == is_active)
        if workflow_type:
            filters.append(WorkflowDefinition.workflow_type == workflow_type)
        if created_by:
            filters.append(WorkflowDefinition.created_by == created_by)
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    WorkflowDefinition.name.ilike(search_term),
                    WorkflowDefinition.description.ilike(search_term)
                )
            )

        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting and pagination
        query = query.order_by(desc(WorkflowDefinition.created_at))
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total

    async def update_workflow(
        self,
        workflow_id: int,
        data: WorkflowDefinitionUpdate
    ) -> Optional[WorkflowDefinition]:
        """Update a workflow definition."""
        workflow = await self.get_workflow(workflow_id)
        if not workflow:
            return None

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)

        workflow.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(workflow)
        logger.info(f"Updated workflow: {workflow_id}")
        return workflow

    async def delete_workflow(self, workflow_id: int) -> bool:
        """Delete a workflow (cascade deletes steps, schedule, executions)."""
        workflow = await self.get_workflow(workflow_id)
        if not workflow:
            return False

        await self.db.delete(workflow)
        await self.db.commit()
        logger.info(f"Deleted workflow: {workflow_id}")
        return True

    # ========================================
    # Workflow Step CRUD
    # ========================================

    async def create_step(self, data: WorkflowStepCreate) -> WorkflowStep:
        """Create a new workflow step."""
        step = WorkflowStep(
            workflow_id=data.workflow_id,
            step_order=data.step_order,
            step_type=data.step_type,
            trigger_type=data.trigger_type,
            trigger_config=data.trigger_config,
            action_config=data.action_config,
            condition_config=data.condition_config,
            is_active=data.is_active,
        )
        self.db.add(step)
        await self.db.commit()
        await self.db.refresh(step)
        logger.info(f"Created step: {step.id} for workflow {step.workflow_id}")
        return step

    async def get_step(self, step_id: int) -> Optional[WorkflowStep]:
        """Get a workflow step by ID."""
        result = await self.db.execute(
            select(WorkflowStep).where(WorkflowStep.id == step_id)
        )
        return result.scalar_one_or_none()

    async def list_steps(self, workflow_id: int) -> List[WorkflowStep]:
        """List all steps for a workflow, ordered by step_order."""
        result = await self.db.execute(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_id == workflow_id)
            .order_by(WorkflowStep.step_order)
        )
        return result.scalars().all()

    async def update_step(
        self,
        step_id: int,
        data: WorkflowStepUpdate
    ) -> Optional[WorkflowStep]:
        """Update a workflow step."""
        step = await self.get_step(step_id)
        if not step:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(step, field, value)

        await self.db.commit()
        await self.db.refresh(step)
        logger.info(f"Updated step: {step_id}")
        return step

    async def delete_step(self, step_id: int) -> bool:
        """Delete a workflow step."""
        step = await self.get_step(step_id)
        if not step:
            return False

        await self.db.delete(step)
        await self.db.commit()
        logger.info(f"Deleted step: {step_id}")
        return True

    # ========================================
    # Workflow Schedule CRUD
    # ========================================

    async def create_schedule(self, data: WorkflowScheduleCreate) -> WorkflowSchedule:
        """Create a new workflow schedule."""
        schedule = WorkflowSchedule(
            workflow_id=data.workflow_id,
            schedule_type=data.schedule_type,
            schedule_config=data.schedule_config,
        )
        # Calculate next_run
        schedule.next_run = self._calculate_next_run(
            data.schedule_type,
            data.schedule_config
        )
        self.db.add(schedule)
        await self.db.commit()
        await self.db.refresh(schedule)
        logger.info(f"Created schedule: {schedule.id} for workflow {schedule.workflow_id}")
        return schedule

    async def get_schedule(
        self,
        workflow_id: int
    ) -> Optional[WorkflowSchedule]:
        """Get the schedule for a workflow."""
        result = await self.db.execute(
            select(WorkflowSchedule).where(WorkflowSchedule.workflow_id == workflow_id)
        )
        return result.scalar_one_or_none()

    async def update_schedule(
        self,
        workflow_id: int,
        data: WorkflowScheduleUpdate
    ) -> Optional[WorkflowSchedule]:
        """Update a workflow schedule."""
        schedule = await self.get_schedule(workflow_id)
        if not schedule:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(schedule, field, value)

        # Recalculate next_run if schedule changed
        if "schedule_type" in update_data or "schedule_config" in update_data:
            schedule.next_run = self._calculate_next_run(
                schedule.schedule_type,
                schedule.schedule_config
            )

        await self.db.commit()
        await self.db.refresh(schedule)
        logger.info(f"Updated schedule for workflow: {workflow_id}")
        return schedule

    async def delete_schedule(self, workflow_id: int) -> bool:
        """Delete a workflow schedule."""
        schedule = await self.get_schedule(workflow_id)
        if not schedule:
            return False

        await self.db.delete(schedule)
        await self.db.commit()
        logger.info(f"Deleted schedule for workflow: {workflow_id}")
        return True

    # ========================================
    # Workflow Execution
    # ========================================

    async def create_execution(
        self,
        workflow_id: int
    ) -> WorkflowExecution:
        """Create a new workflow execution."""
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status="running",
            started_at=datetime.utcnow(),
        )
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)
        logger.info(f"Created execution: {execution.id} for workflow {workflow_id}")
        return execution

    async def get_execution(
        self,
        execution_id: int,
        include_logs: bool = False
    ) -> Optional[WorkflowExecution]:
        """Get a workflow execution by ID."""
        query = select(WorkflowExecution).where(WorkflowExecution.id == execution_id)

        if include_logs:
            query = query.options(selectinload(WorkflowExecution.action_logs))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_executions(
        self,
        workflow_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[WorkflowExecution], int]:
        """List workflow executions with filters."""
        query = select(WorkflowExecution)
        count_query = select(func.count()).select_from(WorkflowExecution)

        filters = []
        if workflow_id:
            filters.append(WorkflowExecution.workflow_id == workflow_id)
        if status:
            filters.append(WorkflowExecution.status == status)

        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting and pagination
        query = query.order_by(desc(WorkflowExecution.started_at))
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total

    async def update_execution(
        self,
        execution_id: int,
        data: WorkflowExecutionUpdate
    ) -> Optional[WorkflowExecution]:
        """Update a workflow execution."""
        execution = await self.get_execution(execution_id)
        if not execution:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(execution, field, value)

        await self.db.commit()
        await self.db.refresh(execution)
        return execution

    async def complete_execution(
        self,
        execution_id: int,
        status: str = "completed",
        error_message: Optional[str] = None
    ) -> Optional[WorkflowExecution]:
        """Mark an execution as completed or failed."""
        execution = await self.get_execution(execution_id)
        if not execution:
            return None

        execution.status = status
        execution.completed_at = datetime.utcnow()
        if error_message:
            execution.error_message = error_message

        await self.db.commit()
        await self.db.refresh(execution)
        logger.info(f"Execution {execution_id} completed with status: {status}")
        return execution

    # ========================================
    # Workflow Action Logs
    # ========================================

    async def create_action_log(
        self,
        data: WorkflowActionLogCreate
    ) -> WorkflowActionLog:
        """Create a new action log entry."""
        log = WorkflowActionLog(
            execution_id=data.execution_id,
            step_id=data.step_id,
            action_type=data.action_type,
            target_id=data.target_id,
            target_type=data.target_type,
            status=data.status,
            result_data=data.result_data,
            error_message=data.error_message,
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def list_action_logs(
        self,
        execution_id: int
    ) -> List[WorkflowActionLog]:
        """List all action logs for an execution."""
        result = await self.db.execute(
            select(WorkflowActionLog)
            .where(WorkflowActionLog.execution_id == execution_id)
            .order_by(WorkflowActionLog.performed_at)
        )
        return result.scalars().all()

    # ========================================
    # Statistics
    # ========================================

    async def get_workflow_statistics(
        self,
        workflow_id: int
    ) -> WorkflowStatistics:
        """Get statistics for a workflow."""
        # Get total executions
        total_result = await self.db.execute(
            select(func.count()).select_from(WorkflowExecution)
            .where(WorkflowExecution.workflow_id == workflow_id)
        )
        total_executions = total_result.scalar() or 0

        # Get successful executions
        success_result = await self.db.execute(
            select(func.count()).select_from(WorkflowExecution)
            .where(
                and_(
                    WorkflowExecution.workflow_id == workflow_id,
                    WorkflowExecution.status == "completed"
                )
            )
        )
        successful_executions = success_result.scalar() or 0

        # Get failed executions
        failed_result = await self.db.execute(
            select(func.count()).select_from(WorkflowExecution)
            .where(
                and_(
                    WorkflowExecution.workflow_id == workflow_id,
                    WorkflowExecution.status == "failed"
                )
            )
        )
        failed_executions = failed_result.scalar() or 0

        # Calculate success rate
        success_rate = (
            successful_executions / total_executions
            if total_executions > 0
            else 0.0
        )

        # Get average duration
        duration_result = await self.db.execute(
            select(func.avg(
                func.extract('epoch', WorkflowExecution.completed_at - WorkflowExecution.started_at)
            ))
            .where(
                and_(
                    WorkflowExecution.workflow_id == workflow_id,
                    WorkflowExecution.completed_at.isnot(None)
                )
            )
        )
        avg_duration = duration_result.scalar()

        # Get last execution
        last_exec_result = await self.db.execute(
            select(WorkflowExecution.started_at)
            .where(WorkflowExecution.workflow_id == workflow_id)
            .order_by(desc(WorkflowExecution.started_at))
            .limit(1)
        )
        last_execution = last_exec_result.scalar_one_or_none()

        # Get next scheduled run
        schedule = await self.get_schedule(workflow_id)
        next_scheduled_run = schedule.next_run if schedule else None

        return WorkflowStatistics(
            workflow_id=workflow_id,
            total_executions=total_executions,
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            success_rate=success_rate,
            average_duration_seconds=avg_duration,
            last_execution=last_execution,
            next_scheduled_run=next_scheduled_run,
        )

    # ========================================
    # Scheduling Helpers
    # ========================================

    def _calculate_next_run(
        self,
        schedule_type: str,
        schedule_config: Dict[str, Any]
    ) -> Optional[datetime]:
        """Calculate the next run time based on schedule configuration."""
        now = datetime.utcnow()

        if schedule_type == "daily":
            # Daily at specific time
            time_str = schedule_config.get("time", "09:00")
            hour, minute = map(int, time_str.split(":"))
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
            return next_run

        elif schedule_type == "weekly":
            # Weekly on specific day
            # TODO: Implement weekly scheduling logic
            # For now, return next week same time
            return now + timedelta(days=7)

        elif schedule_type == "monthly":
            # Monthly on specific day
            # TODO: Implement monthly scheduling logic
            return now + timedelta(days=30)

        elif schedule_type == "cron":
            # Cron expression
            # TODO: Implement cron parsing (use croniter library)
            logger.warning("Cron scheduling not yet implemented")
            return None

        return None

    async def get_due_workflows(self) -> List[WorkflowDefinition]:
        """Get all workflows that are due to run."""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(WorkflowDefinition)
            .join(WorkflowSchedule)
            .where(
                and_(
                    WorkflowDefinition.is_active == True,
                    WorkflowSchedule.next_run <= now
                )
            )
            .options(
                selectinload(WorkflowDefinition.steps),
                selectinload(WorkflowDefinition.schedule)
            )
        )
        return result.scalars().all()
