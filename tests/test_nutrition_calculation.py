"""
Test-skript for næringsberegning

Dette skriptet tester næringsberegningen på testoppskriften (kalkylekode 999999).

Kjør:
    uv run python test_nutrition_calculation.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.nutrition_calculator import NutritionCalculator
from app.core.config import settings


async def test_nutrition_calculation():
    """Test næringsberegning for testoppskrift."""

    # Opprett database-tilkobling
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=True,
    )

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Initialiser calculator
        calculator = NutritionCalculator(session)

        # Kalkyle-ID for testoppskriften
        recipe_id = 999999

        print("\n" + "="*80)
        print(f"TESTER NÆRINGSBEREGNING FOR OPPSKRIFT {recipe_id}")
        print("="*80 + "\n")

        try:
            # Beregn næringsverdier
            result = await calculator.calculate_recipe_nutrition(recipe_id)

            # Vis resultater
            print("\n📊 NÆRINGSBEREGNING RESULTAT\n")
            print(f"Oppskrift: {result['recipe_name']}")
            print(f"Porsjoner: {result['portions']}")
            print(f"\n{'='*60}")
            print("TOTAL NÆRING (hele oppskriften):")
            print(f"{'='*60}")

            total = result['total_nutrition']
            print(f"  Energi:        {total['energy_kcal']:.1f} kcal ({total['energy_kj']:.0f} kJ)")
            print(f"  Protein:       {total['protein']:.1f}g")
            print(f"  Fett:          {total['fat']:.1f}g")
            print(f"  - Mettet fett: {total.get('saturated_fat', 0):.1f}g")
            print(f"  Karbohydrater: {total['carbs']:.1f}g")
            print(f"  - Sukker:      {total.get('sugars', 0):.1f}g")
            print(f"  Kostfiber:     {total['fiber']:.1f}g")
            print(f"  Salt:          {total['salt']:.2f}g")

            print(f"\n{'='*60}")
            print("NÆRING PER PORSJON:")
            print(f"{'='*60}")

            per_portion = result['nutrition_per_portion']
            print(f"  Energi:        {per_portion['energy_kcal']:.1f} kcal ({per_portion['energy_kj']:.0f} kJ)")
            print(f"  Protein:       {per_portion['protein']:.1f}g")
            print(f"  Fett:          {per_portion['fat']:.1f}g")
            print(f"  - Mettet fett: {per_portion.get('saturated_fat', 0):.1f}g")
            print(f"  Karbohydrater: {per_portion['carbs']:.1f}g")
            print(f"  - Sukker:      {per_portion.get('sugars', 0):.1f}g")
            print(f"  Kostfiber:     {per_portion['fiber']:.1f}g")
            print(f"  Salt:          {per_portion['salt']:.2f}g")

            # Datakvalitet
            print(f"\n{'='*60}")
            print("DATAKVALITET:")
            print(f"{'='*60}")

            quality = result['data_quality']
            print(f"  Total ingredienser:     {quality['total_ingredients']}")
            print(f"  Med næringsdata:        {quality['with_nutrition_data']}")
            print(f"  Dekning:                {quality['coverage_percentage']:.1f}%")
            print(f"  Kvalitetsvurdering:     {quality['quality'].upper()}")

            # Ingrediens-detaljer
            print(f"\n{'='*60}")
            print("INGREDIENSER:")
            print(f"{'='*60}")

            for ing in result.get('ingredients_nutrition', []):
                has_data = "✅" if ing.get('nutrition') else "❌"
                print(f"\n  {has_data} Ingrediens #{ing['ingredient_id']}")
                print(f"     Produkt-ID: {ing['product_id']}")
                print(f"     Mengde:     {ing['amount']}{ing['unit']}")

                if ing.get('nutrition'):
                    nutr = ing['nutrition']
                    print(f"     Næring:     {nutr.get('energy_kcal', 0):.1f} kcal, "
                          f"{nutr.get('protein', 0):.1f}g protein, "
                          f"{nutr.get('fat', 0):.1f}g fett, "
                          f"{nutr.get('carbs', 0):.1f}g karb")
                else:
                    print(f"     Næring:     Ingen data tilgjengelig")

            print("\n" + "="*80)
            print("✅ NÆRINGSBEREGNING FULLFØRT!")
            print("="*80 + "\n")

            # Sammenlign med forventede verdier
            print("\n📋 SAMMENLIGNING MED FORVENTEDE VERDIER:\n")
            print("Forventet (kun første 3 ingredienser):")
            print("  Energi:        ~803 kcal")
            print("  Protein:       ~28.6g")
            print("  Fett:          ~17.2g")
            print("  Karbohydrater: ~125g")
            print("\nFaktisk:")
            print(f"  Energi:        {total['energy_kcal']:.1f} kcal")
            print(f"  Protein:       {total['protein']:.1f}g")
            print(f"  Fett:          {total['fat']:.1f}g")
            print(f"  Karbohydrater: {total['carbs']:.1f}g")

            # Avvik
            expected_kcal = 803
            actual_kcal = total['energy_kcal']
            difference_kcal = actual_kcal - expected_kcal

            if abs(difference_kcal) < 50:
                print(f"\n✅ Resultat er innenfor forventet område (avvik: {difference_kcal:+.1f} kcal)")
            else:
                print(f"\n⚠️  Resultat avviker fra forventet (avvik: {difference_kcal:+.1f} kcal)")
                print("   Dette kan være fordi bacon og agurk har næringsdata vi ikke hadde regnet med.")

        except Exception as e:
            print(f"\n❌ FEIL under næringsberegning: {e}")
            import traceback
            traceback.print_exc()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_nutrition_calculation())
