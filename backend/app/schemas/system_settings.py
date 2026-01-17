"""Pydantic schemas for system settings."""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class SystemSettingResponse(BaseModel):
    """Response schema for a single system setting."""
    key: str
    value: Any
    description: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class SystemSettingsListResponse(BaseModel):
    """Response schema for listing all settings."""
    items: List[SystemSettingResponse]
    total: int


class WebshopCategoryOrderResponse(BaseModel):
    """Response schema for webshop category order."""
    category_ids: List[int]


class WebshopCategoryOrderUpdate(BaseModel):
    """Request schema for updating webshop category order."""
    category_ids: List[int]


class UserKundegruppeFilterResponse(BaseModel):
    """Response schema for user kundegruppe filter."""
    gruppe_ids: List[int]


class UserKundegruppeFilterUpdate(BaseModel):
    """Request schema for updating user kundegruppe filter."""
    gruppe_ids: List[int]


class WebshopOnlyRoleResponse(BaseModel):
    """Response schema for webshop-only role setting."""
    role: Optional[str] = None


class WebshopOnlyRoleUpdate(BaseModel):
    """Request schema for updating webshop-only role."""
    role: Optional[str] = None
