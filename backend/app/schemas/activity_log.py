"""Activity log schemas."""
from datetime import datetime
from typing import Optional, Dict, Any, List

from pydantic import BaseModel, Field

from app.schemas.base import BaseSchema
from app.schemas.pagination import PaginatedResponse


class ActivityLogBase(BaseSchema):
    """Base activity log schema."""
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    http_method: Optional[str] = None
    endpoint: Optional[str] = None
    response_status: Optional[int] = None
    response_time_ms: Optional[int] = None


class ActivityLog(ActivityLogBase):
    """Activity log response schema."""
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    ip_address: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime


class ActivityLogListResponse(PaginatedResponse[ActivityLog]):
    """Paginated activity log response."""
    pass


class ActivityLogStats(BaseModel):
    """Activity log statistics."""
    total_requests: int
    total_errors: int
    error_rate: float  # Percentage
    avg_response_time_ms: float
    requests_by_action: Dict[str, int]
    requests_by_resource: Dict[str, int]
    requests_by_user: List[Dict[str, Any]]  # top users
    requests_over_time: List[Dict[str, Any]]  # hourly/daily breakdown


class ActivityLogFilters(BaseModel):
    """Filter parameters for activity logs."""
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    response_status: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
