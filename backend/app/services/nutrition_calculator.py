"""
Tjeneste for beregning av næringsverdier for oppskrifter.
"""
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from decimal import Decimal

from app.models.matinfo_products import MatinfoProduct, MatinfoNutrient as MatinfoNutrient, MatinfoAllergen
from app.models.produkter import Produkter
# Støtte både nye (recipes) og gamle (tbl_rpkalkyle) oppskrifter
try:
    from app.domain.recipe.models import Recipe, RecipeIngredient
except ImportError:
    Recipe = None
    RecipeIngredient = None


class NutritionCalculator:
    """Beregner næringsverdier for oppskrifter basert på ingredienser."""

    # Mapping av Matinfo næringskoder til våre felter
    # Basert på faktisk data fra matinfo_nutrients tabellen
    NUTRIENT_CODES = {
        "ENERC_KJ": "energy_kj",      # Energi (kJ)
        "ENERC_KCAL": "energy_kcal",  # Energi (kcal)
        "PROCNT": "protein",          # Protein (g)
        "FAT": "fat",                 # Fett (g)
        "FASAT": "saturated_fat",     # Mettet fett (g)
        "CHO-": "carbs",              # Karbohydrater (g)
        "SUGAR": "sugars",            # Sukkerarter (g)
        "FIBTG": "fiber",             # Kostfiber (g)
        "NACL": "salt",               # Salt (g)
    }

    # Konverteringsfaktorer for ulike enheter til gram
    # Basert på faktiske enheter brukt i tbl_rpkalkyledetaljer
    UNIT_TO_GRAMS = {
        "g": 1.0,
        "g- gr": 1.0,     # Variant av gram fra databasen
        "kg": 1000.0,
        "mg": 0.001,
        "l": 1000.0,      # Antar tetthet som vann
        "dl": 100.0,
        "cl": 10.0,       # Centiliter
        "ml": 1.0,
        "stk": 1.0,       # Stykkpris - må håndteres spesielt
        "stk ut": 1.0,    # Variant fra database
        "ss": 15.0,       # Spiseskje ~15ml/g
        "ts": 5.0,        # Teskje ~5ml/g
        "klype": 0.5,
        "beger": 200.0,
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_recipe_nutrition(self, recipe_id: int) -> Dict:
        """
        Beregner totale næringsverdier for en oppskrift.

        Returns:
            Dict med næringsverdier totalt og per porsjon
        """
        # Hent oppskrift med ingredienser
        result = await self.db.execute(
            select(Recipe).where(Recipe.id == recipe_id)
        )
        recipe = result.scalar_one_or_none()

        if not recipe:
            raise ValueError(f"Oppskrift med id {recipe_id} finnes ikke")

        # Hent alle ingredienser
        ingredients_result = await self.db.execute(
            select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
        )
        ingredients = ingredients_result.scalars().all()

        if not ingredients:
            return {
                "recipe_id": recipe_id,
                "recipe_name": recipe.name,
                "portions": recipe.portions or 1,
                "total_nutrition": {
                    "energy_kj": 0.0, "energy_kcal": 0.0, "protein": 0.0,
                    "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0,
                    "sugars": 0.0, "fiber": 0.0, "salt": 0.0,
                },
                "nutrition_per_portion": {
                    "energy_kj": 0.0, "energy_kcal": 0.0, "protein": 0.0,
                    "fat": 0.0, "saturated_fat": 0.0, "carbs": 0.0,
                    "sugars": 0.0, "fiber": 0.0, "salt": 0.0,
                },
                "ingredients_nutrition": [],
                "data_quality": self._calculate_data_quality([])
            }

        # Batch query 1: Hent alle produkter for ingrediensene
        product_ids = [ing.product_id for ing in ingredients]
        products_result = await self.db.execute(
            select(Produkter).where(Produkter.produktid.in_(product_ids))
        )
        products_by_id = {p.produktid: p for p in products_result.scalars().all()}

        # Samle alle EAN-koder (rensede)
        ean_codes = []
        for product in products_by_id.values():
            if product.ean_kode:
                clean_ean = product.ean_kode.lstrip('-')
                if clean_ean:
                    ean_codes.append(clean_ean)

        # Batch query 2: Hent alle matinfo-produkter med næringsverdier
        matinfo_by_ean = {}
        if ean_codes:
            matinfo_result = await self.db.execute(
                select(MatinfoProduct)
                .options(selectinload(MatinfoProduct.nutrients))
                .where(MatinfoProduct.gtin.in_(ean_codes))
            )
            for mp in matinfo_result.scalars().all():
                matinfo_by_ean[mp.gtin] = mp

        # Beregn næring for hver ingrediens ved hjelp av cached data
        total_nutrition = {
            "energy_kj": 0.0,
            "energy_kcal": 0.0,
            "protein": 0.0,
            "fat": 0.0,
            "saturated_fat": 0.0,
            "carbs": 0.0,
            "sugars": 0.0,
            "fiber": 0.0,
            "salt": 0.0,
        }

        ingredients_nutrition = []

        for ingredient in ingredients:
            nutrition = self._calculate_ingredient_nutrition_from_cache(
                ingredient, products_by_id, matinfo_by_ean
            )

            if nutrition:
                # Legg til i total
                for key in total_nutrition:
                    if key in nutrition:
                        total_nutrition[key] += nutrition[key]

                ingredients_nutrition.append({
                    "ingredient_id": ingredient.id,
                    "product_id": ingredient.product_id,
                    "amount": ingredient.amount,
                    "unit": ingredient.unit,
                    "nutrition": nutrition
                })

        # Beregn per porsjon
        portions = recipe.portions or 1
        nutrition_per_portion = {
            key: round(value / portions, 2)
            for key, value in total_nutrition.items()
        }

        return {
            "recipe_id": recipe_id,
            "recipe_name": recipe.name,
            "portions": portions,
            "total_nutrition": total_nutrition,
            "nutrition_per_portion": nutrition_per_portion,
            "ingredients_nutrition": ingredients_nutrition,
            "data_quality": self._calculate_data_quality(ingredients_nutrition)
        }

    def _calculate_ingredient_nutrition_from_cache(
        self,
        ingredient: RecipeIngredient,
        products_by_id: Dict[int, Produkter],
        matinfo_by_ean: Dict[str, MatinfoProduct]
    ) -> Optional[Dict]:
        """
        Beregner næringsverdier for en ingrediens basert på prefetched data.

        Args:
            ingredient: RecipeIngredient objekt
            products_by_id: Dict med produkter hentet i batch
            matinfo_by_ean: Dict med matinfo-produkter hentet i batch

        Returns:
            Dict med næringsverdier eller None hvis data ikke finnes
        """
        # Hent produkt fra cache
        product = products_by_id.get(ingredient.product_id)

        if not product or not product.ean_kode:
            return None

        # Rens EAN-kode (fjern minustegn foran)
        clean_ean = product.ean_kode.lstrip('-') if product.ean_kode else None

        if not clean_ean:
            return None

        # Finn tilsvarende matinfo-produkt fra cache
        matinfo_product = matinfo_by_ean.get(clean_ean)

        if not matinfo_product:
            return None

        # Hent næringsverdier fra eagerly loaded relationship
        nutrients = matinfo_product.nutrients

        if not nutrients:
            return None

        # Konverter mengde til gram
        amount_in_grams = self._convert_to_grams(
            ingredient.amount,
            ingredient.unit
        )

        # Beregn næringsverdier basert på mengde
        # Matinfo-data er per 100g
        nutrition = {}

        for nutrient in nutrients:
            # Finn riktig nøkkel fra vårt mapping
            nutrient_key = self.NUTRIENT_CODES.get(nutrient.code)

            if nutrient_key and nutrient.measurement:
                # Beregn verdi basert på mengde
                value = float(nutrient.measurement) * (amount_in_grams / 100.0)
                nutrition[nutrient_key] = round(value, 2)

        return nutrition

    def _convert_to_grams(self, amount: float, unit: str) -> float:
        """
        Konverterer mengde fra ulike enheter til gram.

        Args:
            amount: Mengde
            unit: Enhet (g, kg, l, dl, stk, etc.)

        Returns:
            Mengde i gram
        """
        unit_lower = unit.lower().strip()

        if unit_lower in self.UNIT_TO_GRAMS:
            return amount * self.UNIT_TO_GRAMS[unit_lower]

        # Default til gram hvis ukjent enhet
        return amount

    def _calculate_data_quality(self, ingredients_nutrition: List[Dict]) -> Dict:
        """
        Beregner datakvalitet for næringsberegningen.

        Returns:
            Dict med statistikk om datakvalitet
        """
        total_ingredients = len(ingredients_nutrition)

        if total_ingredients == 0:
            return {
                "total_ingredients": 0,
                "with_nutrition_data": 0,
                "coverage_percentage": 0,
                "quality": "ingen_data"
            }

        with_data = sum(
            1 for ing in ingredients_nutrition
            if ing.get("nutrition")
        )

        coverage = (with_data / total_ingredients) * 100 if total_ingredients > 0 else 0

        # Kvalitetsvurdering
        if coverage >= 90:
            quality = "utmerket"
        elif coverage >= 70:
            quality = "god"
        elif coverage >= 50:
            quality = "middels"
        else:
            quality = "lav"

        return {
            "total_ingredients": total_ingredients,
            "with_nutrition_data": with_data,
            "coverage_percentage": round(coverage, 1),
            "quality": quality
        }

    async def update_recipe_nutrition_values(self, recipe_id: int) -> Recipe:
        """
        Oppdaterer næringsverdier i Recipe-tabellen.

        Args:
            recipe_id: ID til oppskrift

        Returns:
            Oppdatert Recipe objekt
        """
        # Beregn næringsverdier
        nutrition_data = await self.calculate_recipe_nutrition(recipe_id)

        # Hent oppskrift
        result = await self.db.execute(
            select(Recipe).where(Recipe.id == recipe_id)
        )
        recipe = result.scalar_one_or_none()

        if not recipe:
            raise ValueError(f"Oppskrift med id {recipe_id} finnes ikke")

        # Oppdater totale verdier (per 100g for å være konsistent med Matinfo)
        total = nutrition_data["total_nutrition"]
        recipe.total_calories = total.get("energy_kcal", 0)
        recipe.total_protein = total.get("protein", 0)
        recipe.total_fat = total.get("fat", 0)
        recipe.total_carbs = total.get("carbs", 0)
        recipe.total_fiber = total.get("fiber", 0)
        recipe.total_salt = total.get("salt", 0)

        await self.db.commit()
        await self.db.refresh(recipe)

        return recipe
