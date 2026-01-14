"""Cache utilities using Redis."""
import json
import logging
from typing import Optional, Any, TypeVar, Callable
from functools import wraps
from app.core.redis import get_redis

logger = logging.getLogger(__name__)

T = TypeVar('T')

# Cache TTL in seconds
CACHE_TTL_SHORT = 300      # 5 minutes
CACHE_TTL_MEDIUM = 3600    # 1 hour
CACHE_TTL_LONG = 86400     # 24 hours


async def cache_get(key: str) -> Optional[str]:
    """Get value from cache."""
    redis = await get_redis()
    if not redis:
        return None
    try:
        return await redis.get(key)
    except Exception as e:
        logger.warning(f"Cache get error for {key}: {e}")
        return None


async def cache_set(key: str, value: str, ttl: int = CACHE_TTL_MEDIUM) -> bool:
    """Set value in cache with TTL."""
    redis = await get_redis()
    if not redis:
        return False
    try:
        await redis.setex(key, ttl, value)
        return True
    except Exception as e:
        logger.warning(f"Cache set error for {key}: {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Delete value from cache."""
    redis = await get_redis()
    if not redis:
        return False
    try:
        await redis.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache delete error for {key}: {e}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching pattern."""
    redis = await get_redis()
    if not redis:
        return 0
    try:
        keys = await redis.keys(pattern)
        if keys:
            return await redis.delete(*keys)
        return 0
    except Exception as e:
        logger.warning(f"Cache delete pattern error for {pattern}: {e}")
        return 0


def make_cache_key(*args) -> str:
    """Create a cache key from arguments."""
    return ":".join(str(arg) for arg in args)
