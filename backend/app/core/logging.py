"""Logging configuration with database handler."""
import logging
import sys
import traceback
import asyncio
import threading
import queue
from datetime import datetime
from typing import Any, Dict, Optional
from contextvars import ContextVar

# Context variables for request info
request_context: ContextVar[Dict[str, Any]] = ContextVar('request_context', default={})


def set_request_context(
    request_id: Optional[str] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    endpoint: Optional[str] = None,
    http_method: Optional[str] = None,
):
    """Set request context for logging."""
    request_context.set({
        'request_id': request_id,
        'user_id': user_id,
        'user_email': user_email,
        'ip_address': ip_address,
        'endpoint': endpoint,
        'http_method': http_method,
    })


def clear_request_context():
    """Clear request context."""
    request_context.set({})


class AsyncDatabaseLogHandler(logging.Handler):
    """Async logging handler that writes to database."""

    # Loggers to skip to avoid recursion and noise
    SKIP_LOGGERS = {
        'sqlalchemy.engine',
        'sqlalchemy.pool',
        'sqlalchemy.dialects',
        'sqlalchemy.orm',
        'asyncio',
        'uvicorn.access',
        'uvicorn.error',
        'httpcore',
        'httpx',
        'hpack',
        'watchfiles',
    }

    # Minimum level to log to database (INFO and above)
    MIN_DB_LEVEL = logging.INFO

    def __init__(self):
        super().__init__()
        self._queue: queue.Queue = queue.Queue()
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def start(self):
        """Start the background thread for processing logs."""
        if self._thread is not None:
            return
        self._running = True
        self._thread = threading.Thread(target=self._process_queue, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the background thread."""
        self._running = False
        if self._thread:
            self._queue.put(None)  # Signal to stop
            self._thread.join(timeout=5)
            self._thread = None

    def emit(self, record: logging.LogRecord):
        """Emit a log record."""
        # Skip certain loggers
        if any(record.name.startswith(skip) for skip in self.SKIP_LOGGERS):
            return

        # Skip if below minimum level
        if record.levelno < self.MIN_DB_LEVEL:
            return

        # Skip if this is our own database logging
        if 'app_log' in record.name.lower() or 'database_log' in record.name.lower():
            return

        try:
            # Get exception info
            exc_type = None
            exc_message = None
            exc_traceback = None

            if record.exc_info:
                exc_type = record.exc_info[0].__name__ if record.exc_info[0] else None
                exc_message = str(record.exc_info[1]) if record.exc_info[1] else None
                exc_traceback = ''.join(traceback.format_exception(*record.exc_info))

            # Get request context
            ctx = request_context.get()

            log_entry = {
                'level': record.levelname,
                'logger_name': record.name,
                'message': record.getMessage()[:5000],  # Limit message length
                'exception_type': exc_type,
                'exception_message': exc_message[:2000] if exc_message else None,
                'traceback': exc_traceback[:10000] if exc_traceback else None,
                'module': record.module,
                'function_name': record.funcName,
                'line_number': record.lineno,
                'path': record.pathname[:500] if record.pathname else None,
                'request_id': ctx.get('request_id'),
                'user_id': ctx.get('user_id'),
                'user_email': ctx.get('user_email'),
                'ip_address': ctx.get('ip_address'),
                'endpoint': ctx.get('endpoint'),
                'http_method': ctx.get('http_method'),
                'extra': self._extract_extra(record),
                'created_at': datetime.utcnow(),
            }

            self._queue.put(log_entry)

        except Exception:
            # Don't let logging errors break the application
            pass

    def _extract_extra(self, record: logging.LogRecord) -> Optional[Dict[str, Any]]:
        """Extract extra data from log record."""
        standard_attrs = {
            'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
            'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
            'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
            'thread', 'threadName', 'processName', 'process', 'message',
            'asctime', 'taskName',
        }

        extra = {}
        for key, value in record.__dict__.items():
            if key not in standard_attrs:
                try:
                    # Try to serialize the value
                    if isinstance(value, (str, int, float, bool, type(None))):
                        extra[key] = value
                    elif isinstance(value, (list, dict)):
                        extra[key] = value
                    else:
                        extra[key] = str(value)
                except Exception:
                    pass

        return extra if extra else None

    def _process_queue(self):
        """Process log entries from the queue in a background thread."""
        while self._running:
            try:
                log_entry = self._queue.get(timeout=1)
                if log_entry is None:
                    break

                # Run the async save in a new event loop
                asyncio.run(self._save_to_db(log_entry))

            except queue.Empty:
                continue
            except Exception:
                pass

    async def _save_to_db(self, log_entry: Dict[str, Any]):
        """Save log entry to database."""
        try:
            from app.infrastructure.database.session import AsyncSessionLocal
            from app.models.app_log import AppLog

            async with AsyncSessionLocal() as db:
                app_log = AppLog(**log_entry)
                db.add(app_log)
                await db.commit()
        except Exception:
            # Silently fail - don't want logging to break the app
            pass


# Global handler instance
_db_handler: Optional[AsyncDatabaseLogHandler] = None


def get_db_handler() -> AsyncDatabaseLogHandler:
    """Get or create the database log handler."""
    global _db_handler
    if _db_handler is None:
        _db_handler = AsyncDatabaseLogHandler()
        _db_handler.setLevel(logging.INFO)
        _db_handler.start()
    return _db_handler


def setup_logging(level: str = "INFO") -> None:
    """Setup logging configuration with database handler."""
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(log_format))

    # Get database handler
    db_handler = get_db_handler()

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    root_logger.handlers = []  # Clear existing handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(db_handler)

    # Set specific loggers to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


def shutdown_logging():
    """Shutdown logging handlers."""
    global _db_handler
    if _db_handler:
        _db_handler.stop()
        _db_handler = None
