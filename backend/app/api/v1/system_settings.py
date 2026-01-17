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
    UserKundegruppeFilterResponse,
    UserKundegruppeFilterUpdate,
    WebshopOnlyRoleResponse,
    WebshopOnlyRoleUpdate,
)
from app.core.config import settings
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class FeatureFlagsResponse(BaseModel):
    """Response model for AI feature flags."""
    ai_recipe_validation: bool
    ai_dish_name_generator: bool
    ai_label_generator: bool
    ai_chatbot: bool


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


@router.get("/feature-flags", response_model=FeatureFlagsResponse)
async def get_feature_flags(
    current_user: User = Depends(get_current_user),
):
    """
    Get AI feature flags status.

    Returns the current status of AI-powered features.
    This endpoint is available to all authenticated users.
    """
    return FeatureFlagsResponse(
        ai_recipe_validation=settings.FEATURE_AI_RECIPE_VALIDATION,
        ai_dish_name_generator=settings.FEATURE_AI_DISH_NAME_GENERATOR,
        ai_label_generator=settings.FEATURE_AI_LABEL_GENERATOR,
        ai_chatbot=settings.FEATURE_AI_CHATBOT,
    )


@router.get("/user-kundegruppe-filter", response_model=UserKundegruppeFilterResponse)
async def get_user_kundegruppe_filter(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent kundegruppe-filter for bruker-tilknytning.

    Returnerer en liste med kundegruppe-IDer som skal vises i
    "Tilknyttede kunder"-listen i bruker-skjemaet.
    Tom liste betyr at alle aktive kunder vises.
    """
    require_admin(current_user)

    service = SystemSettingsService(db)
    gruppe_ids = await service.get_user_kundegruppe_filter()

    return UserKundegruppeFilterResponse(gruppe_ids=gruppe_ids)


@router.put("/user-kundegruppe-filter", response_model=UserKundegruppeFilterResponse)
async def update_user_kundegruppe_filter(
    data: UserKundegruppeFilterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Oppdater kundegruppe-filter for bruker-tilknytning (kun admin).

    Angi hvilke kundegrupper som skal vises i "Tilknyttede kunder"-listen.
    Tom liste betyr at alle aktive kunder vises.
    """
    require_admin(current_user)

    service = SystemSettingsService(db)
    await service.set_user_kundegruppe_filter(data.gruppe_ids, current_user.id)

    logger.info(f"User {current_user.email} updated user kundegruppe filter to {data.gruppe_ids}")

    return UserKundegruppeFilterResponse(gruppe_ids=data.gruppe_ids)


@router.get("/webshop-only-role", response_model=WebshopOnlyRoleResponse)
async def get_webshop_only_role(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent rollen som kun har tilgang til webshop.

    Brukere med denne rollen omdirigeres til webshop ved innlogging
    og har ikke tilgang til hovedapplikasjonen.
    Returnerer None hvis ingen rolle er satt.

    NB: Tilgjengelig for alle autentiserte brukere (for redirect-logikk).
    """
    # Note: No admin check - all authenticated users need to know this
    # for the redirect logic to work properly

    service = SystemSettingsService(db)
    role = await service.get_webshop_only_role()

    return WebshopOnlyRoleResponse(role=role)


@router.put("/webshop-only-role", response_model=WebshopOnlyRoleResponse)
async def update_webshop_only_role(
    data: WebshopOnlyRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Oppdater rollen som kun har tilgang til webshop (kun admin).

    Brukere med denne rollen omdirigeres til webshop ved innlogging
    og har ikke tilgang til hovedapplikasjonen.
    Sett til None for å deaktivere denne funksjonen.
    """
    require_admin(current_user)

    service = SystemSettingsService(db)
    await service.set_webshop_only_role(data.role, current_user.id)

    logger.info(f"User {current_user.email} updated webshop-only role to {data.role}")

    return WebshopOnlyRoleResponse(role=data.role)
