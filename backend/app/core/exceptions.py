"""Centralized exception handling."""
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, DataError
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found exception."""
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} med ID {identifier} ble ikke funnet",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "id": identifier}
        )


class ValidationError(AppException):
    """Validation error exception."""
    def __init__(self, message: str, field: Optional[str] = None):
        details = {}
        if field:
            details["field"] = field
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class AuthenticationError(AppException):
    """Authentication error exception."""
    def __init__(self, message: str = "Autentisering feilet"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthorizationError(AppException):
    """Authorization error exception."""
    def __init__(self, message: str = "Ikke autorisert"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )


class DuplicateError(AppException):
    """Duplicate resource error."""
    def __init__(self, resource: str, field: str, value: Any):
        super().__init__(
            message=f"{resource} med {field}='{value}' eksisterer allerede",
            status_code=status.HTTP_409_CONFLICT,
            details={"resource": resource, "field": field, "value": value}
        )


class BusinessRuleError(AppException):
    """Business rule violation error."""
    def __init__(self, message: str, rule: Optional[str] = None):
        details = {}
        if rule:
            details["rule"] = rule
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    logger.warning(f"Application error: {exc.message}", extra={"details": exc.details})
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
            "type": exc.__class__.__name__
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors."""
    logger.warning(f"Validation error: {exc.errors()}")
    
    # Format validation errors in Norwegian
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"][1:])  # Skip 'body' prefix
        errors.append({
            "field": field,
            "message": f"Ugyldig verdi for {field}: {error['msg']}"
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Valideringsfeil",
            "details": errors,
            "type": "ValidationError"
        }
    )


async def database_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Handle database integrity errors."""
    logger.error(f"Database integrity error: {str(exc.orig)}")
    
    # Parse common integrity errors
    error_msg = str(exc.orig)
    
    if "duplicate key" in error_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "Duplikat verdi funnet",
                "details": {"database_error": error_msg},
                "type": "DuplicateError"
            }
        )
    elif "foreign key" in error_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Referanse til ikke-eksisterende data",
                "details": {"database_error": error_msg},
                "type": "ReferenceError"
            }
        )
    elif "not null" in error_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Påkrevd felt mangler",
                "details": {"database_error": error_msg},
                "type": "RequiredFieldError"
            }
        )
    
    # Generic database error
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Database feil oppstod",
            "details": {},
            "type": "DatabaseError"
        }
    )


async def data_error_handler(request: Request, exc: DataError) -> JSONResponse:
    """Handle database data errors."""
    logger.error(f"Database data error: {str(exc.orig)}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Ugyldig dataformat",
            "details": {"database_error": str(exc.orig)},
            "type": "DataFormatError"
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    
    # Don't expose internal errors in production
    from app.core.config import settings
    
    if settings.APP_ENV == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "En uventet feil oppstod",
                "details": {},
                "type": "InternalError"
            }
        )
    
    # In development, include more details
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "En uventet feil oppstod",
            "details": {"exception": str(exc)},
            "type": exc.__class__.__name__
        }
    )


def setup_exception_handlers(app):
    """Setup all exception handlers for the application."""
    from fastapi import FastAPI
    
    # Application exceptions
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(NotFoundError, app_exception_handler)
    app.add_exception_handler(ValidationError, app_exception_handler)
    app.add_exception_handler(AuthenticationError, app_exception_handler)
    app.add_exception_handler(AuthorizationError, app_exception_handler)
    app.add_exception_handler(DuplicateError, app_exception_handler)
    app.add_exception_handler(BusinessRuleError, app_exception_handler)
    
    # Validation exceptions
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Database exceptions
    app.add_exception_handler(IntegrityError, database_exception_handler)
    app.add_exception_handler(DataError, data_error_handler)
    
    # Generic exception handler (catch-all)
    app.add_exception_handler(Exception, generic_exception_handler)