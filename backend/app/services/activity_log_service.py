"""Activity log service for business logic."""
import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, and_, desc, or_, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogStats

logger = logging.getLogger(__name__)


class ActivityLogService:
    """Service for activity log operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        response_status: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[List[ActivityLog], int]:
        """List activity logs with filters."""
        query = select(ActivityLog)
        count_query = select(func.count()).select_from(ActivityLog)

        # Apply filters
        filters = []
        if user_id:
            filters.append(ActivityLog.user_id == user_id)
        if action:
            filters.append(ActivityLog.action == action)
        if resource_type:
            filters.append(ActivityLog.resource_type == resource_type)
        if response_status:
            filters.append(ActivityLog.response_status == response_status)
        if date_from:
            filters.append(ActivityLog.created_at >= date_from)
        if date_to:
            filters.append(ActivityLog.created_at <= date_to)
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    ActivityLog.user_email.ilike(search_term),
                    ActivityLog.endpoint.ilike(search_term),
                    ActivityLog.resource_type.ilike(search_term)
                )
            )

        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting
        sort_column = getattr(ActivityLog, sort_by, ActivityLog.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        items = result.scalars().all()

        return items, total

    async def get_stats(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> ActivityLogStats:
        """Get activity log statistics."""
        if not date_from:
            date_from = datetime.utcnow() - timedelta(days=7)
        if not date_to:
            date_to = datetime.utcnow()

        filters = [
            ActivityLog.created_at >= date_from,
            ActivityLog.created_at <= date_to,
        ]

        # Total requests
        total_result = await self.db.execute(
            select(func.count()).select_from(ActivityLog).where(and_(*filters))
        )
        total_requests = total_result.scalar() or 0

        # Total errors (4xx and 5xx)
        error_result = await self.db.execute(
            select(func.count()).select_from(ActivityLog).where(
                and_(*filters, ActivityLog.response_status >= 400)
            )
        )
        total_errors = error_result.scalar() or 0

        # Average response time
        avg_time_result = await self.db.execute(
            select(func.avg(ActivityLog.response_time_ms)).where(and_(*filters))
        )
        avg_response_time = avg_time_result.scalar() or 0

        # Requests by action
        action_result = await self.db.execute(
            select(ActivityLog.action, func.count().label('count'))
            .where(and_(*filters))
            .group_by(ActivityLog.action)
        )
        requests_by_action = {row.action: row.count for row in action_result}

        # Requests by resource
        resource_result = await self.db.execute(
            select(ActivityLog.resource_type, func.count().label('count'))
            .where(and_(*filters))
            .group_by(ActivityLog.resource_type)
            .order_by(desc('count'))
            .limit(10)
        )
        requests_by_resource = {row.resource_type: row.count for row in resource_result}

        # Top users
        user_result = await self.db.execute(
            select(
                ActivityLog.user_id,
                ActivityLog.user_email,
                ActivityLog.user_name,
                func.count().label('count')
            )
            .where(and_(*filters, ActivityLog.user_id.isnot(None)))
            .group_by(ActivityLog.user_id, ActivityLog.user_email, ActivityLog.user_name)
            .order_by(desc('count'))
            .limit(10)
        )
        requests_by_user = [
            {"user_id": row.user_id, "email": row.user_email, "name": row.user_name, "count": row.count}
            for row in user_result
        ]

        # Requests over time (hourly for last 24h, daily for longer periods)
        requests_over_time = await self._get_requests_over_time(date_from, date_to)

        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0

        return ActivityLogStats(
            total_requests=total_requests,
            total_errors=total_errors,
            error_rate=round(error_rate, 2),
            avg_response_time_ms=round(avg_response_time, 2) if avg_response_time else 0,
            requests_by_action=requests_by_action,
            requests_by_resource=requests_by_resource,
            requests_by_user=requests_by_user,
            requests_over_time=requests_over_time,
        )

    async def _get_requests_over_time(
        self,
        date_from: datetime,
        date_to: datetime,
    ) -> List[Dict[str, Any]]:
        """Get request counts over time."""
        # Use hourly if less than 3 days, otherwise daily
        delta = date_to - date_from

        if delta.days <= 3:
            # Hourly breakdown
            result = await self.db.execute(
                select(
                    func.date_trunc('hour', ActivityLog.created_at).label('period'),
                    func.count().label('count')
                )
                .where(and_(
                    ActivityLog.created_at >= date_from,
                    ActivityLog.created_at <= date_to,
                ))
                .group_by('period')
                .order_by('period')
            )
        else:
            # Daily breakdown
            result = await self.db.execute(
                select(
                    func.date_trunc('day', ActivityLog.created_at).label('period'),
                    func.count().label('count')
                )
                .where(and_(
                    ActivityLog.created_at >= date_from,
                    ActivityLog.created_at <= date_to,
                ))
                .group_by('period')
                .order_by('period')
            )

        return [
            {"period": row.period.isoformat() if row.period else None, "count": row.count}
            for row in result
        ]

    async def get_unique_actions(self) -> List[str]:
        """Get list of unique action types from logs."""
        result = await self.db.execute(
            select(distinct(ActivityLog.action))
            .where(ActivityLog.action.isnot(None))
            .order_by(ActivityLog.action)
        )
        return [row[0] for row in result]

    async def get_unique_resource_types(self) -> List[str]:
        """Get list of unique resource types from logs."""
        result = await self.db.execute(
            select(distinct(ActivityLog.resource_type))
            .where(ActivityLog.resource_type.isnot(None))
            .order_by(ActivityLog.resource_type)
        )
        return [row[0] for row in result]

    async def export_to_csv(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> str:
        """Export activity logs to CSV."""
        items, _ = await self.list_logs(
            page=1,
            page_size=10000,  # Limit export
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            date_from=date_from,
            date_to=date_to,
        )

        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')

        # Header
        writer.writerow([
            'ID', 'Tidspunkt', 'Bruker', 'E-post', 'Handling',
            'Ressurstype', 'Ressurs-ID', 'Metode', 'Endepunkt',
            'Status', 'Responstid (ms)', 'IP-adresse'
        ])

        # Rows
        for log in items:
            writer.writerow([
                log.id,
                log.created_at.isoformat() if log.created_at else '-',
                log.user_name or '-',
                log.user_email or '-',
                log.action,
                log.resource_type,
                log.resource_id or '-',
                log.http_method or '-',
                log.endpoint or '-',
                log.response_status or '-',
                log.response_time_ms or '-',
                log.ip_address or '-',
            ])

        return output.getvalue()

    async def cleanup_old_logs(self, days_to_keep: int = 90) -> int:
        """Delete logs older than specified days (retention policy)."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        result = await self.db.execute(
            select(func.count()).select_from(ActivityLog)
            .where(ActivityLog.created_at < cutoff_date)
        )
        count = result.scalar() or 0

        if count > 0:
            await self.db.execute(
                ActivityLog.__table__.delete().where(
                    ActivityLog.created_at < cutoff_date
                )
            )
            await self.db.commit()
            logger.info(f"Cleaned up {count} old activity log entries")

        return count
