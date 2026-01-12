"""
Test næringsberegning for tbl_rpkalkyle (gamle oppskrift-systemet)

Kjør: uv run python test_kalkyle_nutrition.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from app.core.config import settings
from app.models.matinfo_products import MatinfoProduct, MatinfoNutrient
from app.models.produkter import Produkter


class KalkyleNutritionCalculator:
    """Beregner næring for tbl_rpkalkyle oppskrifter."""

    NUTRIENT_CODES = {
        "ENERC_KJ": "energy_kj",
        "ENERC_KCAL": "energy_kcal",
        "PROCNT": "protein",
        "FAT": "fat",
        "FASAT": "saturated_fat",
        "CHO-": "carbs",
        "SUGAR": "sugars",
        "FIBTG": "fiber",
        "NACL": "salt",
    }

    UNIT_TO_GRAMS = {
        "g": 1.0,
        "g- gr": 1.0,
        "kg": 1000.0,
        "mg": 0.001,
        "l": 1000.0,
        "dl": 100.0,
        "cl": 10.0,
        "ml": 1.0,
        "stk": 1.0,
        "stk ut": 1.0,
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_kalkyle_nutrition(self, kalkylekode: int):
        """Beregn næring for en kalkyle."""

        # Hent kalkyle info
        kalkyle_result = await self.db.execute(
            text("SELECT kalkylenavn, antallporsjoner FROM tbl_rpkalkyle WHERE kalkylekode = :kode"),
            {"kode": kalkylekode}
        )
        kalkyle = kalkyle_result.fetchone()

        if not kalkyle:
            raise ValueError(f"Kalkyle {kalkylekode} finnes ikke")

        # Hent ingredienser
        ingredienser_result = await self.db.execute(
            text("""
                SELECT produktid, porsjonsmengde, enh
                FROM tbl_rpkalkyledetaljer
                WHERE kalkylekode = :kode
            """),
            {"kode": kalkylekode}
        )
        ingredienser = ingredienser_result.fetchall()

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

        for ing in ingredienser:
            nutrition = await self._calculate_ingredient_nutrition(
                ing.produktid,
                ing.porsjonsmengde,
                ing.enh
            )

            if nutrition:
                for key in total_nutrition:
                    if key in nutrition:
                        total_nutrition[key] += nutrition[key]

                ingredients_nutrition.append({
                    "product_id": ing.produktid,
                    "amount": ing.porsjonsmengde,
                    "unit": ing.enh,
                    "nutrition": nutrition
                })

        portions = kalkyle.antallporsjoner or 1
        nutrition_per_portion = {
            key: round(value / portions, 2)
            for key, value in total_nutrition.items()
        }

        return {
            "kalkylekode": kalkylekode,
            "kalkylenavn": kalkyle.kalkylenavn,
            "portions": portions,
            "total_nutrition": total_nutrition,
            "nutrition_per_portion": nutrition_per_portion,
            "ingredients_nutrition": ingredients_nutrition,
            "data_quality": self._calculate_data_quality(ingredients_nutrition)
        }

    async def _calculate_ingredient_nutrition(self, produkt_id: int, mengde: float, enhet: str):
        """Beregn næring for én ingrediens."""

        # Hent produkt
        product_result = await self.db.execute(
            select(Produkter).where(Produkter.produktid == produkt_id)
        )
        product = product_result.scalar_one_or_none()

        if not product or not product.ean_kode:
            return None

        # Rens EAN-kode
        clean_ean = product.ean_kode.lstrip('-')

        # Finn Matinfo-produkt
        matinfo_result = await self.db.execute(
            select(MatinfoProduct).where(MatinfoMatinfoProduct.gtin == clean_ean)
        )
        matinfo_product = matinfo_result.scalar_one_or_none()

        if not matinfo_product:
            return None

        # Hent næringsverdier
        nutrients_result = await self.db.execute(
            select(MatinfoNutrient).where(MatinfoNutrient.product_id == matinfo_product.id)
        )
        nutrients = nutrients_result.scalars().all()

        if not nutrients:
            return None

        # Konverter mengde til gram
        amount_in_grams = self._convert_to_grams(mengde, enhet)

        # Beregn næring
        nutrition = {}
        for nutrient in nutrients:
            nutrient_key = self.NUTRIENT_CODES.get(nutrient.code)
            if nutrient_key and nutrient.measurement:
                value = float(nutrient.measurement) * (amount_in_grams / 100.0)
                nutrition[nutrient_key] = round(value, 2)

        return nutrition

    def _convert_to_grams(self, amount: float, unit: str) -> float:
        """Konverter til gram."""
        unit_lower = unit.lower().strip()
        return amount * self.UNIT_TO_GRAMS.get(unit_lower, 1.0)

    def _calculate_data_quality(self, ingredients_nutrition):
        """Beregn datakvalitet."""
        total = len(ingredients_nutrition)
        if total == 0:
            return {
                "total_ingredients": 0,
                "with_nutrition_data": 0,
                "coverage_percentage": 0,
                "quality": "ingen_data"
            }

        with_data = sum(1 for ing in ingredients_nutrition if ing.get("nutrition"))
        coverage = (with_data / total) * 100

        if coverage >= 90:
            quality = "utmerket"
        elif coverage >= 70:
            quality = "god"
        elif coverage >= 50:
            quality = "middels"
        else:
            quality = "lav"

        return {
            "total_ingredients": total,
            "with_nutrition_data": with_data,
            "coverage_percentage": round(coverage, 1),
            "quality": quality
        }


async def test_kalkyle_nutrition():
    """Test næringsberegning for kalkyle 999999."""

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        calculator = KalkyleNutritionCalculator(session)

        kalkylekode = 999999

        print("\n" + "="*80)
        print(f"TESTER NÆRINGSBEREGNING FOR KALKYLE {kalkylekode}")
        print("="*80 + "\n")

        try:
            result = await calculator.calculate_kalkyle_nutrition(kalkylekode)

            print(f"Oppskrift: {result['kalkylenavn']}")
            print(f"Porsjoner: {result['portions']}")
            print(f"\n{'='*60}")
            print("TOTAL NÆRING (hele oppskriften):")
            print(f"{'='*60}")

            total = result['total_nutrition']
            print(f"  Energi:        {total['energy_kcal']:.1f} kcal ({total['energy_kj']:.0f} kJ)")
            print(f"  Protein:       {total['protein']:.1f}g")
            print(f"  Fett:          {total['fat']:.1f}g")
            print(f"  - Mettet fett: {total['saturated_fat']:.1f}g")
            print(f"  Karbohydrater: {total['carbs']:.1f}g")
            print(f"  - Sukker:      {total['sugars']:.1f}g")
            print(f"  Kostfiber:     {total['fiber']:.1f}g")
            print(f"  Salt:          {total['salt']:.2f}g")

            print(f"\n{'='*60}")
            print("NÆRING PER PORSJON:")
            print(f"{'='*60}")

            per_portion = result['nutrition_per_portion']
            print(f"  Energi:        {per_portion['energy_kcal']:.1f} kcal ({per_portion['energy_kj']:.0f} kJ)")
            print(f"  Protein:       {per_portion['protein']:.1f}g")
            print(f"  Fett:          {per_portion['fat']:.1f}g")
            print(f"  - Mettet fett: {per_portion['saturated_fat']:.1f}g")
            print(f"  Karbohydrater: {per_portion['carbs']:.1f}g")
            print(f"  - Sukker:      {per_portion['sugars']:.1f}g")
            print(f"  Kostfiber:     {per_portion['fiber']:.1f}g")
            print(f"  Salt:          {per_portion['salt']:.2f}g")

            print(f"\n{'='*60}")
            print("DATAKVALITET:")
            print(f"{'='*60}")

            quality = result['data_quality']
            print(f"  Total ingredienser:     {quality['total_ingredients']}")
            print(f"  Med næringsdata:        {quality['with_nutrition_data']}")
            print(f"  Dekning:                {quality['coverage_percentage']:.1f}%")
            print(f"  Kvalitetsvurdering:     {quality['quality'].upper()}")

            print(f"\n{'='*60}")
            print("INGREDIENSER:")
            print(f"{'='*60}")

            for ing in result['ingredients_nutrition']:
                has_data = "✅" if ing.get('nutrition') else "❌"
                print(f"\n  {has_data} Produkt-ID: {ing['product_id']}")
                print(f"     Mengde:     {ing['amount']}{ing['unit']}")

                if ing.get('nutrition'):
                    nutr = ing['nutrition']
                    print(f"     Næring:     {nutr.get('energy_kcal', 0):.1f} kcal, "
                          f"{nutr.get('protein', 0):.1f}g protein, "
                          f"{nutr.get('fat', 0):.1f}g fett, "
                          f"{nutr.get('carbs', 0):.1f}g karb")

            print("\n" + "="*80)
            print("✅ NÆRINGSBEREGNING FULLFØRT!")
            print("="*80 + "\n")

            print("\n📋 SAMMENLIGNING MED FORVENTEDE VERDIER:\n")
            print("Forventet (estimat):")
            print("  Energi:        ~800-1000 kcal")
            print("  Protein:       ~25-35g")
            print("  Fett:          ~15-25g")
            print("  Karbohydrater: ~120-140g")
            print("\nFaktisk:")
            print(f"  Energi:        {total['energy_kcal']:.1f} kcal")
            print(f"  Protein:       {total['protein']:.1f}g")
            print(f"  Fett:          {total['fat']:.1f}g")
            print(f"  Karbohydrater: {total['carbs']:.1f}g")

            if 800 <= total['energy_kcal'] <= 1200:
                print(f"\n✅ Resultat er innenfor forventet område!")
            else:
                print(f"\n⚠️  Resultat er utenfor forventet område")

        except Exception as e:
            print(f"\n❌ FEIL: {e}")
            import traceback
            traceback.print_exc()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_kalkyle_nutrition())
