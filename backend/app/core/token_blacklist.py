"""JWT token blacklist using Redis."""
import logging
from typing import Optional
from datetime import datetime, timedelta

from app.core.redis import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Key prefix for blacklisted tokens
BLACKLIST_PREFIX = "token:blacklist"


async def add_to_blacklist(
    token: str,
    token_type: str = "access",
    expires_in: Optional[int] = None
) -> bool:
    """
    Add a token to the blacklist.

    Args:
        token: The JWT token to blacklist
        token_type: Type of token (access or refresh)
        expires_in: Optional custom expiry in seconds

    Returns:
        True if successfully blacklisted, False otherwise
    """
    redis_client = await get_redis()

    if not redis_client:
        logger.warning("Redis not available, cannot blacklist token")
        return False

    try:
        # Use token hash as key to save space
        import hashlib
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
        key = f"{BLACKLIST_PREFIX}:{token_type}:{token_hash}"

        # Set expiry based on token type
        if expires_in is None:
            if token_type == "refresh":
                expires_in = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
            else:
                expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Store with expiry (token will auto-remove when it would have expired anyway)
        await redis_client.setex(key, expires_in, datetime.utcnow().isoformat())

        logger.info(f"Token blacklisted: {token_type} token (hash: {token_hash[:8]}...)")
        return True

    except Exception as e:
        logger.error(f"Failed to blacklist token: {e}")
        return False


async def is_blacklisted(token: str, token_type: str = "access") -> bool:
    """
    Check if a token is blacklisted.

    Args:
        token: The JWT token to check
        token_type: Type of token (access or refresh)

    Returns:
        True if blacklisted, False otherwise
    """
    redis_client = await get_redis()

    if not redis_client:
        # If Redis is not available, assume not blacklisted (fail open)
        return False

    try:
        import hashlib
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
        key = f"{BLACKLIST_PREFIX}:{token_type}:{token_hash}"

        exists = await redis_client.exists(key)
        return bool(exists)

    except Exception as e:
        logger.error(f"Failed to check blacklist: {e}")
        # Fail open on errors
        return False


async def blacklist_all_user_tokens(user_id: int) -> bool:
    """
    Blacklist all tokens for a user by storing their user ID.
    This is used when forcing logout of all sessions.

    Args:
        user_id: The user ID to blacklist

    Returns:
        True if successful
    """
    redis_client = await get_redis()

    if not redis_client:
        logger.warning("Redis not available, cannot blacklist user tokens")
        return False

    try:
        key = f"{BLACKLIST_PREFIX}:user:{user_id}"
        # Store timestamp when blacklist was set
        # Tokens issued before this time should be considered invalid
        timestamp = datetime.utcnow().timestamp()

        # Set with longer expiry (refresh token lifetime)
        expires_in = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        await redis_client.setex(key, expires_in, str(timestamp))

        logger.info(f"All tokens blacklisted for user {user_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to blacklist user tokens: {e}")
        return False


async def get_user_blacklist_time(user_id: int) -> Optional[float]:
    """
    Get the timestamp when user's tokens were blacklisted.

    Args:
        user_id: The user ID to check

    Returns:
        Timestamp if blacklisted, None otherwise
    """
    redis_client = await get_redis()

    if not redis_client:
        return None

    try:
        key = f"{BLACKLIST_PREFIX}:user:{user_id}"
        timestamp = await redis_client.get(key)
        return float(timestamp) if timestamp else None

    except Exception as e:
        logger.error(f"Failed to get user blacklist time: {e}")
        return None
