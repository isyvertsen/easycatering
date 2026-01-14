"""Service for managing system settings."""
import json
import logging
from datetime import datetime
from typing import Optional, Any, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_settings import SystemSettings
from app.core.cache import cache_get, cache_set, cache_delete, CACHE_TTL_MEDIUM

logger = logging.getLogger(__name__)


class SystemSettingsService:
    """Service for managing application-wide settings."""

    CACHE_PREFIX = "settings:"

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value by key (cached).

        Args:
            key: The setting key
            default: Default value if key doesn't exist

        Returns:
            The setting value or default
        """
        cache_key = f"{self.CACHE_PREFIX}{key}"

        # Try cache first
        cached = await cache_get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON in cache for key {key}")

        # Query database
        query = select(SystemSettings).where(SystemSettings.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            # Cache the result
            await cache_set(cache_key, json.dumps(setting.value), CACHE_TTL_MEDIUM)
            return setting.value

        return default

    async def set(
        self,
        key: str,
        value: Any,
        user_id: Optional[int] = None,
        description: Optional[str] = None
    ) -> bool:
        """Set a setting value.

        Args:
            key: The setting key
            value: The value to store (will be JSON serialized)
            user_id: ID of user making the change
            description: Optional description for the setting

        Returns:
            True if successful
        """
        query = select(SystemSettings).where(SystemSettings.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            # Update existing setting
            setting.value = value
            setting.updated_at = datetime.utcnow()
            setting.updated_by = user_id
            if description:
                setting.description = description
        else:
            # Create new setting
            setting = SystemSettings(
                key=key,
                value=value,
                description=description,
                updated_at=datetime.utcnow(),
                updated_by=user_id
            )
            self.db.add(setting)

        await self.db.commit()

        # Invalidate cache
        await cache_delete(f"{self.CACHE_PREFIX}{key}")

        logger.info(f"Setting '{key}' updated by user {user_id}")
        return True

    async def delete(self, key: str) -> bool:
        """Delete a setting.

        Args:
            key: The setting key to delete

        Returns:
            True if deleted, False if not found
        """
        query = select(SystemSettings).where(SystemSettings.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            await self.db.delete(setting)
            await self.db.commit()
            await cache_delete(f"{self.CACHE_PREFIX}{key}")
            return True

        return False

    async def get_all(self) -> List[dict]:
        """Get all settings.

        Returns:
            List of all settings with key, value, description, and updated_at
        """
        query = select(SystemSettings).order_by(SystemSettings.key)
        result = await self.db.execute(query)
        settings = result.scalars().all()

        return [
            {
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                "updated_by": s.updated_by
            }
            for s in settings
        ]

    # Convenience methods for specific settings

    async def get_webshop_category_order(self) -> List[int]:
        """Get the webshop category order for smart sorting.

        Returns:
            List of category IDs in display order
        """
        return await self.get("webshop_category_order", [])

    async def set_webshop_category_order(
        self,
        category_ids: List[int],
        user_id: Optional[int] = None
    ) -> bool:
        """Set the webshop category order.

        Args:
            category_ids: List of category IDs in desired order
            user_id: ID of user making the change

        Returns:
            True if successful
        """
        return await self.set(
            "webshop_category_order",
            category_ids,
            user_id,
            "Kategori-IDer i visningsrekkefølge for webshop smart sortering"
        )
