"""Unit tests to verify test fixtures are properly configured."""
import pytest
from tests.fixtures import (
    TEST_USER,
    TEST_ADMIN,
    TEST_KUNDE_1,
    TEST_KUNDE_2,
    TEST_LEVERANDOR_1,
    TEST_KATEGORI_1,
    TEST_PRODUKT_1,
    TEST_ORDRE_1,
    get_test_users,
    get_test_customers,
    get_test_suppliers,
    get_test_categories,
    get_test_products,
    get_test_orders,
)


class TestFixtureData:
    """Test that fixture data is properly structured."""

    def test_user_fixtures_have_required_fields(self):
        """Test that user fixtures have all required fields."""
        required_fields = ["id", "email", "full_name", "hashed_password", "rolle", "is_active"]
        for field in required_fields:
            assert field in TEST_USER, f"Missing field: {field}"
            assert field in TEST_ADMIN, f"Missing field: {field}"

    def test_user_ids_are_unique(self):
        """Test that all user IDs are unique and in test range."""
        users = get_test_users()
        ids = [u["id"] for u in users]
        assert len(ids) == len(set(ids)), "Duplicate user IDs found"
        assert all(id >= 9000 for id in ids), "User IDs should be >= 9000"

    def test_kunde_fixtures_have_required_fields(self):
        """Test that customer fixtures have required fields."""
        required_fields = ["kundeid", "kundenavn", "postnr"]
        for field in required_fields:
            assert field in TEST_KUNDE_1, f"Missing field: {field}"
            assert field in TEST_KUNDE_2, f"Missing field: {field}"

    def test_kunde_ids_are_unique(self):
        """Test that all customer IDs are unique and in test range."""
        customers = get_test_customers()
        ids = [c["kundeid"] for c in customers]
        assert len(ids) == len(set(ids)), "Duplicate customer IDs found"
        assert all(id >= 9000 for id in ids), "Customer IDs should be >= 9000"

    def test_supplier_fixtures_have_required_fields(self):
        """Test that supplier fixtures have required fields."""
        required_fields = ["leverandorid", "leverandornavn"]
        for field in required_fields:
            assert field in TEST_LEVERANDOR_1, f"Missing field: {field}"

    def test_supplier_ids_are_unique(self):
        """Test that all supplier IDs are unique and in test range."""
        suppliers = get_test_suppliers()
        ids = [s["leverandorid"] for s in suppliers]
        assert len(ids) == len(set(ids)), "Duplicate supplier IDs found"
        assert all(id >= 9000 for id in ids), "Supplier IDs should be >= 9000"

    def test_category_fixtures_have_required_fields(self):
        """Test that category fixtures have required fields."""
        required_fields = ["kategoriid", "kategori"]
        for field in required_fields:
            assert field in TEST_KATEGORI_1, f"Missing field: {field}"

    def test_category_ids_are_unique(self):
        """Test that all category IDs are unique and in test range."""
        categories = get_test_categories()
        ids = [c["kategoriid"] for c in categories]
        assert len(ids) == len(set(ids)), "Duplicate category IDs found"
        assert all(id >= 9000 for id in ids), "Category IDs should be >= 9000"

    def test_product_fixtures_have_required_fields(self):
        """Test that product fixtures have required fields."""
        required_fields = ["produktid", "produktnavn", "levrandorid", "kategoriid"]
        for field in required_fields:
            assert field in TEST_PRODUKT_1, f"Missing field: {field}"

    def test_product_ids_are_unique(self):
        """Test that all product IDs are unique and in test range."""
        products = get_test_products()
        ids = [p["produktid"] for p in products]
        assert len(ids) == len(set(ids)), "Duplicate product IDs found"
        assert all(id >= 9000 for id in ids), "Product IDs should be >= 9000"

    def test_order_fixtures_have_required_fields(self):
        """Test that order fixtures have required fields."""
        required_fields = ["ordreid", "kundeid", "kundenavn", "ordredato"]
        for field in required_fields:
            assert field in TEST_ORDRE_1, f"Missing field: {field}"

    def test_order_ids_are_unique(self):
        """Test that all order IDs are unique and in test range."""
        orders = get_test_orders()
        ids = [o["ordreid"] for o in orders]
        assert len(ids) == len(set(ids)), "Duplicate order IDs found"
        assert all(id >= 9000 for id in ids), "Order IDs should be >= 9000"

    def test_foreign_key_references_are_valid(self):
        """Test that foreign key references point to valid test data."""
        customer_ids = {c["kundeid"] for c in get_test_customers()}
        supplier_ids = {s["leverandorid"] for s in get_test_suppliers()}
        category_ids = {c["kategoriid"] for c in get_test_categories()}

        # Check product foreign keys
        for product in get_test_products():
            if product["levrandorid"]:
                assert product["levrandorid"] in supplier_ids, \
                    f"Product {product['produktid']} references invalid supplier"
            if product["kategoriid"]:
                assert product["kategoriid"] in category_ids, \
                    f"Product {product['produktid']} references invalid category"

        # Check order foreign keys
        for order in get_test_orders():
            if order["kundeid"]:
                assert order["kundeid"] in customer_ids, \
                    f"Order {order['ordreid']} references invalid customer"
