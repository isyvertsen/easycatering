"""Unit tests for EnhancedProductSearchService."""
import pytest
from unittest.mock import MagicMock, patch
from app.services.enhanced_product_search import EnhancedProductSearchService


class MockNutrient:
    """Mock nutrient object."""
    def __init__(self, code: str, measurement: float = None):
        self.code = code
        self.measurement = measurement


class MockProduct:
    """Mock product object."""
    def __init__(
        self,
        name: str = None,
        brandname: str = None,
        producername: str = None,
        gtin: str = None,
        nutrients: list = None,
        allergens: list = None,
    ):
        self.name = name
        self.brandname = brandname
        self.producername = producername
        self.gtin = gtin
        self.nutrients = nutrients or []
        self.allergens = allergens or []


class TestCalculateRelevanceScore:
    """Tests for _calculate_relevance_score method."""

    @pytest.fixture
    def service(self):
        """Create service with mocked Redis."""
        with patch.object(EnhancedProductSearchService, 'init_redis'):
            svc = EnhancedProductSearchService()
            svc.redis_client = None
            return svc

    def test_exact_name_match(self, service):
        """Test exact name match gets high score."""
        product = MockProduct(name="Melk")
        score = service._calculate_relevance_score("melk", product)
        assert score >= 0.9

    def test_partial_name_match(self, service):
        """Test partial name match."""
        product = MockProduct(name="Helmelk 3.5%")
        score = service._calculate_relevance_score("melk", product)
        assert 0.3 <= score <= 1.0

    def test_brand_match_lower_weight(self, service):
        """Test brand match has lower weight than name."""
        product_name = MockProduct(name="Tine Melk")
        product_brand = MockProduct(name="Produkt", brandname="Tine Melk")

        score_name = service._calculate_relevance_score("tine melk", product_name)
        score_brand = service._calculate_relevance_score("tine melk", product_brand)

        assert score_name >= score_brand

    def test_producer_match_lowest_weight(self, service):
        """Test producer match has lowest weight."""
        product = MockProduct(producername="Tine SA")
        score = service._calculate_relevance_score("tine", product)
        assert 0.0 <= score <= 0.5

    def test_gtin_prefix_match(self, service):
        """Test GTIN prefix match."""
        product = MockProduct(gtin="7038010000")
        score = service._calculate_relevance_score("7038", product)
        assert score >= 0.7

    def test_gtin_contains_match(self, service):
        """Test GTIN contains match."""
        product = MockProduct(gtin="7038010000")
        score = service._calculate_relevance_score("801", product)
        assert 0.3 <= score <= 0.5

    def test_bonus_for_nutrients(self, service):
        """Test bonus score for having nutrients."""
        product_with = MockProduct(name="Melk", nutrients=[MockNutrient("ENERC_KJ", 100)])
        product_without = MockProduct(name="Melk", nutrients=[])

        score_with = service._calculate_relevance_score("melk", product_with)
        score_without = service._calculate_relevance_score("melk", product_without)

        assert score_with > score_without

    def test_bonus_for_allergens(self, service):
        """Test bonus score for having allergens."""
        mock_allergen = MagicMock()
        product_with = MockProduct(name="Melk", allergens=[mock_allergen])
        product_without = MockProduct(name="Melk", allergens=[])

        score_with = service._calculate_relevance_score("melk", product_with)
        score_without = service._calculate_relevance_score("melk", product_without)

        assert score_with > score_without

    def test_no_match_returns_zero(self, service):
        """Test no match returns zero."""
        product = MockProduct()
        score = service._calculate_relevance_score("something", product)
        assert score == 0.0

    def test_score_normalized_to_0_1(self, service):
        """Test that scores are normalized between 0 and 1."""
        product = MockProduct(
            name="Tine Helmelk 3.5%",
            brandname="Tine",
            nutrients=[MockNutrient("ENERC_KJ", 100)],
            allergens=[MagicMock()],
        )
        score = service._calculate_relevance_score("tine melk", product)
        assert 0.0 <= score <= 1.0


