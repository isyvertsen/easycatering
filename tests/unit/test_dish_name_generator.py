"""Unit tests for DishNameGenerator service."""
import pytest
from app.services.dish_name_generator import DishNameGenerator, get_dish_name_generator


class TestGenerateRuleBased:
    """Tests for _generate_rule_based method."""

    @pytest.fixture
    def generator(self):
        """Create a fresh DishNameGenerator instance."""
        return DishNameGenerator()

    def test_single_recipe(self, generator):
        """Test with single recipe."""
        recipes = [{"name": "Kjøttkaker", "amount_grams": 200}]
        products = []
        result = generator._generate_rule_based(recipes, products)
        assert result == "kjøttkaker"

    def test_single_product(self, generator):
        """Test with single product."""
        recipes = []
        products = [{"name": "Ris", "amount_grams": 150}]
        result = generator._generate_rule_based(recipes, products)
        assert result == "ris"

    def test_two_components(self, generator):
        """Test with two components."""
        recipes = [{"name": "Kjøttkaker", "amount_grams": 200}]
        products = [{"name": "Ris", "amount_grams": 150}]
        result = generator._generate_rule_based(recipes, products)
        assert result == "kjøttkaker med ris"

    def test_three_components(self, generator):
        """Test with three components."""
        recipes = [{"name": "Kjøttkaker", "amount_grams": 200}]
        products = [
            {"name": "Ris", "amount_grams": 150},
            {"name": "Saus", "amount_grams": 50},
        ]
        result = generator._generate_rule_based(recipes, products)
        assert result == "kjøttkaker med ris og saus"

    def test_more_than_three_components(self, generator):
        """Test with more than three components."""
        recipes = [{"name": "Kjøttkaker", "amount_grams": 200}]
        products = [
            {"name": "Ris", "amount_grams": 150},
            {"name": "Saus", "amount_grams": 50},
            {"name": "Salat", "amount_grams": 30},
        ]
        result = generator._generate_rule_based(recipes, products)
        assert result == "kjøttkaker med 3 komponenter"

    def test_empty_components(self, generator):
        """Test with empty components."""
        result = generator._generate_rule_based([], [])
        assert result == "Sammensatt rett"

    def test_sorted_by_amount(self, generator):
        """Test that main dish is determined by largest amount."""
        recipes = [{"name": "Saus", "amount_grams": 50}]
        products = [{"name": "Kjøttkaker", "amount_grams": 200}]
        result = generator._generate_rule_based(recipes, products)
        # Kjøttkaker should come first as it has larger amount
        assert result == "kjøttkaker med saus"

    def test_lowercase_output(self, generator):
        """Test that output is lowercase."""
        recipes = [{"name": "KJØTTKAKER", "amount_grams": 200}]
        products = [{"name": "RIS", "amount_grams": 150}]
        result = generator._generate_rule_based(recipes, products)
        assert result == "kjøttkaker med ris"

    def test_norwegian_characters(self, generator):
        """Test handling of Norwegian characters."""
        recipes = [{"name": "Fiskegryte", "amount_grams": 200}]
        products = [{"name": "Grønnsaker", "amount_grams": 100}]
        result = generator._generate_rule_based(recipes, products)
        assert "ø" in result

    def test_mixed_recipes_and_products(self, generator):
        """Test with mix of recipes and products, sorted by amount."""
        recipes = [
            {"name": "Pasta", "amount_grams": 200},
            {"name": "Kjøttsaus", "amount_grams": 150},
        ]
        products = [
            {"name": "Parmesan", "amount_grams": 20},
        ]
        result = generator._generate_rule_based(recipes, products)
        assert result == "pasta med kjøttsaus og parmesan"


class TestGetDishNameGenerator:
    """Tests for get_dish_name_generator singleton function."""

    def test_returns_dish_name_generator(self):
        """Test that function returns DishNameGenerator instance."""
        gen = get_dish_name_generator()
        assert isinstance(gen, DishNameGenerator)

    def test_returns_singleton(self):
        """Test that function returns same instance."""
        gen1 = get_dish_name_generator()
        gen2 = get_dish_name_generator()
        assert gen1 is gen2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
