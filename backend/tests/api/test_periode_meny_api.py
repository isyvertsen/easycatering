"""Tests for Periode and Meny API endpoints.

Tests cover:
Periode:
- GET /periode/ - List periods with pagination
- GET /periode/siste - Get latest period
- GET /periode/neste-forslag - Get next period suggestion
- GET /periode/active - Get active periods
- GET /periode/{id} - Get single period
- POST /periode/ - Create period
- POST /periode/opprett-uke - Create period from week number
- PUT /periode/{id} - Update period
- DELETE /periode/{id} - Delete period
- POST /periode/bulk-delete - Bulk delete periods

Meny:
- GET /meny/ - List menus with pagination
- GET /meny/{id} - Get single menu
- POST /meny/ - Create menu
- PUT /meny/{id} - Update menu
- DELETE /meny/{id} - Delete menu
"""
import pytest

from tests.api.conftest import skip_if_auth_bypass
from httpx import AsyncClient


class TestPeriodeList:
    """Tests for GET /periode/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_perioder_returns_paginated_response(
        self, client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        # periode endpoint doesn't require auth
        response = await client.get("/api/v1/periode/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_perioder_pagination(self, client: AsyncClient):
        """Test pagination parameters."""
        response = await client.get("/api/v1/periode/?page=1&page_size=5")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 5
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_list_perioder_search_by_week(self, client: AsyncClient):
        """Test search by week number."""
        response = await client.get("/api/v1/periode/?search=1")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_perioder_sort(self, client: AsyncClient):
        """Test sorting."""
        response = await client.get("/api/v1/periode/?sort_by=ukenr&sort_order=asc")
        assert response.status_code == 200


class TestPeriodeSiste:
    """Tests for GET /periode/siste endpoint."""

    @pytest.mark.asyncio
    async def test_get_siste_periode(self, client: AsyncClient):
        """Test getting latest period."""
        response = await client.get("/api/v1/periode/siste")
        # May return 404 if no periods exist
        assert response.status_code in [200, 404]


class TestPeriodeNesteForslag:
    """Tests for GET /periode/neste-forslag endpoint."""

    @pytest.mark.asyncio
    async def test_get_neste_forslag(self, client: AsyncClient):
        """Test getting next period suggestion."""
        response = await client.get("/api/v1/periode/neste-forslag")
        assert response.status_code == 200

        data = response.json()
        assert "aar" in data
        assert "ukenr" in data
        assert "fradato" in data
        assert "tildato" in data


class TestPeriodeActive:
    """Tests for GET /periode/active endpoint."""

    @pytest.mark.asyncio
    async def test_get_active_perioder(self, client: AsyncClient):
        """Test getting active periods."""
        response = await client.get("/api/v1/periode/active")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)


class TestPeriodeGet:
    """Tests for GET /periode/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_periode_not_found(self, client: AsyncClient):
        """Test 404 for non-existent period."""
        response = await client.get("/api/v1/periode/99999")
        assert response.status_code == 404


class TestPeriodeCreate:
    """Tests for POST /periode/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_periode(self, client: AsyncClient):
        """Test creating a new period."""
        new_periode = {
            "ukenr": 52,
            "fradato": "2025-12-22T00:00:00",
            "tildato": "2025-12-28T23:59:59",
        }

        response = await client.post("/api/v1/periode/", json=new_periode)
        assert response.status_code == 200

        data = response.json()
        assert data["ukenr"] == new_periode["ukenr"]
        assert "menyperiodeid" in data


class TestPeriodeOpprettUke:
    """Tests for POST /periode/opprett-uke endpoint."""

    @pytest.mark.asyncio
    async def test_opprett_periode_fra_uke(self, client: AsyncClient):
        """Test creating period from week number."""
        request_data = {"aar": 2030, "ukenr": 1}

        response = await client.post("/api/v1/periode/opprett-uke", json=request_data)
        # May return 400 if period already exists
        assert response.status_code in [200, 400]

    @pytest.mark.asyncio
    async def test_opprett_periode_invalid_week(self, client: AsyncClient):
        """Test creating period with invalid week number."""
        request_data = {"aar": 2025, "ukenr": 54}

        response = await client.post("/api/v1/periode/opprett-uke", json=request_data)
        assert response.status_code == 422  # Validation error


class TestPeriodeUpdate:
    """Tests for PUT /periode/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_periode_not_found(self, client: AsyncClient):
        """Test 404 for non-existent period."""
        response = await client.put("/api/v1/periode/99999", json={"ukenr": 1})
        assert response.status_code == 404


class TestPeriodeDelete:
    """Tests for DELETE /periode/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_periode_not_found(self, client: AsyncClient):
        """Test 404 for non-existent period."""
        response = await client.delete("/api/v1/periode/99999")
        assert response.status_code == 404


class TestPeriodeBulkDelete:
    """Tests for POST /periode/bulk-delete endpoint."""

    @pytest.mark.asyncio
    async def test_bulk_delete_empty_ids(self, client: AsyncClient):
        """Test bulk delete with empty list returns 400."""
        response = await client.post("/api/v1/periode/bulk-delete", json=[])
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_bulk_delete_nonexistent_ids(self, client: AsyncClient):
        """Test bulk delete with non-existent IDs returns 404."""
        response = await client.post("/api/v1/periode/bulk-delete", json=[99999, 99998])
        assert response.status_code == 404


class TestMenyList:
    """Tests for GET /meny/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_menyer_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/meny/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_menyer_pagination(self, authenticated_client: AsyncClient):
        """Test pagination parameters."""
        response = await authenticated_client.get("/api/v1/meny/?limit=5&skip=0")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 5
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_list_menyer_search(self, authenticated_client: AsyncClient):
        """Test search functionality."""
        response = await authenticated_client.get("/api/v1/meny/?search=test")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_menyer_filter_by_gruppe(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by menu group."""
        response = await authenticated_client.get("/api/v1/meny/?gruppe_id=1")
        assert response.status_code == 200

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_menyer_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/meny/")
        assert response.status_code == 401


class TestMenyGet:
    """Tests for GET /meny/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_meny_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent menu."""
        response = await authenticated_client.get("/api/v1/meny/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_meny_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/meny/1")
        assert response.status_code == 401


class TestMenyCreate:
    """Tests for POST /meny/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_meny(self, authenticated_client: AsyncClient):
        """Test creating a new menu."""
        new_meny = {
            "beskrivelse": "Test Meny",
        }

        response = await authenticated_client.post("/api/v1/meny/", json=new_meny)
        assert response.status_code == 200

        data = response.json()
        assert data["beskrivelse"] == new_meny["beskrivelse"]
        assert "menyid" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_meny_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/meny/", json={"beskrivelse": "Test"})
        assert response.status_code == 401


class TestMenyUpdate:
    """Tests for PUT /meny/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_meny_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent menu."""
        response = await authenticated_client.put(
            "/api/v1/meny/99999", json={"beskrivelse": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_meny_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            "/api/v1/meny/1", json={"beskrivelse": "Test"}
        )
        assert response.status_code == 401


class TestMenyDelete:
    """Tests for DELETE /meny/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_meny_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent menu."""
        response = await authenticated_client.delete("/api/v1/meny/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_meny_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete("/api/v1/meny/1")
        assert response.status_code == 401
