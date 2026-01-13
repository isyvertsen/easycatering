"""Health check endpoints."""
import tomllib
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.infrastructure.database.session import get_db
from app.core.redis import get_redis
from app.core.config import settings

router = APIRouter()

# Get version from pyproject.toml
def _get_version() -> str:
    try:
        pyproject_path = Path(__file__).parent.parent.parent / "pyproject.toml"
        with open(pyproject_path, "rb") as f:
            data = tomllib.load(f)
        return data.get("project", {}).get("version", "unknown")
    except Exception:
        return "unknown"

BACKEND_VERSION = _get_version()


def _get_database_name() -> str:
    """Extract database name from DATABASE_URL."""
    try:
        parsed = urlparse(settings.DATABASE_URL)
        # Path is like /database_name, so strip leading slash
        return parsed.path.lstrip("/") if parsed.path else "unknown"
    except Exception:
        return "unknown"


@router.get("/")
async def health():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "catering-api",
        "version": BACKEND_VERSION,
    }


@router.get("/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """Readiness check including database and Redis connectivity."""
    checks = {}
    all_ready = True

    # Test database connection
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception:
        checks["database"] = "error"
        all_ready = False

    # Test Redis connection
    try:
        redis_client = await get_redis()
        if redis_client:
            await redis_client.ping()
            checks["redis"] = "connected"
        else:
            checks["redis"] = "not configured"
    except Exception:
        checks["redis"] = "error"
        # Redis is optional, don't fail readiness

    return {
        "status": "ready" if all_ready else "not ready",
        "version": BACKEND_VERSION,
        "database": _get_database_name(),
        "checks": checks
    }