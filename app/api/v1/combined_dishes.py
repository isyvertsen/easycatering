"""API endpoints for combined dishes (lagrede kombinerte retter)."""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.combined_dish import CombinedDish, CombinedDishRecipe, CombinedDishProduct
from app.models.produkter import Produkter
from app.models.kalkyle import Kalkyle
from app.models.matinfo_products import MatinfoProduct, MatinfoNutrient, MatinfoAllergen
from app.schemas.combined_dish import (
    CombinedDishCreate,
    CombinedDishUpdate,
    CombinedDishResponse,
    CombinedDishListResponse,
    CombinedDishRecipeComponentResponse,
    CombinedDishProductComponentResponse,
)

router = APIRouter()

# Enhetkonverteringer (fra oppskrifter.py)
UNIT_TO_GRAMS = {
    "g": 1.0,
    "kg": 1000.0,
    "l": 1000.0,
    "dl": 100.0,
    "ml": 1.0,
    "ss": 15.0,
    "ts": 5.0,
    "stk": 1.0,
    "pk": 1.0,
}

# Næringskode-mapping (fra oppskrifter.py)
NUTRIENT_CODES = {
    "ENER-": "energy_kj",
    "ENERC": "energy_kcal",
    "PRO-": "protein",
    "FAT": "fat",
    "FASAT": "saturated_fat",
    "FAPUN": "polyunsaturated_fat",
    "FAMUN": "monounsaturated_fat",
    "CHO-": "carbs",
    "SUGAR-": "sugars",
    "FIBC": "fiber",
    "SALTEQ": "salt",
    "ALC": "sugar_alcohols",
}


