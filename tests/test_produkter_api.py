"""Test produkter API endpoints with GTIN, allergen and nutrition data."""
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.infrastructure.database.session import AsyncSessionLocal
from sqlalchemy import select, text
from app.models.produkter import Produkter as ProdukterModel
from app.models.matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient


class TestProdukterAPI:
    """Test suite for produkter API endpoints."""

    @pytest.fixture
    async def async_client(self):
        """Create an async HTTP client for testing."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    @pytest.fixture
    async def sample_produkt(self):
        """Create a sample produkt for testing."""
        async with AsyncSessionLocal() as db:
            # Get first active produkt
            result = await db.execute(
                select(ProdukterModel)
                .where(ProdukterModel.utgatt == False)
                .limit(1)
            )
            produkt = result.scalar_one_or_none()
            if produkt:
                yield produkt
            else:
                pytest.skip("No active produkter found in database")

    @pytest.fixture
    async def sample_matinfo_product(self):
        """Get a sample Matinfo product with allergens and nutrients."""
        async with AsyncSessionLocal() as db:
            # Find a Matinfo product that has both allergens and nutrients
            result = await db.execute(
                text("""
                    SELECT DISTINCT mp.id
                    FROM matinfo_products mp
                    INNER JOIN matinfo_allergens ma ON mp.id = ma.product_id
                    INNER JOIN matinfo_nutrients mn ON mp.id = mn.product_id
                    LIMIT 1
                """)
            )
            product_id = result.scalar_one_or_none()

            if not product_id:
                pytest.skip("No Matinfo products with allergens and nutrients found")

            # Fetch full product data
            result = await db.execute(
                select(MatinfoProduct).where(MatinfoMatinfoProduct.id == product_id)
            )
            product = result.scalar_one()
            yield product

    @pytest.mark.asyncio
    async def test_get_produkter_list(self, async_client):
        """Test GET /produkter endpoint."""
        response = await async_client.get("/api/v1/produkter", follow_redirects=True)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "produktid" in data[0]
            assert "produktnavn" in data[0]

    @pytest.mark.asyncio
    async def test_matinfo_search(self, async_client):
        """Test Matinfo search with allergen and nutrition data."""
        response = await async_client.get(
            "/api/v1/produkter/matinfo/search?query=melk&limit=5",
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            first_result = data[0]
            # Verify basic fields
            assert "id" in first_result
            assert "gtin" in first_result
            assert "name" in first_result
            assert "similarity_score" in first_result

            # Verify allergen data structure
            assert "allergens" in first_result
            assert isinstance(first_result["allergens"], list)
            if len(first_result["allergens"]) > 0:
                allergen = first_result["allergens"][0]
                assert "code" in allergen
                assert "name" in allergen
                assert "level" in allergen
                assert allergen["level"] in ["FREE_FROM", "CONTAINS", "MAY_CONTAIN"]

            # Verify nutrition data structure
            assert "nutrients" in first_result
            assert isinstance(first_result["nutrients"], list)
            if len(first_result["nutrients"]) > 0:
                nutrient = first_result["nutrients"][0]
                assert "code" in nutrient
                assert "name" in nutrient
                assert "measurement" in nutrient

    @pytest.mark.asyncio
    async def test_matinfo_suggestions(self, async_client, sample_produkt):
        """Test Matinfo suggestions endpoint."""
        response = await async_client.get(
            f"/api/v1/produkter/{sample_produkt.produktid}/matinfo-suggestions?limit=5",
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Verify response structure includes allergens and nutrients
        if len(data) > 0:
            first_result = data[0]
            assert "allergens" in first_result
            assert "nutrients" in first_result
            assert isinstance(first_result["allergens"], list)
            assert isinstance(first_result["nutrients"], list)

    @pytest.mark.asyncio
    async def test_update_gtin(self, async_client, sample_produkt, sample_matinfo_product):
        """Test GTIN update endpoint."""
        # Update with valid GTIN
        response = await async_client.patch(
            f"/api/v1/produkter/{sample_produkt.produktid}/gtin",
            json={"gtin": sample_matinfo_product.gtin},
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "produktid" in data
        assert "produktnavn" in data
        assert "old_gtin" in data
        assert "new_gtin" in data
        assert "matinfo_match" in data
        assert data["new_gtin"] == sample_matinfo_product.gtin

        # Verify Matinfo match
        if data["matinfo_match"]:
            assert "found" in data["matinfo_match"]
            if data["matinfo_match"]["found"]:
                assert "product_name" in data["matinfo_match"]
                assert "brand" in data["matinfo_match"]

    @pytest.mark.asyncio
    async def test_update_gtin_invalid_length(self, async_client, sample_produkt):
        """Test GTIN validation with invalid length."""
        response = await async_client.patch(
            f"/api/v1/produkter/{sample_produkt.produktid}/gtin",
            json={"gtin": "12345"},  # Invalid length
            follow_redirects=True
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "lengde" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_allergen_data_quality(self, sample_matinfo_product):
        """Verify allergen data quality in database."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(MatinfoAllergen).where(
                    MatinfoAllergen.product_id == sample_matinfo_product.id
                )
            )
            allergens = result.scalars().all()

            assert len(allergens) > 0, "Product should have allergen data"

            for allergen in allergens:
                assert allergen.code is not None
                assert allergen.name is not None
                assert allergen.level in ["FREE_FROM", "CONTAINS", "MAY_CONTAIN"]
                assert allergen.gtin == sample_matinfo_product.gtin

    @pytest.mark.asyncio
    async def test_nutrition_data_quality(self, sample_matinfo_product):
        """Verify nutrition data quality in database."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(MatinfoNutrient).where(
                    MatinfoNutrient.product_id == sample_matinfo_product.id
                )
            )
            nutrients = result.scalars().all()

            assert len(nutrients) > 0, "Product should have nutrition data"

            # Check for essential nutrients
            nutrient_codes = [n.code for n in nutrients]
            essential_nutrients = ["ENERC_KCAL", "FAT", "CHO-", "PROCNT"]

            found_essential = [n for n in essential_nutrients if n in nutrient_codes]
            assert len(found_essential) >= 2, f"Should have at least 2 essential nutrients, found: {found_essential}"

            for nutrient in nutrients:
                assert nutrient.code is not None
                assert nutrient.name is not None
                assert nutrient.gtin == sample_matinfo_product.gtin


def test_sync_runner():
    """Synchronous test runner for pytest."""
    async def run_tests():
        test_suite = TestProdukterAPI()

        # Run tests
        print("\n" + "="*60)
        print("TESTING PRODUKTER API ENDPOINTS")
        print("="*60)

        try:
            # Test basic list
            print("\n1. Testing produkter list...")
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                await test_suite.test_get_produkter_list(client)
            print("   ✓ Produkter list endpoint works")

            # Test Matinfo search
            print("\n2. Testing Matinfo search with allergen/nutrition data...")
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                await test_suite.test_matinfo_search(client)
            print("   ✓ Matinfo search returns allergen and nutrition data")

            # Test data quality
            print("\n3. Testing data quality...")
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("""
                        SELECT DISTINCT mp.id
                        FROM matinfo_products mp
                        INNER JOIN matinfo_allergens ma ON mp.id = ma.product_id
                        INNER JOIN matinfo_nutrients mn ON mp.id = mn.product_id
                        LIMIT 1
                    """)
                )
                product_id = result.scalar_one_or_none()

                if product_id:
                    result = await db.execute(
                        select(MatinfoProduct).where(MatinfoMatinfoProduct.id == product_id)
                    )
                    product = result.scalar_one()

                    await test_suite.test_allergen_data_quality(product)
                    await test_suite.test_nutrition_data_quality(product)
                    print("   ✓ Allergen and nutrition data quality verified")
                else:
                    print("   ⚠ No products with both allergens and nutrients found")

            print("\n" + "="*60)
            print("ALL TESTS PASSED ✓")
            print("="*60)

        except Exception as e:
            print(f"\n✗ TEST FAILED: {e}")
            raise

    asyncio.run(run_tests())


if __name__ == "__main__":
    test_sync_runner()
