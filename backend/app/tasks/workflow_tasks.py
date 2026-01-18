"""Celery tasks for workflow automation.

These tasks are executed by Celery workers to:
1. Check for workflows that should run (scheduled via Celery Beat)
2. Execute workflows and their steps
3. Handle retries and error logging
"""
import asyncio
from datetime import datetime
from typing import Dict, Any, List
from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.celery_app import app
from app.core.config import settings
from app.models.workflow_definition import WorkflowDefinition
from app.models.workflow_schedule import WorkflowSchedule


# Create async engine for Celery tasks
# Note: We create a separate engine because Celery runs in a different process
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncSession:
    """Get async database session for Celery tasks."""
    async with AsyncSessionLocal() as session:
        yield session


class AsyncCeleryTask(Task):
    """Base task class that handles async operations properly.

    Celery tasks run in a synchronous context, but we need to use
    async SQLAlchemy. This base class handles the event loop setup.
    """

    def __call__(self, *args, **kwargs):
        """Execute task by running async method in event loop."""
        # Get or create event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # Run async task
        return loop.run_until_complete(self.run_async(*args, **kwargs))

    async def run_async(self, *args, **kwargs):
        """Override this method with async implementation."""
        raise NotImplementedError("Subclasses must implement run_async()")


@app.task(
    base=AsyncCeleryTask,
    name='app.tasks.workflow_tasks.check_scheduled_workflows',
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # Retry after 60 seconds
)
class CheckScheduledWorkflowsTask(AsyncCeleryTask):
    """Check for workflows that are due to run and trigger their execution.

    This task runs every minute via Celery Beat (configured in celery_app.py).
    It finds all workflows with next_run <= now and triggers execute_workflow task for each.
    """

    async def run_async(self):
        """Check for due workflows and trigger execution."""
        from app.services.workflow_automation_service import WorkflowAutomationService

        async with AsyncSessionLocal() as db:
            try:
                service = WorkflowAutomationService(db)
                due_workflows = await service.get_due_workflows()

                # Trigger execution for each due workflow
                for workflow in due_workflows:
                    # Enqueue execution task (async)
                    execute_workflow.delay(workflow.id)

                result = {
                    'checked_at': datetime.utcnow().isoformat(),
                    'due_count': len(due_workflows),
                    'workflow_ids': [w.id for w in due_workflows],
                    'status': 'success'
                }

                return result

            except Exception as e:
                # Log error and retry
                error_msg = f"Error checking scheduled workflows: {str(e)}"
                print(error_msg)  # Will appear in Celery worker logs

                # Retry task
                raise self.retry(exc=e)


@app.task(
    base=AsyncCeleryTask,
    name='app.tasks.workflow_tasks.execute_workflow',
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # Retry after 5 minutes
)
class ExecuteWorkflowTask(AsyncCeleryTask):
    """Execute a complete workflow including all its steps.

    This task:
    1. Creates a WorkflowExecution record
    2. Executes each step in order
    3. Handles errors and updates status
    4. Updates next_run time for scheduled workflows
    """

    async def run_async(self, workflow_id: int):
        """Execute workflow by ID."""
        from app.services.workflow_execution_engine import WorkflowExecutionEngine

        async with AsyncSessionLocal() as db:
            try:
                engine = WorkflowExecutionEngine(db)
                execution = await engine.execute_workflow(workflow_id)

                result = {
                    'workflow_id': workflow_id,
                    'execution_id': execution.id,
                    'status': execution.status,
                    'started_at': execution.started_at.isoformat(),
                    'completed_at': execution.completed_at.isoformat() if execution.completed_at else None,
                    'error': execution.error_message if execution.error_message else None,
                }

                return result

            except Exception as e:
                error_msg = f"Error executing workflow {workflow_id}: {str(e)}"
                print(error_msg)

                # Retry task
                raise self.retry(exc=e)


@app.task(
    base=AsyncCeleryTask,
    name='app.tasks.workflow_tasks.execute_step',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
class ExecuteStepTask(AsyncCeleryTask):
    """Execute a single workflow step.

    This task executes one step in a workflow and logs the result.
    """

    async def run_async(self, execution_id: int, step_id: int):
        """Execute a single step by ID."""
        from app.services.workflow_execution_engine import WorkflowExecutionEngine

        async with AsyncSessionLocal() as db:
            try:
                engine = WorkflowExecutionEngine(db)
                log = await engine.execute_step(execution_id, step_id)

                result = {
                    'execution_id': execution_id,
                    'step_id': step_id,
                    'action_type': log.action_type,
                    'status': log.status,
                    'performed_at': log.performed_at.isoformat(),
                    'result_data': log.result_data,
                    'error': log.error_message if log.error_message else None,
                }

                return result

            except Exception as e:
                error_msg = f"Error executing step {step_id}: {str(e)}"
                print(error_msg)

                # Retry task
                raise self.retry(exc=e)
