from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.domain.recipe.models import Recipe, RecipeIngredient, RecipeAllergen, Category, recipe_allergens
from app.models.produkter import Produkter

class RecipeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, recipe_id: int) -> Optional[Recipe]:
        query = select(Recipe).where(Recipe.id == recipe_id).options(
            selectinload(Recipe.ingredients).selectinload(RecipeIngredient.product),
            selectinload(Recipe.allergens),
            selectinload(Recipe.category)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        allergen_free: Optional[List[int]] = None
    ) -> List[Recipe]:
        query = select(Recipe).where(Recipe.is_active == True)
        
        if category_id:
            query = query.where(Recipe.category_id == category_id)
        
        if search:
            query = query.where(
                or_(
                    Recipe.name.ilike(f"%{search}%"),
                    Recipe.description.ilike(f"%{search}%")
                )
            )
        
        if allergen_free:
            # Finn oppskrifter som IKKE har de spesifiserte allergenene
            subquery = select(recipe_allergens.c.recipe_id).where(
                recipe_allergens.c.allergen_id.in_(allergen_free)
            )
            query = query.where(Recipe.id.not_in(subquery))
        
        query = query.options(
            selectinload(Recipe.allergens),
            selectinload(Recipe.category)
        ).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, recipe_data: Dict[str, Any]) -> Recipe:
        ingredients_data = recipe_data.pop("ingredients", [])
        allergen_ids = recipe_data.pop("allergen_ids", [])
        
        # Opprett oppskrift
        recipe = Recipe(**recipe_data)
        self.db.add(recipe)
        await self.db.flush()
        
        # Legg til ingredienser
        for ingredient_data in ingredients_data:
            ingredient = RecipeIngredient(
                recipe_id=recipe.id,
                **ingredient_data
            )
            self.db.add(ingredient)
        
        # Legg til allergener
        if allergen_ids:
            allergens = await self.db.execute(
                select(RecipeAllergen).where(RecipeAllergen.id.in_(allergen_ids))
            )
            recipe.allergens = allergens.scalars().all()
        
        # Beregn ernæringsverdier
        await self.calculate_nutrition(recipe)
        
        await self.db.commit()
        await self.db.refresh(recipe)
        
        return recipe

    async def update(self, recipe_id: int, recipe_data: Dict[str, Any]) -> Optional[Recipe]:
        recipe = await self.get_by_id(recipe_id)
        if not recipe:
            return None
        
        ingredients_data = recipe_data.pop("ingredients", None)
        allergen_ids = recipe_data.pop("allergen_ids", None)
        
        # Oppdater grunnleggende felter
        for key, value in recipe_data.items():
            setattr(recipe, key, value)
        
        # Oppdater ingredienser hvis inkludert
        if ingredients_data is not None:
            # Slett eksisterende ingredienser
            for ingredient in recipe.ingredients:
                await self.db.delete(ingredient)
            
            # Legg til nye ingredienser
            for ingredient_data in ingredients_data:
                ingredient = RecipeIngredient(
                    recipe_id=recipe.id,
                    **ingredient_data
                )
                self.db.add(ingredient)
        
        # Oppdater allergener hvis inkludert
        if allergen_ids is not None:
            allergens = await self.db.execute(
                select(RecipeAllergen).where(RecipeAllergen.id.in_(allergen_ids))
            )
            recipe.allergens = allergens.scalars().all()
        
        # Beregn ernæringsverdier på nytt
        await self.calculate_nutrition(recipe)
        
        # Øk versjonsnummer
        recipe.version += 1
        
        await self.db.commit()
        await self.db.refresh(recipe)
        
        return recipe

    async def delete(self, recipe_id: int) -> bool:
        recipe = await self.get_by_id(recipe_id)
        if not recipe:
            return False
        
        # Myk sletting - marker som inaktiv
        recipe.is_active = False
        await self.db.commit()
        
        return True

    async def calculate_nutrition(self, recipe: Recipe) -> None:
        """Beregn ernæringsverdier og kostnad basert på ingredienser"""
        from app.services.nutrition_calculator import NutritionCalculator

        total_cost = 0

        for ingredient in recipe.ingredients:
            # Hent produkt for kostnad
            product = await self.db.get(Produkter, ingredient.product_id)
            if product and product.pris:
                # Beregn basert på mengde
                factor = ingredient.amount / 100.0
                cost = product.pris * factor
                ingredient.cost = cost
                total_cost += cost

        # Oppdater oppskrift med kostnad
        recipe.total_cost = total_cost

        if recipe.portions > 0:
            recipe.cost_per_portion = total_cost / recipe.portions

        # Beregn næringsverdier via NutritionCalculator
        try:
            calculator = NutritionCalculator(self.db)
            nutrition_data = await calculator.calculate_recipe_nutrition(recipe.id)

            # Oppdater oppskrift med totale næringsverdier
            total = nutrition_data["total_nutrition"]
            recipe.total_calories = total.get("energy_kcal", 0)
            recipe.total_protein = total.get("protein", 0)
            recipe.total_fat = total.get("fat", 0)
            recipe.total_carbs = total.get("carbs", 0)
            recipe.total_fiber = total.get("fiber", 0)
            recipe.total_salt = total.get("salt", 0)
        except Exception as e:
            # Hvis næringsberegning feiler, sett til 0
            # Dette kan skje hvis produkter mangler GTIN eller Matinfo-data
            recipe.total_calories = 0
            recipe.total_protein = 0
            recipe.total_fat = 0
            recipe.total_carbs = 0
            recipe.total_fiber = 0
            recipe.total_salt = 0

    async def detect_allergens(self, recipe: Recipe) -> List[RecipeAllergen]:
        """Oppdag allergener basert på ingredienser"""
        # NOTE: Allergen detection would need linking between tblprodukter and products table
        # For now, return empty list as allergen info is not in tblprodukter
        return []

    async def duplicate_recipe(self, recipe_id: int, new_name: str) -> Optional[Recipe]:
        """Dupliser en oppskrift"""
        original = await self.get_by_id(recipe_id)
        if not original:
            return None
        
        # Opprett kopi
        recipe_data = {
            "name": new_name,
            "description": original.description,
            "category_id": original.category_id,
            "portions": original.portions,
            "preparation_time": original.preparation_time,
            "cooking_time": original.cooking_time,
            "instructions": original.instructions,
            "version": 1,
            "is_active": True
        }
        
        # Kopier ingredienser
        ingredients_data = []
        for ingredient in original.ingredients:
            ingredients_data.append({
                "product_id": ingredient.product_id,
                "amount": ingredient.amount,
                "unit": ingredient.unit,
                "notes": ingredient.notes
            })
        
        recipe_data["ingredients"] = ingredients_data
        recipe_data["allergen_ids"] = [a.id for a in original.allergens]
        
        return await self.create(recipe_data)

    async def scale_recipe(self, recipe_id: int, new_portions: int) -> Optional[Dict[str, Any]]:
        """Skaler oppskrift til nytt antall porsjoner"""
        recipe = await self.get_by_id(recipe_id)
        if not recipe or recipe.portions <= 0:
            return None
        
        scale_factor = new_portions / recipe.portions
        
        scaled_ingredients = []
        for ingredient in recipe.ingredients:
            scaled_ingredients.append({
                "product_id": ingredient.product_id,
                "product_name": ingredient.product.navn if ingredient.product else None,
                "original_amount": ingredient.amount,
                "scaled_amount": ingredient.amount * scale_factor,
                "unit": ingredient.unit,
                "notes": ingredient.notes
            })
        
        return {
            "recipe_id": recipe.id,
            "recipe_name": recipe.name,
            "original_portions": recipe.portions,
            "new_portions": new_portions,
            "scale_factor": scale_factor,
            "ingredients": scaled_ingredients,
            "total_cost": recipe.total_cost * scale_factor if recipe.total_cost else None,
            "cost_per_portion": recipe.cost_per_portion if recipe.cost_per_portion else None
        }

    async def search_by_ingredients(self, product_ids: List[int]) -> List[Recipe]:
        """Finn oppskrifter som inneholder spesifikke ingredienser"""
        query = select(Recipe).join(RecipeIngredient).where(
            and_(
                RecipeIngredient.product_id.in_(product_ids),
                Recipe.is_active == True
            )
        ).distinct()
        
        result = await self.db.execute(query)
        return result.scalars().all()