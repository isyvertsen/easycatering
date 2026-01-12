"""Application log schemas."""
from datetime import datetime
from typing import Optional, Dict, Any, List

from pydantic import BaseModel

from app.schemas.base import BaseSchema
from app.schemas.pagination import PaginatedResponse


class AppLogBase(BaseSchema):
    """Base application log schema."""
    level: str
    logger_name: Optional[str] = None
    message: str
    exception_type: Optional[str] = None
    exception_message: Optional[str] = None
    module: Optional[str] = None
    function_name: Optional[str] = None
    line_number: Optional[int] = None


class AppLog(AppLogBase):
    """Application log response schema."""
    id: int
    traceback: Optional[str] = None
    path: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None
    created_at: datetime


class AppLogListResponse(PaginatedResponse[AppLog]):
    """Paginated application log response."""
    pass


class AppLogStats(BaseModel):
    """Application log statistics."""
    total_logs: int
    error_count: int
    warning_count: int
    info_count: int
    debug_count: int
    logs_by_level: Dict[str, int]
    logs_by_logger: Dict[str, int]
    top_exceptions: List[Dict[str, Any]]
    logs_over_time: List[Dict[str, Any]]


class AppLogFilters(BaseModel):
    """Filter parameters for application logs."""
    level: Optional[str] = None
    logger_name: Optional[str] = None
    exception_type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
