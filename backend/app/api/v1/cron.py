"""Cron job API endpoints for automated tasks.

These endpoints are secured with API key authentication for use by cron jobs.
Set CRON_API_KEY environment variable and pass it in the X-Cron-API-Key header.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.services.activity_log_service import ActivityLogService
from app.services.app_log_service import AppLogService

router = APIRouter(prefix="/cron", tags=["cron"])


def verify_cron_api_key(x_cron_api_key: str = Header(..., alias="X-Cron-API-Key")):
    """Verify the cron API key from header."""
    if not settings.CRON_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Cron API key not configured. Set CRON_API_KEY environment variable."
        )
    if x_cron_api_key != settings.CRON_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid cron API key"
        )
    return True


@router.post("/cleanup-logs")
async def cleanup_all_logs(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_cron_api_key),
    days: int = Query(30, ge=1, le=365, description="Delete logs older than this many days"),
):
    """
    Delete old logs from both activity_logs and app_logs tables.

    This endpoint is designed for cron jobs and requires X-Cron-API-Key header.

    Example cron usage:
    ```
    curl -X POST "https://api.example.com/api/v1/cron/cleanup-logs?days=30" \
         -H "X-Cron-API-Key: your-secret-key"
    ```

    Example crontab entry (run daily at 3am):
    ```
    0 3 * * * curl -X POST "https://api.example.com/api/v1/cron/cleanup-logs?days=30" -H "X-Cron-API-Key: your-secret-key"
    ```
    """
    activity_service = ActivityLogService(db)
    app_log_service = AppLogService(db)

    activity_deleted = await activity_service.cleanup_old_logs(days)
    app_deleted = await app_log_service.cleanup_old_logs(days)

    return {
        "message": f"Cleanup completed successfully",
        "activity_logs_deleted": activity_deleted,
        "app_logs_deleted": app_deleted,
        "days_threshold": days,
    }


@router.post("/cleanup-activity-logs")
async def cleanup_activity_logs(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_cron_api_key),
    days: int = Query(30, ge=1, le=365, description="Delete logs older than this many days"),
):
    """Delete old activity logs only."""
    service = ActivityLogService(db)
    deleted_count = await service.cleanup_old_logs(days)

    return {
        "message": f"Deleted {deleted_count} activity logs older than {days} days",
        "deleted_count": deleted_count,
        "days_threshold": days,
    }


@router.post("/cleanup-app-logs")
async def cleanup_app_logs(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_cron_api_key),
    days: int = Query(30, ge=1, le=365, description="Delete logs older than this many days"),
):
    """Delete old application logs only."""
    service = AppLogService(db)
    deleted_count = await service.cleanup_old_logs(days)

    return {
        "message": f"Deleted {deleted_count} app logs older than {days} days",
        "deleted_count": deleted_count,
        "days_threshold": days,
    }


@router.get("/health")
async def cron_health(
    _: bool = Depends(verify_cron_api_key),
):
    """Health check endpoint for cron monitoring."""
    return {"status": "ok", "message": "Cron API is accessible"}
