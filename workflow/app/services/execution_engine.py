"""Workflow Execution Engine - Executes workflows and their steps.

This service handles the actual execution of workflows:
1. Creating execution records
2. Running steps in order
3. Handling different step types (email, conditions, etc.)
4. Logging results
5. Updating next run times for scheduled workflows
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import sys

# Add backend to path
backend_path = Path(__file__).parent.parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

# Import from backend
from app.models.workflow_definition import WorkflowDefinition
from app.models.workflow_step import WorkflowStep
from app.models.workflow_execution import WorkflowExecution
from app.models.workflow_action_log import WorkflowActionLog
from app.models.workflow_schedule import WorkflowSchedule


class WorkflowExecutionEngine:
    """Executes workflows and their steps."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_workflow(self, workflow_id: int) -> WorkflowExecution:
        """Execute all steps in a workflow.

        Args:
            workflow_id: ID of workflow to execute

        Returns:
            WorkflowExecution record with results

        Raises:
            Exception: If workflow execution fails
        """
        # Get workflow to ensure it exists and is active
        stmt = select(WorkflowDefinition).where(WorkflowDefinition.id == workflow_id)
        result = await self.db.execute(stmt)
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        if not workflow.is_active:
            raise ValueError(f"Workflow {workflow_id} is not active")

        # Create execution record
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            started_at=datetime.utcnow(),
            status="running",
        )
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        try:
            # Get all active steps in order
            stmt = (
                select(WorkflowStep)
                .where(WorkflowStep.workflow_id == workflow_id)
                .where(WorkflowStep.is_active == True)
                .order_by(WorkflowStep.step_order)
            )
            result = await self.db.execute(stmt)
            steps = list(result.scalars().all())

            if not steps:
                raise ValueError(f"No active steps found for workflow {workflow_id}")

            # Execute each step
            for step in steps:
                execution.current_step = step.step_order
                await self.db.commit()

                # Execute the step
                await self.execute_step(execution.id, step.id)

            # Mark execution as completed
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            await self.db.commit()

            # Update next_run time for scheduled workflows
            await self._update_next_run(workflow_id)

        except Exception as e:
            # Mark execution as failed
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            await self.db.commit()
            raise

        await self.db.refresh(execution)
        return execution

    async def execute_step(self, execution_id: int, step_id: int) -> WorkflowActionLog:
        """Execute a single workflow step.

        Args:
            execution_id: ID of current execution
            step_id: ID of step to execute

        Returns:
            WorkflowActionLog with execution results
        """
        # Get step
        stmt = select(WorkflowStep).where(WorkflowStep.id == step_id)
        result = await self.db.execute(stmt)
        step = result.scalar_one_or_none()

        if not step:
            raise ValueError(f"Step {step_id} not found")

        # Create action log
        log = WorkflowActionLog(
            execution_id=execution_id,
            step_id=step_id,
            action_type=step.step_type,
            performed_at=datetime.utcnow(),
            status="running",
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)

        try:
            # Execute based on step type
            if step.step_type == "send_email":
                result = await self._execute_send_email(step)
            elif step.step_type == "check_condition":
                result = await self._execute_check_condition(step)
            elif step.step_type == "wait_until":
                result = await self._execute_wait_until(step)
            elif step.step_type == "create_order":
                result = await self._execute_create_order(step)
            else:
                raise ValueError(f"Unknown step type: {step.step_type}")

            # Update log with success
            log.status = "success"
            log.result_data = result
            await self.db.commit()

        except Exception as e:
            # Update log with failure
            log.status = "failed"
            log.error_message = str(e)
            await self.db.commit()
            raise

        await self.db.refresh(log)
        return log

    async def _execute_send_email(self, step: WorkflowStep) -> Dict[str, Any]:
        """Execute send_email step.

        Args:
            step: WorkflowStep with action_config containing email details

        Returns:
            Dict with email send results
        """
        from app.services.email_service import EmailService

        config = step.action_config or {}

        # Get recipients from config
        recipients_spec = config.get("recipients", "all_active_customers")
        recipients = await self._resolve_recipients(recipients_spec)

        if not recipients:
            return {
                "sent_count": 0,
                "recipients_count": 0,
                "message": "No recipients found",
            }

        # Get email template or subject/body
        template_name = config.get("template")
        subject = config.get("subject")
        body_html = config.get("body_html")
        body_text = config.get("body_text")

        # Send emails
        email_service = EmailService(self.db)
        sent_count = await email_service.send_bulk_emails(
            recipients=recipients,
            template_name=template_name,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
        )

        return {
            "sent_count": sent_count,
            "recipients_count": len(recipients),
            "template": template_name,
        }

    async def _execute_check_condition(self, step: WorkflowStep) -> Dict[str, Any]:
        """Execute check_condition step.

        Args:
            step: WorkflowStep with condition_config

        Returns:
            Dict with condition check results
        """
        config = step.condition_config or {}
        check_type = config.get("check")

        if check_type == "orders_missing":
            days_back = config.get("days_back", 3)
            # TODO: Implement actual check logic
            # For now, return mock result
            return {
                "check_type": check_type,
                "days_back": days_back,
                "customers_missing_orders": 0,
                "condition_met": False,
            }

        elif check_type == "low_inventory":
            threshold = config.get("threshold", 10)
            # TODO: Implement actual check logic
            return {
                "check_type": check_type,
                "threshold": threshold,
                "products_below_threshold": 0,
                "condition_met": False,
            }

        else:
            raise ValueError(f"Unknown condition check type: {check_type}")

    async def _execute_wait_until(self, step: WorkflowStep) -> Dict[str, Any]:
        """Execute wait_until step.

        Args:
            step: WorkflowStep with trigger_config containing wait condition

        Returns:
            Dict with wait results
        """
        config = step.trigger_config or {}

        # For now, just log that we would wait
        # In a real implementation, this might schedule the next step for later
        return {
            "wait_type": config.get("wait_type", "time"),
            "wait_config": config,
            "message": "Wait step completed (not blocking)",
        }

    async def _execute_create_order(self, step: WorkflowStep) -> Dict[str, Any]:
        """Execute create_order step.

        Args:
            step: WorkflowStep with action_config containing order details

        Returns:
            Dict with order creation results
        """
        config = step.action_config or {}

        # TODO: Implement actual order creation logic
        # For now, return mock result
        return {
            "action": "create_order",
            "config": config,
            "message": "Order creation not yet implemented",
        }

    async def _resolve_recipients(self, recipients_spec: str) -> List[Dict[str, str]]:
        """Resolve recipients specification to list of email addresses.

        Args:
            recipients_spec: Specification like "all_active_customers", "customer_group:X", etc.

        Returns:
            List of dicts with email and name
        """
        from app.models.kunde import Kunder

        recipients = []

        if recipients_spec == "all_active_customers":
            # Get all active customers with email addresses
            stmt = select(Kunder).where(Kunder.aktiv == True)
            result = await self.db.execute(stmt)
            customers = result.scalars().all()

            for customer in customers:
                if customer.epost1:
                    recipients.append({
                        "email": customer.epost1,
                        "name": customer.kundenavn or "",
                        "customer_id": customer.kundeid,
                    })

        elif recipients_spec.startswith("customer_group:"):
            # Get customers from specific group
            group_id = int(recipients_spec.split(":")[1])
            # TODO: Implement customer group filtering
            pass

        elif recipients_spec == "test":
            # Test recipient for development
            recipients.append({
                "email": "test@example.com",
                "name": "Test User",
                "customer_id": 0,
            })

        return recipients

    async def _update_next_run(self, workflow_id: int) -> None:
        """Update next_run time for workflow's schedule.

        Args:
            workflow_id: ID of workflow to update
        """
        from app.services.workflow_automation_service import WorkflowAutomationService

        # Get workflow schedule
        stmt = select(WorkflowSchedule).where(WorkflowSchedule.workflow_id == workflow_id)
        result = await self.db.execute(stmt)
        schedule = result.scalar_one_or_none()

        if not schedule:
            return  # No schedule, nothing to update

        # Calculate next run time
        service = WorkflowAutomationService(self.db)
        next_run = service._calculate_next_run(
            schedule.schedule_type,
            schedule.schedule_config
        )

        # Update schedule
        schedule.last_run = datetime.utcnow()
        schedule.next_run = next_run
        await self.db.commit()
