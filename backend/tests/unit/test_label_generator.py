"""Unit tests for LabelGenerator service."""
import pytest
from app.services.label_generator import LabelGenerator, get_label_generator


class TestFormatIngredients:
    """Tests for _format_ingredients method."""

    @pytest.fixture
    def generator(self):
        """Create a fresh LabelGenerator instance."""
        return LabelGenerator()

    def test_format_simple_ingredients(self, generator):
        """Test formatting simple ingredients list."""
        ingredients = [
            {"name": "Mel"},
            {"name": "Sukker"},
            {"name": "Egg"},
        ]
        result = generator._format_ingredients(ingredients, [])
        assert result == "Mel, Sukker, Egg"

    def test_format_with_allergen_bold(self, generator):
        """Test that allergens are bolded."""
        ingredients = [
            {"name": "Mel"},
            {"name": "Melk"},
            {"name": "Egg"},
        ]
        result = generator._format_ingredients(ingredients, ["melk"])
        assert "<b>Melk</b>" in result
        assert "Mel," in result  # Mel should not be bolded

    def test_format_allergen_case_insensitive(self, generator):
        """Test that allergen matching is case insensitive."""
        ingredients = [
            {"name": "MELK"},
            {"name": "melk"},
            {"name": "Melk"},
        ]
        result = generator._format_ingredients(ingredients, ["Melk"])
        assert result.count("<b>") == 3

    def test_format_allergen_partial_match(self, generator):
        """Test that allergen matches partial ingredient names."""
        ingredients = [
            {"name": "Helmelk"},
            {"name": "Lettmelk"},
            {"name": "Soyamelk"},
        ]
        result = generator._format_ingredients(ingredients, ["melk"])
        assert result.count("<b>") == 3

    def test_format_multiple_allergens(self, generator):
        """Test formatting with multiple allergens."""
        ingredients = [
            {"name": "Hvetemel"},
            {"name": "Melk"},
            {"name": "Egg"},
            {"name": "Sukker"},
        ]
        result = generator._format_ingredients(ingredients, ["hvete", "melk", "egg"])
        assert "<b>Hvetemel</b>" in result
        assert "<b>Melk</b>" in result
        assert "<b>Egg</b>" in result
        assert "Sukker" in result
        assert "<b>Sukker</b>" not in result

    def test_format_empty_ingredients(self, generator):
        """Test formatting empty ingredients list."""
        result = generator._format_ingredients([], [])
        assert result == ""

    def test_format_empty_allergens(self, generator):
        """Test formatting with empty allergens list."""
        ingredients = [
            {"name": "Mel"},
            {"name": "Sukker"},
        ]
        result = generator._format_ingredients(ingredients, [])
        assert "<b>" not in result

    def test_format_ingrediensnavn_key(self, generator):
        """Test that ingrediensnavn key also works."""
        ingredients = [
            {"ingrediensnavn": "Mel"},
            {"ingrediensnavn": "Sukker"},
        ]
        result = generator._format_ingredients(ingredients, [])
        assert result == "Mel, Sukker"

    def test_format_norwegian_characters(self, generator):
        """Test handling of Norwegian characters."""
        ingredients = [
            {"name": "Blåbær"},
            {"name": "Grønnsaker"},
            {"name": "Rømme"},
        ]
        result = generator._format_ingredients(ingredients, ["blåbær"])
        assert "<b>Blåbær</b>" in result
        assert "Grønnsaker" in result
        assert "Rømme" in result


class TestGenerateRecipeLabel:
    """Tests for generate_recipe_label method."""

    @pytest.fixture
    def generator(self):
        """Create a fresh LabelGenerator instance."""
        return LabelGenerator()

    def test_generate_returns_bytes(self, generator):
        """Test that generate_recipe_label returns BytesIO."""
        result = generator.generate_recipe_label(
            recipe_name="Test Oppskrift",
            ingredients=[{"name": "Mel"}, {"name": "Sukker"}],
            allergens=[],
            nutrition_per_100g={"energy_kj": 100, "energy_kcal": 24},
        )
        assert result is not None
        pdf_bytes = result.read()
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_with_allergens(self, generator):
        """Test generation with allergens."""
        result = generator.generate_recipe_label(
            recipe_name="Pannekaker",
            ingredients=[{"name": "Hvetemel"}, {"name": "Melk"}, {"name": "Egg"}],
            allergens=["hvete", "melk", "egg"],
            nutrition_per_100g={"energy_kj": 500, "energy_kcal": 120},
        )
        assert result is not None
        pdf_bytes = result.read()
        assert len(pdf_bytes) > 0

    def test_generate_with_weight(self, generator):
        """Test generation with weight information."""
        result = generator.generate_recipe_label(
            recipe_name="Kjøttkaker",
            ingredients=[{"name": "Kjøttdeig"}],
            allergens=[],
            nutrition_per_100g={"energy_kj": 800, "energy_kcal": 190},
            weight_grams=450.0,
        )
        assert result is not None

    def test_generate_with_preparation_info(self, generator):
        """Test generation with preparation instructions."""
        result = generator.generate_recipe_label(
            recipe_name="Suppe",
            ingredients=[{"name": "Grønnsaker"}],
            allergens=[],
            nutrition_per_100g={"energy_kj": 200, "energy_kcal": 48},
            preparation_info="Varm opp til 75°C før servering.",
        )
        assert result is not None


class TestGetLabelGenerator:
    """Tests for get_label_generator singleton function."""

    def test_returns_label_generator(self):
        """Test that function returns LabelGenerator instance."""
        gen = get_label_generator()
        assert isinstance(gen, LabelGenerator)

    def test_returns_singleton(self):
        """Test that function returns same instance."""
        gen1 = get_label_generator()
        gen2 = get_label_generator()
        assert gen1 is gen2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
