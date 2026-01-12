"""Unit tests for NutritionCalculator service."""
import pytest
from unittest.mock import MagicMock, AsyncMock
from app.services.nutrition_calculator import NutritionCalculator


class MockSession:
    """Mock async database session."""
    pass


class TestConvertToGrams:
    """Tests for _convert_to_grams method."""

    @pytest.fixture
    def calculator(self):
        """Create calculator with mock session."""
        mock_session = MockSession()
        return NutritionCalculator(mock_session)

    def test_convert_grams(self, calculator):
        """Test conversion from grams (no conversion needed)."""
        result = calculator._convert_to_grams(100, "g")
        assert result == 100.0

    def test_convert_grams_variant(self, calculator):
        """Test conversion from 'g- gr' variant."""
        result = calculator._convert_to_grams(100, "g- gr")
        assert result == 100.0

    def test_convert_kilograms(self, calculator):
        """Test conversion from kilograms."""
        result = calculator._convert_to_grams(1, "kg")
        assert result == 1000.0

    def test_convert_milligrams(self, calculator):
        """Test conversion from milligrams."""
        result = calculator._convert_to_grams(1000, "mg")
        assert result == 1.0

    def test_convert_liters(self, calculator):
        """Test conversion from liters (assumes water density)."""
        result = calculator._convert_to_grams(1, "l")
        assert result == 1000.0

    def test_convert_deciliters(self, calculator):
        """Test conversion from deciliters."""
        result = calculator._convert_to_grams(1, "dl")
        assert result == 100.0

    def test_convert_centiliters(self, calculator):
        """Test conversion from centiliters."""
        result = calculator._convert_to_grams(1, "cl")
        assert result == 10.0

    def test_convert_milliliters(self, calculator):
        """Test conversion from milliliters."""
        result = calculator._convert_to_grams(100, "ml")
        assert result == 100.0

    def test_convert_tablespoon(self, calculator):
        """Test conversion from tablespoon (ss)."""
        result = calculator._convert_to_grams(1, "ss")
        assert result == 15.0

    def test_convert_teaspoon(self, calculator):
        """Test conversion from teaspoon (ts)."""
        result = calculator._convert_to_grams(1, "ts")
        assert result == 5.0

    def test_convert_pinch(self, calculator):
        """Test conversion from pinch (klype)."""
        result = calculator._convert_to_grams(1, "klype")
        assert result == 0.5

    def test_convert_cup(self, calculator):
        """Test conversion from cup (beger)."""
        result = calculator._convert_to_grams(1, "beger")
        assert result == 200.0

    def test_convert_piece(self, calculator):
        """Test conversion from piece (stk)."""
        result = calculator._convert_to_grams(1, "stk")
        assert result == 1.0

    def test_convert_piece_variant(self, calculator):
        """Test conversion from 'stk ut' variant."""
        result = calculator._convert_to_grams(1, "stk ut")
        assert result == 1.0

    def test_convert_unknown_unit_defaults_to_grams(self, calculator):
        """Test that unknown unit defaults to grams."""
        result = calculator._convert_to_grams(100, "unknown")
        assert result == 100.0

    def test_convert_case_insensitive(self, calculator):
        """Test that unit conversion is case insensitive."""
        result = calculator._convert_to_grams(1, "KG")
        assert result == 1000.0

    def test_convert_with_whitespace(self, calculator):
        """Test that whitespace is handled."""
        result = calculator._convert_to_grams(1, "  kg  ")
        assert result == 1000.0


class TestCalculateDataQuality:
    """Tests for _calculate_data_quality method."""

    @pytest.fixture
    def calculator(self):
        """Create calculator with mock session."""
        mock_session = MockSession()
        return NutritionCalculator(mock_session)

    def test_quality_no_ingredients(self, calculator):
        """Test quality calculation with no ingredients."""
        result = calculator._calculate_data_quality([])
        assert result["total_ingredients"] == 0
        assert result["with_nutrition_data"] == 0
        assert result["coverage_percentage"] == 0
        assert result["quality"] == "ingen_data"

    def test_quality_excellent(self, calculator):
        """Test quality calculation with 100% coverage."""
        ingredients = [
            {"nutrition": {"protein": 10}},
            {"nutrition": {"protein": 20}},
            {"nutrition": {"protein": 15}},
        ]
        result = calculator._calculate_data_quality(ingredients)
        assert result["total_ingredients"] == 3
        assert result["with_nutrition_data"] == 3
        assert result["coverage_percentage"] == 100.0
        assert result["quality"] == "utmerket"

    def test_quality_good(self, calculator):
        """Test quality calculation with 75% coverage."""
        ingredients = [
            {"nutrition": {"protein": 10}},
            {"nutrition": {"protein": 20}},
            {"nutrition": {"protein": 15}},
            {"nutrition": None},
        ]
        result = calculator._calculate_data_quality(ingredients)
        assert result["total_ingredients"] == 4
        assert result["with_nutrition_data"] == 3
        assert result["coverage_percentage"] == 75.0
        assert result["quality"] == "god"

    def test_quality_medium(self, calculator):
        """Test quality calculation with 60% coverage."""
        ingredients = [
            {"nutrition": {"protein": 10}},
            {"nutrition": {"protein": 20}},
            {"nutrition": {"protein": 15}},
            {"nutrition": None},
            {"nutrition": None},
        ]
        result = calculator._calculate_data_quality(ingredients)
        assert result["total_ingredients"] == 5
        assert result["with_nutrition_data"] == 3
        assert result["coverage_percentage"] == 60.0
        assert result["quality"] == "middels"

    def test_quality_low(self, calculator):
        """Test quality calculation with 40% coverage."""
        ingredients = [
            {"nutrition": {"protein": 10}},
            {"nutrition": {"protein": 20}},
            {"nutrition": None},
            {"nutrition": None},
            {"nutrition": None},
        ]
        result = calculator._calculate_data_quality(ingredients)
        assert result["total_ingredients"] == 5
        assert result["with_nutrition_data"] == 2
        assert result["coverage_percentage"] == 40.0
        assert result["quality"] == "lav"

    def test_quality_empty_nutrition_dict_not_counted(self, calculator):
        """Test that empty nutrition dict is not counted as having data."""
        ingredients = [
            {"nutrition": {"protein": 10}},
            {"nutrition": {}},
        ]
        result = calculator._calculate_data_quality(ingredients)
        assert result["with_nutrition_data"] == 1

    def test_quality_percentage_rounded(self, calculator):
        """Test that percentage is rounded to 1 decimal."""
        ingredients = [
            {"nutrition": {"protein": 10}},
            {"nutrition": None},
            {"nutrition": None},
        ]
        result = calculator._calculate_data_quality(ingredients)
        assert result["coverage_percentage"] == 33.3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
