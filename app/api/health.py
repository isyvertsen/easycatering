"""Health check endpoints."""
import tomllib
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.infrastructure.database.session import get_db
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

def _get_database_name() -> str:
    """Extract database name from DATABASE_URL."""
    try:
        parsed = urlparse(settings.DATABASE_URL)
        return parsed.path.lstrip("/") if parsed.path else "unknown"
    except Exception:
        return "unknown"

BACKEND_VERSION = _get_version()
DATABASE_NAME = _get_database_name()


@router.get("/")
async def health():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "catering-api",
        "version": BACKEND_VERSION,
        "database": DATABASE_NAME,
    }


@router.get("/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """Readiness check including database connectivity."""
    try:
        # Test database connection
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "version": BACKEND_VERSION,
            "database": DATABASE_NAME,
            "checks": {
                "database": "connected",
            }
        }
    except Exception as e:
        return {
            "status": "not ready",
            "version": BACKEND_VERSION,
            "database": DATABASE_NAME,
            "checks": {
                "database": f"error: {str(e)}",
            }
        }