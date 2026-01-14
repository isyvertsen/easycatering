"""API endpoints for system settings (admin only)."""
import logging
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.services.system_settings_service import SystemSettingsService
from app.schemas.system_settings import (
    SystemSettingResponse,
    SystemSettingsListResponse,
    WebshopCategoryOrderResponse,
    WebshopCategoryOrderUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def require_admin(current_user: User) -> User:
    """Check if user is admin."""
    if current_user.rolle != "admin":
        raise HTTPException(
            status_code=403,
            detail="Kun administratorer har tilgang til systeminnstillinger"
        )
    return current_user


@router.get("/", response_model=SystemSettingsListResponse)
async def list_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent alle systeminnstillinger (kun admin).
    """
    require_admin(current_user)

    service = SystemSettingsService(db)
    settings = await service.get_all()

    return SystemSettingsListResponse(
        items=[SystemSettingResponse(**s) for s in settings],
        total=len(settings)
    )


@router.get("/webshop-category-order", response_model=WebshopCategoryOrderResponse)
async def get_webshop_category_order(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent kategori-rekkefølge for webshop smart sortering.

    Returnerer en liste med kategori-IDer i den rekkefølgen de skal vises
    i webshoppen (etter produkter sortert etter bestillingsfrekvens).
    """
    require_admin(current_user)

    service = SystemSettingsService(db)
    category_ids = await service.get_webshop_category_order()

    return WebshopCategoryOrderResponse(category_ids=category_ids)


@router.put("/webshop-category-order", response_model=WebshopCategoryOrderResponse)
async def update_webshop_category_order(
    data: WebshopCategoryOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Oppdater kategori-rekkefølge for webshop smart sortering (kun admin).

    Kategori-IDer angis i den rekkefølgen de skal vises i webshoppen.
    Kategorier som ikke er i listen vil vises til slutt (alfabetisk).
    """
    require_admin(current_user)

    service = SystemSettingsService(db)
    await service.set_webshop_category_order(data.category_ids, current_user.id)

    logger.info(f"User {current_user.email} updated webshop category order to {data.category_ids}")

    return WebshopCategoryOrderResponse(category_ids=data.category_ids)
