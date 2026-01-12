"""Application logs API endpoints."""
import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db
from app.services.app_log_service import AppLogService
from app.schemas.app_log import (
    AppLog,
    AppLogListResponse,
    AppLogStats,
    AppLogFilters,
)
from app.core.security import get_current_superuser
from app.models.user import User

router = APIRouter(prefix="/app-logs", tags=["App Logs"])


@router.get("/", response_model=AppLogListResponse)
async def get_app_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    level: Optional[str] = Query(None),
    logger_name: Optional[str] = Query(None),
    exception_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get paginated application logs. Requires superuser access."""
    filters = AppLogFilters(
        level=level,
        logger_name=logger_name,
        exception_type=exception_type,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )

    service = AppLogService(db)
    logs, total = await service.get_logs(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return AppLogListResponse(
        items=[AppLog.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=AppLogStats)
async def get_app_log_stats(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get application log statistics for the last N days. Requires superuser access."""
    service = AppLogService(db)
    return await service.get_stats(days=days)


@router.get("/levels")
async def get_log_levels(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get all distinct log levels. Requires superuser access."""
    service = AppLogService(db)
    return await service.get_levels()


@router.get("/loggers")
async def get_logger_names(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get all distinct logger names. Requires superuser access."""
    service = AppLogService(db)
    return await service.get_logger_names()


@router.get("/exception-types")
async def get_exception_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get all distinct exception types. Requires superuser access."""
    service = AppLogService(db)
    return await service.get_exception_types()


@router.get("/export")
async def export_app_logs(
    level: Optional[str] = Query(None),
    logger_name: Optional[str] = Query(None),
    exception_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Export application logs as CSV. Requires superuser access."""
    filters = AppLogFilters(
        level=level,
        logger_name=logger_name,
        exception_type=exception_type,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )

    service = AppLogService(db)
    logs = await service.export_logs(filters=filters)

    # Generate CSV
    output = io.StringIO()
    if logs:
        writer = csv.DictWriter(output, fieldnames=logs[0].keys())
        writer.writeheader()
        writer.writerows(logs)

    output.seek(0)
    filename = f"app_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{log_id}", response_model=AppLog)
async def get_app_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get a single application log by ID. Requires superuser access."""
    service = AppLogService(db)
    log = await service.get_log_by_id(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return AppLog.model_validate(log)


@router.post("/cleanup")
async def cleanup_old_logs(
    days: int = Query(90, ge=30, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Delete logs older than specified days. Requires superuser access."""
    service = AppLogService(db)
    deleted_count = await service.cleanup_old_logs(days=days)
    return {"message": f"Deleted {deleted_count} logs older than {days} days"}
