"""Application log service for querying logs from database."""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app_log import AppLog
from app.schemas.app_log import AppLogFilters, AppLogStats


class AppLogService:
    """Service for managing application logs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_logs(
        self,
        filters: Optional[AppLogFilters] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[AppLog], int]:
        """Get paginated application logs with optional filtering."""
        query = select(AppLog)

        # Apply filters
        if filters:
            conditions = []

            if filters.level:
                conditions.append(AppLog.level == filters.level.upper())

            if filters.logger_name:
                conditions.append(AppLog.logger_name.ilike(f"%{filters.logger_name}%"))

            if filters.exception_type:
                conditions.append(AppLog.exception_type.ilike(f"%{filters.exception_type}%"))

            if filters.date_from:
                conditions.append(AppLog.created_at >= filters.date_from)

            if filters.date_to:
                conditions.append(AppLog.created_at <= filters.date_to)

            if filters.search:
                search_term = f"%{filters.search}%"
                conditions.append(
                    or_(
                        AppLog.message.ilike(search_term),
                        AppLog.exception_message.ilike(search_term),
                        AppLog.logger_name.ilike(search_term),
                        AppLog.module.ilike(search_term),
                        AppLog.function_name.ilike(search_term),
                    )
                )

            if conditions:
                query = query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting
        sort_column = getattr(AppLog, sort_by, AppLog.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        logs = result.scalars().all()

        return list(logs), total

    async def get_log_by_id(self, log_id: int) -> Optional[AppLog]:
        """Get a single log entry by ID."""
        result = await self.db.execute(
            select(AppLog).where(AppLog.id == log_id)
        )
        return result.scalar_one_or_none()

    async def get_stats(self, days: int = 7) -> AppLogStats:
        """Get application log statistics for the last N days."""
        since = datetime.utcnow() - timedelta(days=days)

        # Total logs
        total_result = await self.db.execute(
            select(func.count()).select_from(AppLog).where(AppLog.created_at >= since)
        )
        total_logs = total_result.scalar() or 0

        # Logs by level
        level_result = await self.db.execute(
            select(AppLog.level, func.count(AppLog.id))
            .where(AppLog.created_at >= since)
            .group_by(AppLog.level)
        )
        logs_by_level = {row[0]: row[1] for row in level_result.all()}

        # Logs by logger
        logger_result = await self.db.execute(
            select(AppLog.logger_name, func.count(AppLog.id))
            .where(AppLog.created_at >= since)
            .where(AppLog.logger_name.isnot(None))
            .group_by(AppLog.logger_name)
            .order_by(desc(func.count(AppLog.id)))
            .limit(20)
        )
        logs_by_logger = {row[0]: row[1] for row in logger_result.all()}

        # Top exceptions
        exception_result = await self.db.execute(
            select(
                AppLog.exception_type,
                AppLog.exception_message,
                func.count(AppLog.id).label("count"),
                func.max(AppLog.created_at).label("last_occurrence"),
            )
            .where(AppLog.created_at >= since)
            .where(AppLog.exception_type.isnot(None))
            .group_by(AppLog.exception_type, AppLog.exception_message)
            .order_by(desc(func.count(AppLog.id)))
            .limit(10)
        )
        top_exceptions = [
            {
                "exception_type": row[0],
                "exception_message": row[1][:200] if row[1] else None,
                "count": row[2],
                "last_occurrence": row[3].isoformat() if row[3] else None,
            }
            for row in exception_result.all()
        ]

        # Logs over time (hourly for last 7 days)
        time_result = await self.db.execute(
            select(
                func.date_trunc("hour", AppLog.created_at).label("period"),
                func.count(AppLog.id).label("count"),
            )
            .where(AppLog.created_at >= since)
            .group_by(func.date_trunc("hour", AppLog.created_at))
            .order_by(func.date_trunc("hour", AppLog.created_at))
        )
        logs_over_time = [
            {"period": row[0].isoformat() if row[0] else None, "count": row[1]}
            for row in time_result.all()
        ]

        return AppLogStats(
            total_logs=total_logs,
            error_count=logs_by_level.get("ERROR", 0),
            warning_count=logs_by_level.get("WARNING", 0),
            info_count=logs_by_level.get("INFO", 0),
            debug_count=logs_by_level.get("DEBUG", 0),
            logs_by_level=logs_by_level,
            logs_by_logger=logs_by_logger,
            top_exceptions=top_exceptions,
            logs_over_time=logs_over_time,
        )

    async def get_levels(self) -> List[str]:
        """Get all distinct log levels."""
        result = await self.db.execute(
            select(AppLog.level)
            .distinct()
            .where(AppLog.level.isnot(None))
            .order_by(AppLog.level)
        )
        return [row[0] for row in result.all()]

    async def get_logger_names(self) -> List[str]:
        """Get all distinct logger names."""
        result = await self.db.execute(
            select(AppLog.logger_name)
            .distinct()
            .where(AppLog.logger_name.isnot(None))
            .order_by(AppLog.logger_name)
        )
        return [row[0] for row in result.all()]

    async def get_exception_types(self) -> List[str]:
        """Get all distinct exception types."""
        result = await self.db.execute(
            select(AppLog.exception_type)
            .distinct()
            .where(AppLog.exception_type.isnot(None))
            .order_by(AppLog.exception_type)
        )
        return [row[0] for row in result.all()]

    async def cleanup_old_logs(self, days: int = 90) -> int:
        """Delete logs older than specified days. Returns count of deleted logs."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Count logs to delete
        count_result = await self.db.execute(
            select(func.count()).select_from(AppLog).where(AppLog.created_at < cutoff)
        )
        count = count_result.scalar() or 0

        if count > 0:
            # Delete in batches to avoid locking
            from sqlalchemy import delete

            await self.db.execute(
                delete(AppLog).where(AppLog.created_at < cutoff)
            )
            await self.db.commit()

        return count

    async def export_logs(
        self,
        filters: Optional[AppLogFilters] = None,
        limit: int = 10000,
    ) -> List[Dict[str, Any]]:
        """Export logs as list of dictionaries for CSV generation."""
        logs, _ = await self.get_logs(
            filters=filters,
            page=1,
            page_size=limit,
            sort_by="created_at",
            sort_order="desc",
        )

        return [
            {
                "id": log.id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "level": log.level,
                "logger_name": log.logger_name,
                "message": log.message[:500] if log.message else None,
                "exception_type": log.exception_type,
                "exception_message": log.exception_message[:200] if log.exception_message else None,
                "module": log.module,
                "function_name": log.function_name,
                "line_number": log.line_number,
                "request_id": log.request_id,
                "user_id": log.user_id,
                "user_email": log.user_email,
                "endpoint": log.endpoint,
                "http_method": log.http_method,
                "ip_address": log.ip_address,
            }
            for log in logs
        ]
