"""Tests for Produkter (Products) API endpoints.

Tests cover:
- GET /produkter/ - List products with pagination, filtering, and search
- GET /produkter/{id} - Get single product
- POST /produkter/by-ids - Get multiple products by IDs
- POST /produkter/ - Create product
- PUT /produkter/{id} - Update product
- DELETE /produkter/{id} - Soft delete product
"""
import pytest

from tests.api.conftest import skip_if_auth_bypass
from httpx import AsyncClient

from tests.fixtures import (
    TEST_PRODUKT_1,
    TEST_PRODUKT_2,
    TEST_PRODUKT_3,
    TEST_PRODUKT_UTGATT,
    TEST_KATEGORI_1,
    TEST_LEVERANDOR_1,
)


class TestProdukterList:
    """Tests for GET /produkter/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_produkter_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/produkter/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_produkter_default_returns_active(
        self, authenticated_client: AsyncClient
    ):
        """Test that default returns all products (no aktiv filter)."""
        response = await authenticated_client.get("/api/v1/produkter/")
        assert response.status_code == 200

        data = response.json()
        produktids = [p["produktid"] for p in data["items"]]
        # Should have active products
        assert TEST_PRODUKT_1["produktid"] in produktids
        assert TEST_PRODUKT_2["produktid"] in produktids

    @pytest.mark.asyncio
    async def test_list_produkter_filter_aktiv_true(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering for active products only."""
        response = await authenticated_client.get("/api/v1/produkter/?aktiv=true")
        assert response.status_code == 200

        data = response.json()
        produktids = [p["produktid"] for p in data["items"]]
        # Should have active products but not utgatt
        assert TEST_PRODUKT_1["produktid"] in produktids
        assert TEST_PRODUKT_UTGATT["produktid"] not in produktids

    @pytest.mark.asyncio
    async def test_list_produkter_filter_aktiv_false(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering for inactive (utgatt) products."""
        response = await authenticated_client.get("/api/v1/produkter/?aktiv=false")
        assert response.status_code == 200

        data = response.json()
        produktids = [p["produktid"] for p in data["items"]]
        # Should only have utgatt products
        assert TEST_PRODUKT_UTGATT["produktid"] in produktids
        assert TEST_PRODUKT_1["produktid"] not in produktids

    @pytest.mark.asyncio
    async def test_list_produkter_filter_by_kategori(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by category ID."""
        response = await authenticated_client.get(
            f"/api/v1/produkter/?kategori={TEST_KATEGORI_1['kategoriid']}"
        )
        assert response.status_code == 200

        data = response.json()
        # All results should be in that category
        for produkt in data["items"]:
            assert produkt["kategoriid"] == TEST_KATEGORI_1["kategoriid"]

    @pytest.mark.asyncio
    async def test_list_produkter_filter_by_leverandor(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by leverandor IDs."""
        response = await authenticated_client.get(
            f"/api/v1/produkter/?leverandor_ids={TEST_LEVERANDOR_1['leverandorid']}"
        )
        assert response.status_code == 200

        data = response.json()
        # All results should be from that leverandor
        for produkt in data["items"]:
            assert produkt["levrandorid"] == TEST_LEVERANDOR_1["leverandorid"]

    @pytest.mark.asyncio
    async def test_list_produkter_filter_has_gtin_true(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering for products with GTIN (ean_kode)."""
        response = await authenticated_client.get("/api/v1/produkter/?has_gtin=true")
        assert response.status_code == 200

        data = response.json()
        # All results should have ean_kode
        for produkt in data["items"]:
            assert produkt["ean_kode"] is not None and produkt["ean_kode"] != ""

    @pytest.mark.asyncio
    async def test_list_produkter_filter_has_gtin_false(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering for products without GTIN (ean_kode)."""
        response = await authenticated_client.get("/api/v1/produkter/?has_gtin=false")
        assert response.status_code == 200

        data = response.json()
        produktids = [p["produktid"] for p in data["items"]]
        # Should have products without ean_kode (TEST_PRODUKT_3)
        assert TEST_PRODUKT_3["produktid"] in produktids

    @pytest.mark.asyncio
    async def test_list_produkter_filter_rett_komponent(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by rett_komponent status."""
        response = await authenticated_client.get(
            "/api/v1/produkter/?rett_komponent=true"
        )
        assert response.status_code == 200

        data = response.json()
        produktids = [p["produktid"] for p in data["items"]]
        # Should have rett_komponent products
        assert TEST_PRODUKT_2["produktid"] in produktids
        assert TEST_PRODUKT_3["produktid"] in produktids

    @pytest.mark.asyncio
    async def test_list_produkter_pagination(self, authenticated_client: AsyncClient):
        """Test pagination parameters."""
        response = await authenticated_client.get("/api/v1/produkter/?limit=1&skip=0")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 1
        assert data["page_size"] == 1

    @pytest.mark.asyncio
    async def test_list_produkter_search_by_name(
        self, authenticated_client: AsyncClient
    ):
        """Test search functionality by name."""
        response = await authenticated_client.get("/api/v1/produkter/?search=Melk")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1
        # All results should match search
        for produkt in data["items"]:
            assert "melk" in produkt["produktnavn"].lower()

    @pytest.mark.asyncio
    async def test_list_produkter_search_by_ean(
        self, authenticated_client: AsyncClient
    ):
        """Test search by EAN code."""
        response = await authenticated_client.get(
            f"/api/v1/produkter/?search={TEST_PRODUKT_1['ean_kode']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1
        produktids = [p["produktid"] for p in data["items"]]
        assert TEST_PRODUKT_1["produktid"] in produktids

    @pytest.mark.asyncio
    async def test_list_produkter_sort_by_name_asc(
        self, authenticated_client: AsyncClient
    ):
        """Test sorting by name ascending."""
        response = await authenticated_client.get(
            "/api/v1/produkter/?sort_by=produktnavn&sort_order=asc"
        )
        assert response.status_code == 200

        data = response.json()
        if len(data["items"]) > 1:
            names = [p["produktnavn"] for p in data["items"]]
            assert names == sorted(names)

    @pytest.mark.asyncio
    async def test_list_produkter_sort_by_name_desc(
        self, authenticated_client: AsyncClient
    ):
        """Test sorting by name descending."""
        response = await authenticated_client.get(
            "/api/v1/produkter/?sort_by=produktnavn&sort_order=desc"
        )
        assert response.status_code == 200

        data = response.json()
        if len(data["items"]) > 1:
            names = [p["produktnavn"] for p in data["items"]]
            assert names == sorted(names, reverse=True)

    @pytest.mark.asyncio
    async def test_list_produkter_with_stats(self, authenticated_client: AsyncClient):
        """Test that stats are returned when requested."""
        response = await authenticated_client.get(
            "/api/v1/produkter/?include_stats=true"
        )
        assert response.status_code == 200

        data = response.json()
        assert "stats" in data
        assert data["stats"] is not None
        assert "total" in data["stats"]
        assert "with_gtin" in data["stats"]
        assert "without_gtin" in data["stats"]

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_produkter_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/produkter/")
        assert response.status_code == 401


class TestProdukterGet:
    """Tests for GET /produkter/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_produkt_by_id(self, authenticated_client: AsyncClient):
        """Test getting a product by ID."""
        response = await authenticated_client.get(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["produktid"] == TEST_PRODUKT_1["produktid"]
        assert data["produktnavn"] == TEST_PRODUKT_1["produktnavn"]
        assert data["ean_kode"] == TEST_PRODUKT_1["ean_kode"]

    @pytest.mark.asyncio
    async def test_get_produkt_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent product."""
        response = await authenticated_client.get("/api/v1/produkter/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_produkt_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}")
        assert response.status_code == 401


class TestProdukterByIds:
    """Tests for POST /produkter/by-ids endpoint."""

    @pytest.mark.asyncio
    async def test_get_produkter_by_ids(self, authenticated_client: AsyncClient):
        """Test getting multiple products by IDs."""
        produkt_ids = [TEST_PRODUKT_1["produktid"], TEST_PRODUKT_2["produktid"]]
        response = await authenticated_client.post(
            "/api/v1/produkter/by-ids", json=produkt_ids
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 2
        returned_ids = [p["produktid"] for p in data]
        assert TEST_PRODUKT_1["produktid"] in returned_ids
        assert TEST_PRODUKT_2["produktid"] in returned_ids

    @pytest.mark.asyncio
    async def test_get_produkter_by_ids_empty_list(
        self, authenticated_client: AsyncClient
    ):
        """Test with empty list returns empty array."""
        response = await authenticated_client.post("/api/v1/produkter/by-ids", json=[])
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_get_produkter_by_ids_partial_match(
        self, authenticated_client: AsyncClient
    ):
        """Test with some non-existent IDs returns only found products."""
        produkt_ids = [TEST_PRODUKT_1["produktid"], 99999]
        response = await authenticated_client.post(
            "/api/v1/produkter/by-ids", json=produkt_ids
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["produktid"] == TEST_PRODUKT_1["produktid"]

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_produkter_by_ids_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/produkter/by-ids", json=[TEST_PRODUKT_1["produktid"]]
        )
        assert response.status_code == 401


class TestProdukterCreate:
    """Tests for POST /produkter/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_produkt(self, authenticated_client: AsyncClient):
        """Test creating a new product."""
        new_produkt = {
            "produktnavn": "Ny Test Produkt",
            "pris": 99.00,
            "kategoriid": TEST_KATEGORI_1["kategoriid"],
            "levrandorid": TEST_LEVERANDOR_1["leverandorid"],
            "webshop": True,
        }

        response = await authenticated_client.post(
            "/api/v1/produkter/", json=new_produkt
        )
        assert response.status_code == 200

        data = response.json()
        assert data["produktnavn"] == new_produkt["produktnavn"]
        assert data["pris"] == new_produkt["pris"]
        assert "produktid" in data

    @pytest.mark.asyncio
    async def test_create_produkt_minimal_fields(
        self, authenticated_client: AsyncClient
    ):
        """Test creating product with minimal required fields."""
        new_produkt = {"produktnavn": "Minimal Produkt"}

        response = await authenticated_client.post(
            "/api/v1/produkter/", json=new_produkt
        )
        assert response.status_code == 200

        data = response.json()
        assert data["produktnavn"] == new_produkt["produktnavn"]

    @pytest.mark.asyncio
    async def test_create_produkt_requires_name(
        self, authenticated_client: AsyncClient
    ):
        """Test that produktnavn is required."""
        new_produkt = {"pris": 100.00}

        response = await authenticated_client.post(
            "/api/v1/produkter/", json=new_produkt
        )
        assert response.status_code == 422  # Validation error

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_produkt_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/produkter/", json={"produktnavn": "Test"}
        )
        assert response.status_code == 401


class TestProdukterUpdate:
    """Tests for PUT /produkter/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_produkt(self, authenticated_client: AsyncClient):
        """Test updating a product."""
        update_data = {
            "produktnavn": "Oppdatert Produktnavn",
            "pris": 199.00,
        }

        response = await authenticated_client.put(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}", json=update_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["produktnavn"] == update_data["produktnavn"]
        assert data["pris"] == update_data["pris"]

    @pytest.mark.asyncio
    async def test_update_produkt_partial(self, authenticated_client: AsyncClient):
        """Test partial update (only some fields)."""
        update_data = {"pris": 299.00}

        response = await authenticated_client.put(
            f"/api/v1/produkter/{TEST_PRODUKT_2['produktid']}", json=update_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["pris"] == update_data["pris"]
        # Other fields should be unchanged
        assert data["produktnavn"] == TEST_PRODUKT_2["produktnavn"]

    @pytest.mark.asyncio
    async def test_update_produkt_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent product."""
        response = await authenticated_client.put(
            "/api/v1/produkter/99999", json={"produktnavn": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_produkt_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}",
            json={"produktnavn": "Test"},
        )
        assert response.status_code == 401


class TestProdukterDelete:
    """Tests for DELETE /produkter/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_produkt_soft_deletes(
        self, authenticated_client: AsyncClient
    ):
        """Test that delete performs soft delete (sets utgatt=True)."""
        # First verify product exists and is active
        get_response = await authenticated_client.get(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}"
        )
        assert get_response.status_code == 200

        # Delete product
        response = await authenticated_client.delete(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}"
        )
        assert response.status_code == 200
        assert "slettet" in response.json()["message"].lower()

        # Product should still exist but be utgatt
        get_response = await authenticated_client.get(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}"
        )
        assert get_response.status_code == 200
        assert get_response.json()["utgatt"] is True

    @pytest.mark.asyncio
    async def test_delete_produkt_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent product."""
        response = await authenticated_client.delete("/api/v1/produkter/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_produkt_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(
            f"/api/v1/produkter/{TEST_PRODUKT_1['produktid']}"
        )
        assert response.status_code == 401
