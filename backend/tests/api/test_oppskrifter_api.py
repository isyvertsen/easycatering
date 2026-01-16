"""Tests for Oppskrifter (Recipes/Kalkyler) API endpoints.

Tests cover:
- GET /oppskrifter/ - List recipes with pagination and filtering
- GET /oppskrifter/{id} - Get single recipe with details
- POST /oppskrifter/ - Create recipe
- PUT /oppskrifter/{id} - Update recipe
- DELETE /oppskrifter/{id} - Delete recipe
- GET /oppskrifter/grupper/ - List recipe groups
- GET /oppskrifter/{id}/naering - Calculate nutrition
- POST /oppskrifter/kombinere - Combine recipes for nutrition calculation
- GET /oppskrifter/{id}/label - Generate PDF label
- POST /oppskrifter/kombinere/label - Generate combined PDF label
- POST /oppskrifter/kombinere/label-zpl - Generate combined ZPL label
- POST /oppskrifter/kombinere/generate-name - Generate dish name with AI
"""
import pytest

from tests.api.conftest import skip_if_auth_bypass
from httpx import AsyncClient


class TestOppskrifterList:
    """Tests for GET /oppskrifter/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_oppskrifter_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/oppskrifter/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_oppskrifter_pagination(
        self, authenticated_client: AsyncClient
    ):
        """Test pagination parameters."""
        response = await authenticated_client.get("/api/v1/oppskrifter/?limit=5&skip=0")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 5
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_list_oppskrifter_search(self, authenticated_client: AsyncClient):
        """Test search functionality."""
        response = await authenticated_client.get("/api/v1/oppskrifter/?search=test")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_oppskrifter_filter_by_gruppe(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by group ID."""
        response = await authenticated_client.get("/api/v1/oppskrifter/?gruppeid=1")
        assert response.status_code == 200

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_oppskrifter_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/oppskrifter/")
        assert response.status_code == 401


class TestOppskrifterGet:
    """Tests for GET /oppskrifter/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_oppskrift_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent recipe."""
        response = await authenticated_client.get("/api/v1/oppskrifter/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_oppskrift_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/oppskrifter/1")
        assert response.status_code == 401


class TestOppskrifterCreate:
    """Tests for POST /oppskrifter/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_oppskrift(self, authenticated_client: AsyncClient):
        """Test creating a new recipe."""
        new_oppskrift = {
            "kalkylenavn": "Test Oppskrift",
            "informasjon": "Test beskrivelse",
            "antallporsjoner": 4,
        }

        response = await authenticated_client.post(
            "/api/v1/oppskrifter/", json=new_oppskrift
        )
        assert response.status_code == 201

        data = response.json()
        assert data["kalkylenavn"] == new_oppskrift["kalkylenavn"]
        assert "kalkylekode" in data

    @pytest.mark.asyncio
    async def test_create_oppskrift_with_details(
        self, authenticated_client: AsyncClient
    ):
        """Test creating recipe with ingredient details."""
        new_oppskrift = {
            "kalkylenavn": "Test Oppskrift Med Detaljer",
            "antallporsjoner": 2,
            "detaljer": [
                {
                    "ingrediensnavn": "Test Ingrediens",
                    "mengde": 100.0,
                    "enhet": "g",
                }
            ],
        }

        response = await authenticated_client.post(
            "/api/v1/oppskrifter/", json=new_oppskrift
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_create_oppskrift_requires_name(
        self, authenticated_client: AsyncClient
    ):
        """Test that kalkylenavn is required."""
        new_oppskrift = {"informasjon": "Uten navn"}

        response = await authenticated_client.post(
            "/api/v1/oppskrifter/", json=new_oppskrift
        )
        assert response.status_code == 422

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_oppskrift_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/oppskrifter/", json={"kalkylenavn": "Test"}
        )
        assert response.status_code == 401


class TestOppskrifterUpdate:
    """Tests for PUT /oppskrifter/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_oppskrift_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent recipe."""
        response = await authenticated_client.put(
            "/api/v1/oppskrifter/99999", json={"kalkylenavn": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_oppskrift_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            "/api/v1/oppskrifter/1", json={"kalkylenavn": "Test"}
        )
        assert response.status_code == 401


class TestOppskrifterDelete:
    """Tests for DELETE /oppskrifter/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_oppskrift_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent recipe."""
        response = await authenticated_client.delete("/api/v1/oppskrifter/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_oppskrift_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete("/api/v1/oppskrifter/1")
        assert response.status_code == 401


class TestOppskrifterGrupper:
    """Tests for GET /oppskrifter/grupper/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_grupper(self, authenticated_client: AsyncClient):
        """Test listing recipe groups."""
        response = await authenticated_client.get("/api/v1/oppskrifter/grupper/")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_grupper_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/oppskrifter/grupper/")
        assert response.status_code == 401


class TestOppskrifterNaering:
    """Tests for GET /oppskrifter/{id}/naering endpoint."""

    @pytest.mark.asyncio
    async def test_calculate_naering_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test 404 for non-existent recipe."""
        response = await authenticated_client.get("/api/v1/oppskrifter/99999/naering")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_calculate_naering_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/oppskrifter/1/naering")
        assert response.status_code == 401


class TestOppskrifterKombinere:
    """Tests for POST /oppskrifter/kombinere endpoint."""

    @pytest.mark.asyncio
    async def test_kombinere_empty_request(self, authenticated_client: AsyncClient):
        """Test combining with empty lists."""
        request_data = {
            "name": "Test Kombinert",
            "recipes": [],
            "products": [],
        }

        response = await authenticated_client.post(
            "/api/v1/oppskrifter/kombinere", json=request_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "Test Kombinert"
        assert data["total_weight_grams"] == 0

    @pytest.mark.asyncio
    async def test_kombinere_nonexistent_recipe(
        self, authenticated_client: AsyncClient
    ):
        """Test combining with non-existent recipe returns 404."""
        request_data = {
            "name": "Test",
            "recipes": [{"kalkylekode": 99999, "amount_grams": 100}],
            "products": [],
        }

        response = await authenticated_client.post(
            "/api/v1/oppskrifter/kombinere", json=request_data
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_kombinere_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/oppskrifter/kombinere",
            json={"name": "Test", "recipes": [], "products": []},
        )
        assert response.status_code == 401


class TestOppskrifterLabels:
    """Tests for label generation endpoints."""

    @pytest.mark.asyncio
    async def test_generate_label_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent recipe."""
        response = await authenticated_client.get("/api/v1/oppskrifter/99999/label")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_generate_label_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/oppskrifter/1/label")
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_generate_combined_label_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/oppskrifter/kombinere/label",
            json={"name": "Test", "recipes": [], "products": []},
        )
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_generate_combined_label_zpl_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/oppskrifter/kombinere/label-zpl",
            json={"name": "Test", "recipes": [], "products": []},
        )
        assert response.status_code == 401


class TestOppskrifterGenerateName:
    """Tests for POST /oppskrifter/kombinere/generate-name endpoint."""

    @pytest.mark.asyncio
    async def test_generate_name_empty_request(
        self, authenticated_client: AsyncClient
    ):
        """Test generating name with empty lists."""
        request_data = {"recipes": [], "products": []}

        response = await authenticated_client.post(
            "/api/v1/oppskrifter/kombinere/generate-name", json=request_data
        )
        assert response.status_code == 200

        data = response.json()
        assert "name" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_generate_name_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/oppskrifter/kombinere/generate-name",
            json={"recipes": [], "products": []},
        )
        assert response.status_code == 401