@router.post("/", response_model=CombinedDishResponse)
async def create_combined_dish(
    dish_create: CombinedDishCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Opprett en ny kombinert rett.

    Lagrer en kombinasjon av oppskrifter og/eller produkter for senere bruk.
    Næringsverdier beregnes dynamisk når retten hentes.
    """
    # Sjekk at minst en komponent er inkludert
    if not dish_create.recipes and not dish_create.products:
        raise HTTPException(
            status_code=400,
            detail="En kombinert rett må ha minst en oppskrift eller ett produkt"
        )

    # Batch-valider at oppskriftene eksisterer
    if dish_create.recipes:
        recipe_codes = [r.kalkylekode for r in dish_create.recipes]
        existing_recipes_result = await db.execute(
            select(Kalkyle.kalkylekode).where(Kalkyle.kalkylekode.in_(recipe_codes))
        )
        existing_recipe_codes = set(row[0] for row in existing_recipes_result.all())

        for recipe in dish_create.recipes:
            if recipe.kalkylekode not in existing_recipe_codes:
                raise HTTPException(
                    status_code=404,
                    detail=f"Oppskrift med kalkylekode {recipe.kalkylekode} finnes ikke"
                )

    # Batch-valider at produktene eksisterer
    if dish_create.products:
        product_ids = [p.produktid for p in dish_create.products]
        existing_products_result = await db.execute(
            select(Produkter.produktid).where(Produkter.produktid.in_(product_ids))
        )
        existing_product_ids = set(row[0] for row in existing_products_result.all())

        for product in dish_create.products:
            if product.produktid not in existing_product_ids:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produkt med produktid {product.produktid} finnes ikke"
                )

    # Opprett combined dish
    new_dish = CombinedDish(
        name=dish_create.name,
        preparation_instructions=dish_create.preparation_instructions,
        created_by_user_id=current_user.id,
    )
    db.add(new_dish)
    await db.flush()

    # Legg til oppskrifter
    for recipe in dish_create.recipes:
        dish_recipe = CombinedDishRecipe(
            combined_dish_id=new_dish.id,
            kalkylekode=recipe.kalkylekode,
            amount_grams=recipe.amount_grams,
        )
        db.add(dish_recipe)

    # Legg til produkter
    for product in dish_create.products:
        dish_product = CombinedDishProduct(
            combined_dish_id=new_dish.id,
            produktid=product.produktid,
            amount_grams=product.amount_grams,
        )
        db.add(dish_product)

    await db.commit()

    # Hent full rett med relationships
    result = await db.execute(
        select(CombinedDish)
        .options(
            selectinload(CombinedDish.recipe_components).selectinload(CombinedDishRecipe.recipe),
            selectinload(CombinedDish.product_components).selectinload(CombinedDishProduct.product),
        )
        .where(CombinedDish.id == new_dish.id)
    )
    dish = result.scalar_one()

    return _format_combined_dish_response(dish)


@router.get("/", response_model=CombinedDishListResponse)
async def list_combined_dishes(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent liste over alle lagrede kombinerte retter.

    Støtter søk etter navn og paginering.
    """
    query = select(CombinedDish).options(
        selectinload(CombinedDish.recipe_components).selectinload(CombinedDishRecipe.recipe),
        selectinload(CombinedDish.product_components).selectinload(CombinedDishProduct.product),
    )

    # Legg til søkefilter hvis oppgitt
    if search:
        query = query.where(CombinedDish.name.ilike(f"%{search}%"))

    # Tell totalt antall
    count_query = select(func.count()).select_from(CombinedDish)
    if search:
        count_query = count_query.where(CombinedDish.name.ilike(f"%{search}%"))
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Hent data med paginering
    query = query.order_by(CombinedDish.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    dishes = result.scalars().all()

    return CombinedDishListResponse(
        items=[_format_combined_dish_response(dish) for dish in dishes],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{dish_id}", response_model=CombinedDishResponse)
async def get_combined_dish(
    dish_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hent en spesifikk kombinert rett.

    Returnerer full informasjon om retten inkludert alle komponenter.
    """
    result = await db.execute(
        select(CombinedDish)
        .options(
            selectinload(CombinedDish.recipe_components).selectinload(CombinedDishRecipe.recipe),
            selectinload(CombinedDish.product_components).selectinload(CombinedDishProduct.product),
        )
        .where(CombinedDish.id == dish_id)
    )
    dish = result.scalar_one_or_none()

    if not dish:
        raise HTTPException(status_code=404, detail="Kombinert rett ikke funnet")

    return _format_combined_dish_response(dish)


@router.put("/{dish_id}", response_model=CombinedDishResponse)
async def update_combined_dish(
    dish_id: int,
    dish_update: CombinedDishUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Oppdater en kombinert rett.

    Kan oppdatere navn og/eller komponenter (oppskrifter og produkter).
    """
    # Hent eksisterende rett
    result = await db.execute(
        select(CombinedDish).where(CombinedDish.id == dish_id)
    )
    dish = result.scalar_one_or_none()

    if not dish:
        raise HTTPException(status_code=404, detail="Kombinert rett ikke funnet")

    # Oppdater navn hvis oppgitt
    if dish_update.name is not None:
        dish.name = dish_update.name

    # Oppdater preparation_instructions hvis oppgitt
    if dish_update.preparation_instructions is not None:
        dish.preparation_instructions = dish_update.preparation_instructions

    # Oppdater oppskrifter hvis oppgitt
    if dish_update.recipes is not None:
        # Slett eksisterende oppskrifter
        await db.execute(
            delete(CombinedDishRecipe).where(CombinedDishRecipe.combined_dish_id == dish_id)
        )

        # Batch-valider at oppskriftene eksisterer
        if dish_update.recipes:
            recipe_codes = [r.kalkylekode for r in dish_update.recipes]
            existing_recipes_result = await db.execute(
                select(Kalkyle.kalkylekode).where(Kalkyle.kalkylekode.in_(recipe_codes))
            )
            existing_recipe_codes = set(row[0] for row in existing_recipes_result.all())

            for recipe in dish_update.recipes:
                if recipe.kalkylekode not in existing_recipe_codes:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Oppskrift med kalkylekode {recipe.kalkylekode} finnes ikke"
                    )

                dish_recipe = CombinedDishRecipe(
                    combined_dish_id=dish_id,
                    kalkylekode=recipe.kalkylekode,
                    amount_grams=recipe.amount_grams,
                )
                db.add(dish_recipe)

    # Oppdater produkter hvis oppgitt
    if dish_update.products is not None:
        # Slett eksisterende produkter
        await db.execute(
            delete(CombinedDishProduct).where(CombinedDishProduct.combined_dish_id == dish_id)
        )

        # Batch-valider at produktene eksisterer
        if dish_update.products:
            product_ids = [p.produktid for p in dish_update.products]
            existing_products_result = await db.execute(
                select(Produkter.produktid).where(Produkter.produktid.in_(product_ids))
            )
            existing_product_ids = set(row[0] for row in existing_products_result.all())

            for product in dish_update.products:
                if product.produktid not in existing_product_ids:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Produkt med produktid {product.produktid} finnes ikke"
                    )

                dish_product = CombinedDishProduct(
                    combined_dish_id=dish_id,
                    produktid=product.produktid,
                    amount_grams=product.amount_grams,
                )
                db.add(dish_product)

    # Oppdater updated_at
    dish.updated_at = datetime.utcnow()

    await db.commit()

    # Hent full rett med relationships
    result = await db.execute(
        select(CombinedDish)
        .options(
            selectinload(CombinedDish.recipe_components).selectinload(CombinedDishRecipe.recipe),
            selectinload(CombinedDish.product_components).selectinload(CombinedDishProduct.product),
        )
        .where(CombinedDish.id == dish_id)
    )
    updated_dish = result.scalar_one()

    return _format_combined_dish_response(updated_dish)


@router.delete("/{dish_id}")
async def delete_combined_dish(
    dish_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Slett en kombinert rett.

    Sletter retten og alle tilhørende komponenter (cascade delete).
    """
    result = await db.execute(
        select(CombinedDish).where(CombinedDish.id == dish_id)
    )
    dish = result.scalar_one_or_none()

    if not dish:
        raise HTTPException(status_code=404, detail="Kombinert rett ikke funnet")

    await db.delete(dish)
    await db.commit()

    return {"message": "Kombinert rett slettet", "id": dish_id}


def _format_combined_dish_response(dish: CombinedDish) -> CombinedDishResponse:
    """Format a CombinedDish ORM object into a response schema."""
    recipe_components = []
    for rc in dish.recipe_components:
        recipe_components.append(
            CombinedDishRecipeComponentResponse(
                id=rc.id,
                kalkylekode=rc.kalkylekode,
                kalkylenavn=rc.recipe.kalkylenavn if rc.recipe else "Ukjent",
                amount_grams=rc.amount_grams,
            )
        )

    product_components = []
    for pc in dish.product_components:
        product_components.append(
            CombinedDishProductComponentResponse(
                id=pc.id,
                produktid=pc.produktid,
                produktnavn=pc.product.produktnavn if pc.product else "Ukjent",
                visningsnavn=pc.product.visningsnavn if pc.product and pc.product.visningsnavn else None,
                amount_grams=pc.amount_grams,
            )
        )

    return CombinedDishResponse(
        id=dish.id,
        name=dish.name,
        created_at=dish.created_at,
        updated_at=dish.updated_at,
        created_by_user_id=dish.created_by_user_id,
        recipe_components=recipe_components,
        product_components=product_components,
    )