class TestIsNutritionComplete:
    """Tests for _is_nutrition_complete method."""

    @pytest.fixture
    def service(self):
        """Create service with mocked Redis."""
        with patch.object(EnhancedProductSearchService, 'init_redis'):
            svc = EnhancedProductSearchService()
            svc.redis_client = None
            return svc

    def test_complete_nutrition(self, service):
        """Test with all mandatory nutrients present."""
        nutrients = [
            MockNutrient("ENERC_KJ", 100),
            MockNutrient("ENERC_KCAL", 24),
            MockNutrient("PROCNT", 3.5),
            MockNutrient("FAT", 1.5),
            MockNutrient("CHO-", 4.8),
            MockNutrient("NACL", 0.1),
        ]
        assert service._is_nutrition_complete(nutrients) is True

    def test_incomplete_nutrition_missing_one(self, service):
        """Test with one mandatory nutrient missing."""
        nutrients = [
            MockNutrient("ENERC_KJ", 100),
            MockNutrient("ENERC_KCAL", 24),
            MockNutrient("PROCNT", 3.5),
            MockNutrient("FAT", 1.5),
            MockNutrient("CHO-", 4.8),
            # Missing NACL
        ]
        assert service._is_nutrition_complete(nutrients) is False

    def test_empty_nutrients(self, service):
        """Test with no nutrients."""
        assert service._is_nutrition_complete([]) is False

    def test_none_nutrients(self, service):
        """Test with None nutrients."""
        assert service._is_nutrition_complete(None) is False

    def test_nutrients_without_measurements(self, service):
        """Test nutrients with None measurements are not counted."""
        nutrients = [
            MockNutrient("ENERC_KJ", None),
            MockNutrient("ENERC_KCAL", None),
            MockNutrient("PROCNT", None),
            MockNutrient("FAT", None),
            MockNutrient("CHO-", None),
            MockNutrient("NACL", None),
        ]
        assert service._is_nutrition_complete(nutrients) is False


class TestExtractUnit:
    """Tests for _extract_unit method."""

    @pytest.fixture
    def service(self):
        """Create service with mocked Redis."""
        with patch.object(EnhancedProductSearchService, 'init_redis'):
            svc = EnhancedProductSearchService()
            svc.redis_client = None
            return svc

    def test_extract_kg(self, service):
        """Test extracting kg unit."""
        assert service._extract_unit("1 kg") == "kg"
        assert service._extract_unit("1kg") == "kg"
        assert service._extract_unit("1.5 KG") == "kg"

    def test_extract_g(self, service):
        """Test extracting g unit."""
        assert service._extract_unit("500g") == "g"
        assert service._extract_unit("500 g") == "g"
        assert service._extract_unit("500 grm") == "g"

    def test_extract_l(self, service):
        """Test extracting liter unit."""
        assert service._extract_unit("1 l") == "l"
        assert service._extract_unit("1 liter") == "l"
        assert service._extract_unit("1L") == "l"

    def test_extract_ml(self, service):
        """Test extracting ml unit."""
        assert service._extract_unit("500ml") == "ml"
        assert service._extract_unit("500 ml") == "ml"

    def test_extract_stk(self, service):
        """Test extracting stk unit."""
        assert service._extract_unit("6 stk") == "stk"
        assert service._extract_unit("6stk") == "stk"

    def test_default_to_stk(self, service):
        """Test default to stk for unknown."""
        assert service._extract_unit("unknown") == "stk"
        assert service._extract_unit("") == "stk"

    def test_none_input(self, service):
        """Test None input returns stk."""
        assert service._extract_unit(None) == "stk"


class TestMapAllergenLevel:
    """Tests for _map_allergen_level method."""

    @pytest.fixture
    def service(self):
        """Create service with mocked Redis."""
        with patch.object(EnhancedProductSearchService, 'init_redis'):
            svc = EnhancedProductSearchService()
            svc.redis_client = None
            return svc

    def test_free_from(self, service):
        """Test level 0 maps to FREE_FROM."""
        assert service._map_allergen_level(0) == "FREE_FROM"

    def test_contains(self, service):
        """Test level 1 maps to CONTAINS."""
        assert service._map_allergen_level(1) == "CONTAINS"

    def test_may_contain(self, service):
        """Test level 2 maps to MAY_CONTAIN."""
        assert service._map_allergen_level(2) == "MAY_CONTAIN"

    def test_unknown_level(self, service):
        """Test unknown level maps to UNKNOWN."""
        assert service._map_allergen_level(99) == "UNKNOWN"

    def test_none_level(self, service):
        """Test None level maps to UNKNOWN."""
        assert service._map_allergen_level(None) == "UNKNOWN"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
