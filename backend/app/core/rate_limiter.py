"""Redis-based rate limiting."""
import logging
import time
from typing import Optional, Callable
from functools import wraps

from fastapi import HTTPException, Request, status
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Redis-based rate limiter using sliding window algorithm.

    Usage:
        limiter = RateLimiter(requests=5, window=60)  # 5 requests per minute

        @router.post("/login")
        @limiter.limit
        async def login(request: Request, ...):
            ...
    """

    def __init__(
        self,
        requests: int = 10,
        window: int = 60,
        key_prefix: str = "ratelimit",
        key_func: Optional[Callable[[Request], str]] = None
    ):
        """
        Initialize rate limiter.

        Args:
            requests: Maximum number of requests allowed
            window: Time window in seconds
            key_prefix: Redis key prefix
            key_func: Function to extract rate limit key from request (default: client IP)
        """
        self.requests = requests
        self.window = window
        self.key_prefix = key_prefix
        self.key_func = key_func or self._default_key_func

    def _default_key_func(self, request: Request) -> str:
        """Default key function using client IP."""
        client_ip = request.client.host if request.client else "unknown"
        return client_ip

    async def is_allowed(self, request: Request) -> tuple[bool, dict]:
        """
        Check if request is allowed under rate limit.

        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        redis_client = await get_redis()

        # If Redis is not available, allow all requests (fail open)
        if not redis_client:
            return True, {"limit": self.requests, "remaining": self.requests, "reset": 0}

        key = f"{self.key_prefix}:{request.url.path}:{self.key_func(request)}"
        now = time.time()
        window_start = now - self.window

        try:
            pipe = redis_client.pipeline()

            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count current requests in window
            pipe.zcard(key)

            # Add current request
            pipe.zadd(key, {str(now): now})

            # Set expiry on the key
            pipe.expire(key, self.window)

            results = await pipe.execute()
            current_count = results[1]

            remaining = max(0, self.requests - current_count - 1)
            reset_time = int(window_start + self.window)

            rate_info = {
                "limit": self.requests,
                "remaining": remaining,
                "reset": reset_time
            }

            if current_count >= self.requests:
                logger.warning(
                    f"Rate limit exceeded for {key}: {current_count}/{self.requests}"
                )
                return False, rate_info

            return True, rate_info

        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open on errors
            return True, {"limit": self.requests, "remaining": self.requests, "reset": 0}

    def limit(self, func: Callable) -> Callable:
        """Decorator to apply rate limiting to an endpoint."""

        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request in args or kwargs
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if not request:
                # Can't rate limit without request, proceed
                return await func(*args, **kwargs)

            allowed, rate_info = await self.is_allowed(request)

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"For mange forespørsler. Prøv igjen om {rate_info['reset'] - int(time.time())} sekunder.",
                    headers={
                        "X-RateLimit-Limit": str(rate_info["limit"]),
                        "X-RateLimit-Remaining": str(rate_info["remaining"]),
                        "X-RateLimit-Reset": str(rate_info["reset"]),
                        "Retry-After": str(rate_info["reset"] - int(time.time()))
                    }
                )

            return await func(*args, **kwargs)

        return wrapper


# Pre-configured limiters for common use cases
auth_limiter = RateLimiter(requests=5, window=60, key_prefix="auth")  # 5 per minute
api_limiter = RateLimiter(requests=100, window=60, key_prefix="api")  # 100 per minute
strict_limiter = RateLimiter(requests=3, window=300, key_prefix="strict")  # 3 per 5 minutes
