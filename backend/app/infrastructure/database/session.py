"""Database session management."""
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Create base class for models
Base = declarative_base()

# Engine and session factory are created lazily to support multi-worker uvicorn
# Each worker process needs its own engine instance created after forking
_engine: Optional[AsyncEngine] = None
_async_session_local: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    """Get or create the database engine.

    This creates the engine lazily on first call within each worker process,
    which is necessary for multi-worker uvicorn deployments.
    """
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DATABASE_ECHO,
            pool_pre_ping=True,
            pool_size=5,         # Reduced per-worker pool size for multi-worker
            max_overflow=10,     # Reduced per-worker overflow for multi-worker
            pool_recycle=3600,   # Recycle connections after 1 hour
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get or create the session factory."""
    global _async_session_local
    if _async_session_local is None:
        _async_session_local = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _async_session_local


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def dispose_engine() -> None:
    """Dispose of the database engine and clear references."""
    global _engine, _async_session_local
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _async_session_local = None


class _LazySessionFactory:
    """Lazy wrapper for async_sessionmaker to support multi-worker uvicorn.

    This allows `AsyncSessionLocal()` syntax to work while deferring
    engine creation until first use within each worker process.

    Usage: async with AsyncSessionLocal() as session:
    """

    def __call__(self) -> AsyncSession:
        """Create a new session using the lazily-initialized factory."""
        return get_session_factory()()


# Backwards compatibility alias
AsyncSessionLocal = _LazySessionFactory()