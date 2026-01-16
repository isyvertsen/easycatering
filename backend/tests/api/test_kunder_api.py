"""Tests for Kunder (Customers) API endpoints.

Tests cover:
- GET /kunder/ - List customers with pagination, filtering, and search
- GET /kunder/{id} - Get single customer
- POST /kunder/ - Create customer
- PUT /kunder/{id} - Update customer
- DELETE /kunder/{id} - Soft delete customer
"""
import pytest
from httpx import AsyncClient

from tests.api.conftest import skip_if_auth_bypass
from tests.fixtures import (
    TEST_KUNDE_1,
    TEST_KUNDE_2,
    TEST_KUNDE_INACTIVE,
    TEST_KUNDEGRUPPE_1,
)


class TestKunderList:
    """Tests for GET /kunder/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_kunder_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/kunder/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_kunder_default_filters_active(
        self, authenticated_client: AsyncClient
    ):
        """Test that default filter returns only active customers."""
        response = await authenticated_client.get("/api/v1/kunder/")
        assert response.status_code == 200

        data = response.json()
        # Should have active customers but not inactive
        kundeids = [k["kundeid"] for k in data["items"]]
        assert TEST_KUNDE_1["kundeid"] in kundeids
        assert TEST_KUNDE_2["kundeid"] in kundeids
        assert TEST_KUNDE_INACTIVE["kundeid"] not in kundeids

    @pytest.mark.asyncio
    async def test_list_kunder_filter_inactive(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering for inactive customers."""
        response = await authenticated_client.get("/api/v1/kunder/?aktiv=false")
        assert response.status_code == 200

        data = response.json()
        kundeids = [k["kundeid"] for k in data["items"]]
        # Should only have inactive customer
        assert TEST_KUNDE_INACTIVE["kundeid"] in kundeids
        assert TEST_KUNDE_1["kundeid"] not in kundeids

    @pytest.mark.asyncio
    async def test_list_kunder_pagination(
        self, authenticated_client: AsyncClient
    ):
        """Test pagination parameters."""
        response = await authenticated_client.get("/api/v1/kunder/?limit=1&skip=0")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 1
        assert data["page_size"] == 1

    @pytest.mark.asyncio
    async def test_list_kunder_search_by_name(
        self, authenticated_client: AsyncClient
    ):
        """Test search functionality."""
        response = await authenticated_client.get("/api/v1/kunder/?search=Barnehage")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1
        # All results should match search
        for kunde in data["items"]:
            assert "barnehage" in kunde["kundenavn"].lower()

    @pytest.mark.asyncio
    async def test_list_kunder_sort_by_name_asc(
        self, authenticated_client: AsyncClient
    ):
        """Test sorting by name ascending."""
        response = await authenticated_client.get(
            "/api/v1/kunder/?sort_by=kundenavn&sort_order=asc"
        )
        assert response.status_code == 200

        data = response.json()
        if len(data["items"]) > 1:
            names = [k["kundenavn"] for k in data["items"]]
            assert names == sorted(names)

    @pytest.mark.asyncio
    async def test_list_kunder_sort_by_name_desc(
        self, authenticated_client: AsyncClient
    ):
        """Test sorting by name descending."""
        response = await authenticated_client.get(
            "/api/v1/kunder/?sort_by=kundenavn&sort_order=desc"
        )
        assert response.status_code == 200

        data = response.json()
        if len(data["items"]) > 1:
            names = [k["kundenavn"] for k in data["items"]]
            assert names == sorted(names, reverse=True)

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_kunder_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/kunder/")
        assert response.status_code == 401


class TestKunderGet:
    """Tests for GET /kunder/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_kunde_by_id(self, authenticated_client: AsyncClient):
        """Test getting a customer by ID."""
        response = await authenticated_client.get(
            f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["kundeid"] == TEST_KUNDE_1["kundeid"]
        assert data["kundenavn"] == TEST_KUNDE_1["kundenavn"]
        assert data["adresse"] == TEST_KUNDE_1["adresse"]

    @pytest.mark.asyncio
    async def test_get_kunde_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent customer."""
        response = await authenticated_client.get("/api/v1/kunder/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_kunde_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}")
        assert response.status_code == 401


