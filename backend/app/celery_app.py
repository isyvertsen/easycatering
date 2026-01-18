"""Celery app configuration for background tasks and scheduling.

This module configures Celery for:
- Background task processing (workflows, emails)
- Scheduled tasks via Celery Beat (workflow scheduling)
- Task monitoring via Flower (optional)
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

# Create Celery app instance
app = Celery(
    'lkc',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Celery configuration
app.conf.update(
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # Timezone
    timezone='Europe/Oslo',
    enable_utc=True,

    # Task execution
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit (raises exception)
    task_acks_late=True,  # Acknowledge task after execution (better for reliability)
    task_reject_on_worker_lost=True,  # Reject task if worker dies

    # Worker
    worker_prefetch_multiplier=1,  # Only prefetch one task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks (prevent memory leaks)
    worker_disable_rate_limits=False,

    # Results
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={'visibility_timeout': 3600},

    # Error handling
    task_annotations={
        '*': {
            'rate_limit': '10/s',  # Max 10 tasks per second globally
            'time_limit': 1800,  # 30 minutes
        }
    },
)

# Celery Beat schedule - runs every minute to check for due workflows
app.conf.beat_schedule = {
    'check-scheduled-workflows': {
        'task': 'app.tasks.workflow_tasks.check_scheduled_workflows',
        'schedule': 60.0,  # Every 60 seconds
        'options': {
            'queue': 'workflows',
            'expires': 50,  # Task expires if not picked up within 50 seconds
        }
    },
}

# Task routes - send tasks to specific queues
app.conf.task_routes = {
    'app.tasks.workflow_tasks.*': {'queue': 'workflows'},
    'app.tasks.email_tasks.*': {'queue': 'emails'},
}

# Default queue
app.conf.task_default_queue = 'default'
app.conf.task_default_exchange = 'default'
app.conf.task_default_routing_key = 'default'

# Import tasks to register them with Celery
# This ensures tasks are discovered when the Celery worker starts
try:
    from app.tasks import workflow_tasks
except ImportError:
    pass  # Tasks module may not be available during initial setup
