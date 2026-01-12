from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.recipe.repository import RecipeRepository
from app.domain.recipe.models import Recipe, RecipeIngredient, RecipeAllergen
import json
from datetime import datetime

class RecipeService:
    def __init__(self, db: AsyncSession):
        self.repository = RecipeRepository(db)
        self.db = db

    async def create_recipe(
        self,
        name: str,
        description: Optional[str],
        category_id: Optional[int],
        portions: int,
        preparation_time: Optional[int],
        cooking_time: Optional[int],
        instructions: Optional[str],
        ingredients: List[Dict[str, Any]],
        created_by: int
    ) -> Recipe:
        """Opprett ny oppskrift med ingredienser"""
        recipe_data = {
            "name": name,
            "description": description,
            "category_id": category_id,
            "portions": portions,
            "preparation_time": preparation_time,
            "cooking_time": cooking_time,
            "instructions": instructions,
            "created_by": created_by,
            "ingredients": ingredients
        }
        
        # Opprett oppskrift
        recipe = await self.repository.create(recipe_data)
        
        # Oppdag allergener automatisk
        allergens = await self.repository.detect_allergens(recipe)
        recipe.allergens = allergens
        await self.db.commit()
        
        return recipe

    async def update_recipe(
        self,
        recipe_id: int,
        recipe_data: Dict[str, Any],
        updated_by: int
    ) -> Optional[Recipe]:
        """Oppdater oppskrift og opprett versjon"""
        # Hent eksisterende oppskrift
        existing_recipe = await self.repository.get_by_id(recipe_id)
        if not existing_recipe:
            return None
        
        # Lagre versjon før oppdatering
        await self._create_version(existing_recipe, updated_by)
        
        # Utfør oppdatering
        recipe = await self.repository.update(recipe_id, recipe_data)
        
        # Oppdag allergener på nytt hvis ingredienser er endret
        if "ingredients" in recipe_data:
            allergens = await self.repository.detect_allergens(recipe)
            recipe.allergens = allergens
            await self.db.commit()
        
        return recipe

    async def get_recipe(self, recipe_id: int) -> Optional[Recipe]:
        """Hent oppskrift med alle detaljer"""
        return await self.repository.get_by_id(recipe_id)

    async def list_recipes(
        self,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        allergen_free: Optional[List[int]] = None
    ) -> List[Recipe]:
        """List oppskrifter med filtrering"""
        return await self.repository.get_multi(
            skip=skip,
            limit=limit,
            category_id=category_id,
            search=search,
            allergen_free=allergen_free
        )

    async def delete_recipe(self, recipe_id: int) -> bool:
        """Slett oppskrift (myk sletting)"""
        return await self.repository.delete(recipe_id)

    async def duplicate_recipe(
        self,
        recipe_id: int,
        new_name: str,
        created_by: int
    ) -> Optional[Recipe]:
        """Dupliser oppskrift med nytt navn"""
        recipe = await self.repository.duplicate_recipe(recipe_id, new_name)
        if recipe:
            recipe.created_by = created_by
            await self.db.commit()
        return recipe

    async def scale_recipe(
        self,
        recipe_id: int,
        new_portions: int
    ) -> Optional[Dict[str, Any]]:
        """Skaler oppskrift til nytt antall porsjoner"""
        return await self.repository.scale_recipe(recipe_id, new_portions)

    async def calculate_nutrition(self, recipe_id: int) -> Optional[Dict[str, Any]]:
        """Beregn detaljerte ernæringsverdier for oppskrift"""
        from app.services.nutrition_calculator import NutritionCalculator

        recipe = await self.repository.get_by_id(recipe_id)
        if not recipe:
            return None

        # Bruk NutritionCalculator for detaljert beregning
        calculator = NutritionCalculator(self.db)
        nutrition_data = await calculator.calculate_recipe_nutrition(recipe_id)

        # Oppdater også oppskriften med nye verdier
        await self.repository.calculate_nutrition(recipe)
        await self.db.commit()

        # Returner detaljert næringsdata
        return nutrition_data

    async def detect_allergens(self, recipe_id: int) -> List[RecipeAllergen]:
        """Oppdag allergener i oppskrift"""
        recipe = await self.repository.get_by_id(recipe_id)
        if not recipe:
            return []
        
        allergens = await self.repository.detect_allergens(recipe)
        
        # Oppdater oppskrift med oppdagede allergener
        recipe.allergens = allergens
        await self.db.commit()
        
        return allergens

    async def search_by_ingredients(
        self,
        product_ids: List[int]
    ) -> List[Recipe]:
        """Finn oppskrifter som inneholder spesifikke ingredienser"""
        return await self.repository.search_by_ingredients(product_ids)

    async def get_recipe_cost(self, recipe_id: int) -> Optional[Dict[str, float]]:
        """Beregn kostnad for oppskrift"""
        recipe = await self.repository.get_by_id(recipe_id)
        if not recipe:
            return None
        
        await self.repository.calculate_nutrition(recipe)  # Dette beregner også kostnad
        await self.db.commit()
        
        return {
            "total_cost": recipe.total_cost or 0,
            "cost_per_portion": recipe.cost_per_portion or 0,
            "portions": recipe.portions,
            "ingredient_costs": [
                {
                    "product_id": ing.product_id,
                    "product_name": ing.product.navn if ing.product else None,
                    "amount": ing.amount,
                    "unit": ing.unit,
                    "cost": ing.cost or 0
                }
                for ing in recipe.ingredients
            ]
        }

    async def _create_version(self, recipe: Recipe, created_by: int) -> None:
        """Opprett versjon av oppskrift før endring"""
        from app.domain.recipe.models import RecipeVersion
        
        # Serialiser oppskrift til JSON
        recipe_snapshot = {
            "name": recipe.name,
            "description": recipe.description,
            "category_id": recipe.category_id,
            "portions": recipe.portions,
            "preparation_time": recipe.preparation_time,
            "cooking_time": recipe.cooking_time,
            "instructions": recipe.instructions,
            "ingredients": [
                {
                    "product_id": ing.product_id,
                    "amount": ing.amount,
                    "unit": ing.unit,
                    "notes": ing.notes
                }
                for ing in recipe.ingredients
            ],
            "allergens": [{"id": a.id, "name": a.name} for a in recipe.allergens],
            "nutrition": {
                "calories": recipe.total_calories,
                "protein": recipe.total_protein,
                "fat": recipe.total_fat,
                "carbs": recipe.total_carbs,
                "fiber": recipe.total_fiber,
                "salt": recipe.total_salt
            },
            "cost": {
                "total": recipe.total_cost,
                "per_portion": recipe.cost_per_portion
            }
        }
        
        version = RecipeVersion(
            recipe_id=recipe.id,
            version_number=recipe.version,
            recipe_snapshot=json.dumps(recipe_snapshot, ensure_ascii=False),
            created_by=created_by,
            changes_description=f"Versjon {recipe.version} lagret før oppdatering"
        )
        
        self.db.add(version)

    async def approve_recipe(self, recipe_id: int, approved_by: int) -> Optional[Recipe]:
        """Godkjenn oppskrift for bruk"""
        recipe = await self.repository.get_by_id(recipe_id)
        if not recipe:
            return None
        
        recipe.is_approved = True
        recipe.approved_by = approved_by
        recipe.approved_at = datetime.utcnow()
        
        await self.db.commit()
        return recipe

    async def get_recipe_versions(self, recipe_id: int) -> List[Dict[str, Any]]:
        """Hent versjonshistorikk for oppskrift"""
        from app.domain.recipe.models import RecipeVersion
        from sqlalchemy import select
        
        query = select(RecipeVersion).where(
            RecipeVersion.recipe_id == recipe_id
        ).order_by(RecipeVersion.version_number.desc())
        
        result = await self.db.execute(query)
        versions = result.scalars().all()
        
        return [
            {
                "version_number": v.version_number,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "created_by": v.created_by,
                "changes_description": v.changes_description,
                "snapshot": json.loads(v.recipe_snapshot) if v.recipe_snapshot else None
            }
            for v in versions
        ]