"""Activity log API endpoints."""
from datetime import datetime
from typing import Optional, Literal, List

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.domain.entities.user import User
from app.services.activity_log_service import ActivityLogService
from app.schemas.activity_log import (
    ActivityLog,
    ActivityLogListResponse,
    ActivityLogStats,
)

router = APIRouter()


def require_admin(current_user: User) -> User:
    """Check if current user is admin."""
    if current_user.rolle != "admin" and not getattr(current_user, 'is_superuser', False):
        raise HTTPException(
            status_code=403,
            detail="Kun administratorer kan se aktivitetsloggen"
        )
    return current_user


@router.get("/", response_model=ActivityLogListResponse)
async def get_activity_logs(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    response_status: Optional[int] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None, max_length=200),
    sort_by: str = Query("created_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
):
    """Get activity logs with pagination and filters. Admin only."""
    require_admin(current_user)

    service = ActivityLogService(db)
    items, total = await service.list_logs(
        page=page,
        page_size=page_size,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        response_status=response_status,
        date_from=date_from,
        date_to=date_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (total + page_size - 1) // page_size

    return ActivityLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=ActivityLogStats)
async def get_activity_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """Get activity log statistics. Admin only."""
    require_admin(current_user)

    service = ActivityLogService(db)
    return await service.get_stats(date_from=date_from, date_to=date_to)


@router.get("/export")
async def export_activity_logs(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    """Export activity logs to CSV. Admin only."""
    require_admin(current_user)

    service = ActivityLogService(db)
    csv_content = await service.export_to_csv(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        date_from=date_from,
        date_to=date_to,
    )

    filename = f"aktivitetslogg-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"

    return StreamingResponse(
        iter(['\ufeff' + csv_content]),  # BOM for Excel compatibility
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/actions", response_model=List[str])
async def get_available_actions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of available action types from logs."""
    require_admin(current_user)
    service = ActivityLogService(db)
    return await service.get_unique_actions()


@router.get("/resource-types", response_model=List[str])
async def get_resource_types(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of unique resource types from logs."""
    require_admin(current_user)
    service = ActivityLogService(db)
    return await service.get_unique_resource_types()


@router.post("/cleanup")
async def cleanup_old_logs(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    days_to_keep: int = Query(90, ge=30, le=365),
):
    """Delete old activity logs. Superuser only."""
    require_admin(current_user)

    if not getattr(current_user, 'is_superuser', False):
        raise HTTPException(
            status_code=403,
            detail="Kun superbrukere kan slette aktivitetslogger"
        )

    service = ActivityLogService(db)
    deleted_count = await service.cleanup_old_logs(days_to_keep)

    return {"message": f"Slettet {deleted_count} gamle loggoppforinger"}