class TestKunderCreate:
    """Tests for POST /kunder/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_kunde(self, authenticated_client: AsyncClient):
        """Test creating a new customer."""
        new_kunde = {
            "kundenavn": "Ny Test Kunde",
            "adresse": "Nyveien 123",
            "postnr": "3256",
            "sted": "Larvik",
            "kundegruppe": TEST_KUNDEGRUPPE_1["gruppeid"],
        }

        response = await authenticated_client.post("/api/v1/kunder/", json=new_kunde)
        assert response.status_code == 200

        data = response.json()
        assert data["kundenavn"] == new_kunde["kundenavn"]
        assert data["adresse"] == new_kunde["adresse"]
        assert "kundeid" in data

    @pytest.mark.asyncio
    async def test_create_kunde_minimal_fields(
        self, authenticated_client: AsyncClient
    ):
        """Test creating customer with minimal required fields."""
        new_kunde = {"kundenavn": "Minimal Kunde"}

        response = await authenticated_client.post("/api/v1/kunder/", json=new_kunde)
        assert response.status_code == 200

        data = response.json()
        assert data["kundenavn"] == new_kunde["kundenavn"]

    @pytest.mark.asyncio
    async def test_create_kunde_requires_name(
        self, authenticated_client: AsyncClient
    ):
        """Test that kundenavn is required."""
        new_kunde = {"adresse": "Testveien 1"}

        response = await authenticated_client.post("/api/v1/kunder/", json=new_kunde)
        assert response.status_code == 422  # Validation error

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_kunde_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/kunder/", json={"kundenavn": "Test"}
        )
        assert response.status_code == 401


class TestKunderUpdate:
    """Tests for PUT /kunder/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_kunde(self, authenticated_client: AsyncClient):
        """Test updating a customer."""
        update_data = {
            "kundenavn": "Oppdatert Barnehage",
            "merknad": "Ny merknad",
        }

        response = await authenticated_client.put(
            f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}", json=update_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["kundenavn"] == update_data["kundenavn"]
        assert data["merknad"] == update_data["merknad"]

    @pytest.mark.asyncio
    async def test_update_kunde_partial(self, authenticated_client: AsyncClient):
        """Test partial update (only some fields)."""
        update_data = {"merknad": "Bare merknad oppdatert"}

        response = await authenticated_client.put(
            f"/api/v1/kunder/{TEST_KUNDE_2['kundeid']}", json=update_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["merknad"] == update_data["merknad"]
        # Other fields should be unchanged
        assert data["kundenavn"] == TEST_KUNDE_2["kundenavn"]

    @pytest.mark.asyncio
    async def test_update_kunde_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent customer."""
        response = await authenticated_client.put(
            "/api/v1/kunder/99999", json={"kundenavn": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_kunde_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}",
            json={"kundenavn": "Test"},
        )
        assert response.status_code == 401


class TestKunderDelete:
    """Tests for DELETE /kunder/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_kunde_soft_deletes(
        self, authenticated_client: AsyncClient
    ):
        """Test that delete performs soft delete."""
        # First verify customer exists and is active
        get_response = await authenticated_client.get(
            f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}"
        )
        assert get_response.status_code == 200

        # Delete customer
        response = await authenticated_client.delete(
            f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}"
        )
        assert response.status_code == 200
        assert "deaktivert" in response.json()["message"].lower()

        # Customer should still exist but be inactive
        get_response = await authenticated_client.get(
            f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}"
        )
        assert get_response.status_code == 200
        assert get_response.json()["kundeinaktiv"] is True

    @pytest.mark.asyncio
    async def test_delete_kunde_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent customer."""
        response = await authenticated_client.delete("/api/v1/kunder/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_kunde_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(f"/api/v1/kunder/{TEST_KUNDE_1['kundeid']}")
        assert response.status_code == 401
