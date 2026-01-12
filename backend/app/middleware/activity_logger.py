"""Middleware for automatic activity logging."""
import time
import logging
import uuid
from typing import Optional, Callable
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.infrastructure.database.session import AsyncSessionLocal
from app.models.activity_log import ActivityLog
from app.core.logging import set_request_context, clear_request_context

logger = logging.getLogger(__name__)

# Paths to exclude from logging
EXCLUDED_PATHS = {
    "/api/health",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/favicon.ico",
    "/_next",
    "/static",
}

# Paths to exclude from detailed logging (sensitive)
SENSITIVE_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/token",
    "/api/auth/reset-password",
    "/api/auth/google",
}


def should_log_request(path: str) -> bool:
    """Check if request should be logged."""
    for excluded in EXCLUDED_PATHS:
        if path.startswith(excluded):
            return False
    return True


def extract_resource_info(path: str, method: str) -> tuple[str, Optional[str]]:
    """Extract resource type and ID from path."""
    # Remove /api/v1/ or /api/ prefix
    clean_path = path
    for prefix in ["/api/v1/", "/api/admin/", "/api/"]:
        if path.startswith(prefix):
            clean_path = path[len(prefix):]
            break

    parts = clean_path.strip("/").split("/")

    resource_type = parts[0] if parts else "unknown"
    resource_id = None

    # Check if second part looks like an ID (numeric or UUID-like)
    if len(parts) > 1:
        potential_id = parts[1]
        if potential_id.isdigit() or (len(potential_id) > 8 and "-" in potential_id):
            resource_id = potential_id

    return resource_type, resource_id


def method_to_action(method: str, path: str) -> str:
    """Convert HTTP method to action type."""
    method_action_map = {
        "POST": "CREATE",
        "PUT": "UPDATE",
        "PATCH": "UPDATE",
        "DELETE": "DELETE",
        "GET": "VIEW",
    }

    # Special cases
    path_lower = path.lower()
    if "login" in path_lower:
        return "LOGIN"
    if "logout" in path_lower:
        return "LOGOUT"
    if "export" in path_lower:
        return "EXPORT"
    if "bulk" in path_lower and method == "DELETE":
        return "BULK_DELETE"

    return method_action_map.get(method.upper(), "VIEW")


class ActivityLoggerMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically log API activity."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip excluded paths
        if not should_log_request(request.url.path):
            return await call_next(request)

        start_time = time.time()

        # Get request details
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")[:500]  # Limit length

        # Generate request ID and set context for logging
        request_id = str(uuid.uuid4())[:8]
        user_id = getattr(request.state, "user_id", None)
        user_email = getattr(request.state, "user_email", None)

        set_request_context(
            request_id=request_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            endpoint=request.url.path[:500],
            http_method=request.method,
        )

        try:
            # Process request
            response = await call_next(request)
        finally:
            # Clear context after request is done
            clear_request_context()

        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Log asynchronously (fire and forget)
        try:
            await self._log_activity(
                request=request,
                response=response,
                response_time_ms=response_time_ms,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            logger.error(f"Failed to log activity: {e}")

        return response

    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Get client IP, considering X-Forwarded-For header."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else None

    async def _log_activity(
        self,
        request: Request,
        response: Response,
        response_time_ms: int,
        ip_address: Optional[str],
        user_agent: str,
    ):
        """Create activity log entry."""
        path = request.url.path
        method = request.method

        resource_type, resource_id = extract_resource_info(path, method)
        action = method_to_action(method, path)

        # Get user info from request state (set by auth dependency)
        user_id = getattr(request.state, "user_id", None)
        user_email = getattr(request.state, "user_email", None)
        user_name = getattr(request.state, "user_name", None)

        # Build details (exclude sensitive data)
        details = {}
        if path not in SENSITIVE_PATHS:
            query_params = dict(request.query_params)
            if query_params:
                # Remove any sensitive params
                for key in list(query_params.keys()):
                    if any(s in key.lower() for s in ["password", "token", "secret", "key"]):
                        query_params[key] = "[REDACTED]"
                details["query_params"] = query_params

        # Create log entry
        async with AsyncSessionLocal() as db:
            try:
                log_entry = ActivityLog(
                    user_id=user_id,
                    user_email=user_email,
                    user_name=user_name,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    http_method=method,
                    endpoint=path[:500],  # Limit length
                    ip_address=ip_address,
                    user_agent=user_agent,
                    response_status=response.status_code,
                    response_time_ms=response_time_ms,
                    details=details if details else None,
                    created_at=datetime.utcnow(),
                )
                db.add(log_entry)
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to save activity log: {e}")
                await db.rollback()
