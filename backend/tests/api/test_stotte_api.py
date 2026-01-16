"""Tests for support APIs (Kategorier, Leverandører, Kundegrupper).

Tests cover:
Kategorier:
- GET /kategorier/ - List categories
- GET /kategorier/{id} - Get single category
- POST /kategorier/ - Create category
- PUT /kategorier/{id} - Update category
- DELETE /kategorier/{id} - Delete category

Leverandører:
- GET /leverandorer/ - List suppliers
- GET /leverandorer/{id} - Get single supplier
- POST /leverandorer/ - Create supplier
- PUT /leverandorer/{id} - Update supplier
- DELETE /leverandorer/{id} - Soft delete supplier
- POST /leverandorer/bulk-delete - Bulk soft delete suppliers

Kundegrupper:
- GET /kunde-gruppe/ - List customer groups
- GET /kunde-gruppe/{id} - Get single customer group
- POST /kunde-gruppe/ - Create customer group
- PUT /kunde-gruppe/{id} - Update customer group
- DELETE /kunde-gruppe/{id} - Delete customer group
- POST /kunde-gruppe/bulk-delete - Bulk delete customer groups
"""
import pytest
from httpx import AsyncClient

from tests.api.conftest import skip_if_auth_bypass
from tests.fixtures import (
    TEST_KATEGORI_1,
    TEST_LEVERANDOR_1,
    TEST_KUNDEGRUPPE_1,
)


# =================== Kategorier Tests ===================


class TestKategorierList:
    """Tests for GET /kategorier/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_kategorier_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/kategorier/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_kategorier_pagination(
        self, authenticated_client: AsyncClient
    ):
        """Test pagination parameters."""
        response = await authenticated_client.get(
            "/api/v1/kategorier/?page=1&page_size=5"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 5
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_list_kategorier_search(self, authenticated_client: AsyncClient):
        """Test search functionality."""
        response = await authenticated_client.get("/api/v1/kategorier/?search=test")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_kategorier_sort(self, authenticated_client: AsyncClient):
        """Test sorting."""
        response = await authenticated_client.get(
            "/api/v1/kategorier/?sort_by=kategori&sort_order=asc"
        )
        assert response.status_code == 200

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_kategorier_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/kategorier/")
        assert response.status_code == 401


class TestKategorierGet:
    """Tests for GET /kategorier/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_kategori_by_id(self, authenticated_client: AsyncClient):
        """Test getting a category by ID."""
        response = await authenticated_client.get(
            f"/api/v1/kategorier/{TEST_KATEGORI_1['kategoriid']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["kategoriid"] == TEST_KATEGORI_1["kategoriid"]

    @pytest.mark.asyncio
    async def test_get_kategori_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent category."""
        response = await authenticated_client.get("/api/v1/kategorier/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_kategori_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(f"/api/v1/kategorier/{TEST_KATEGORI_1['kategoriid']}")
        assert response.status_code == 401


class TestKategorierCreate:
    """Tests for POST /kategorier/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_kategori(self, authenticated_client: AsyncClient):
        """Test creating a new category."""
        new_kategori = {
            "kategori": "Ny Test Kategori",
            "beskrivelse": "Test beskrivelse",
        }

        response = await authenticated_client.post(
            "/api/v1/kategorier/", json=new_kategori
        )
        assert response.status_code == 200

        data = response.json()
        assert data["kategori"] == new_kategori["kategori"]
        assert "kategoriid" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_kategori_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/kategorier/", json={"kategori": "Test"}
        )
        assert response.status_code == 401


class TestKategorierUpdate:
    """Tests for PUT /kategorier/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_kategori_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent category."""
        response = await authenticated_client.put(
            "/api/v1/kategorier/99999", json={"kategori": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_kategori_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/kategorier/{TEST_KATEGORI_1['kategoriid']}",
            json={"kategori": "Test"},
        )
        assert response.status_code == 401


class TestKategorierDelete:
    """Tests for DELETE /kategorier/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_kategori_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent category."""
        response = await authenticated_client.delete("/api/v1/kategorier/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_kategori_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(
            f"/api/v1/kategorier/{TEST_KATEGORI_1['kategoriid']}"
        )
        assert response.status_code == 401


# =================== Leverandører Tests ===================


class TestLeverandorerList:
    """Tests for GET /leverandorer/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_leverandorer_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/leverandorer/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_leverandorer_filter_aktiv(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by active status."""
        response = await authenticated_client.get("/api/v1/leverandorer/?aktiv=true")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_leverandorer_filter_inactive(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering for inactive suppliers."""
        response = await authenticated_client.get("/api/v1/leverandorer/?aktiv=false")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_leverandorer_search(self, authenticated_client: AsyncClient):
        """Test search functionality."""
        response = await authenticated_client.get("/api/v1/leverandorer/?search=test")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_leverandorer_pagination(
        self, authenticated_client: AsyncClient
    ):
        """Test pagination parameters."""
        response = await authenticated_client.get(
            "/api/v1/leverandorer/?page=1&page_size=5"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 5
        assert data["page_size"] == 5

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_leverandorer_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/leverandorer/")
        assert response.status_code == 401


class TestLeverandorerGet:
    """Tests for GET /leverandorer/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_leverandor_by_id(self, authenticated_client: AsyncClient):
        """Test getting a supplier by ID."""
        response = await authenticated_client.get(
            f"/api/v1/leverandorer/{TEST_LEVERANDOR_1['leverandorid']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["leverandorid"] == TEST_LEVERANDOR_1["leverandorid"]

    @pytest.mark.asyncio
    async def test_get_leverandor_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent supplier."""
        response = await authenticated_client.get("/api/v1/leverandorer/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_leverandor_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(
            f"/api/v1/leverandorer/{TEST_LEVERANDOR_1['leverandorid']}"
        )
        assert response.status_code == 401


class TestLeverandorerCreate:
    """Tests for POST /leverandorer/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_leverandor(self, authenticated_client: AsyncClient):
        """Test creating a new supplier."""
        new_leverandor = {
            "leverandornavn": "Ny Test Leverandør",
            "e_post": "ny@leverandor.no",
            "telefonnummer": "12345678",
        }

        response = await authenticated_client.post(
            "/api/v1/leverandorer/", json=new_leverandor
        )
        assert response.status_code == 200

        data = response.json()
        assert data["leverandornavn"] == new_leverandor["leverandornavn"]
        assert "leverandorid" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_leverandor_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/leverandorer/", json={"leverandornavn": "Test"}
        )
        assert response.status_code == 401


class TestLeverandorerUpdate:
    """Tests for PUT /leverandorer/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_leverandor_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test 404 for non-existent supplier."""
        response = await authenticated_client.put(
            "/api/v1/leverandorer/99999", json={"leverandornavn": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_leverandor_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/leverandorer/{TEST_LEVERANDOR_1['leverandorid']}",
            json={"leverandornavn": "Test"},
        )
        assert response.status_code == 401


class TestLeverandorerDelete:
    """Tests for DELETE /leverandorer/{id} endpoint (soft delete)."""

    @pytest.mark.asyncio
    async def test_delete_leverandor_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test 404 for non-existent supplier."""
        response = await authenticated_client.delete("/api/v1/leverandorer/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_leverandor_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(
            f"/api/v1/leverandorer/{TEST_LEVERANDOR_1['leverandorid']}"
        )
        assert response.status_code == 401


class TestLeverandorerBulkDelete:
    """Tests for POST /leverandorer/bulk-delete endpoint."""

    @pytest.mark.asyncio
    async def test_bulk_delete_empty_ids(self, authenticated_client: AsyncClient):
        """Test bulk delete with empty list returns 400."""
        response = await authenticated_client.post(
            "/api/v1/leverandorer/bulk-delete", json=[]
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_bulk_delete_nonexistent_ids(
        self, authenticated_client: AsyncClient
    ):
        """Test bulk delete with non-existent IDs returns 404."""
        response = await authenticated_client.post(
            "/api/v1/leverandorer/bulk-delete", json=[99999, 99998]
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_bulk_delete_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/leverandorer/bulk-delete", json=[1])
        assert response.status_code == 401


# =================== Kundegrupper Tests ===================


class TestKundegrupperList:
    """Tests for GET /kunde-gruppe/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_kundegrupper_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/kunde-gruppe/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_kundegrupper_pagination(
        self, authenticated_client: AsyncClient
    ):
        """Test pagination parameters."""
        response = await authenticated_client.get(
            "/api/v1/kunde-gruppe/?page=1&page_size=5"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 5
        assert data["page_size"] == 5

    @pytest.mark.asyncio
    async def test_list_kundegrupper_search(self, authenticated_client: AsyncClient):
        """Test search functionality."""
        response = await authenticated_client.get("/api/v1/kunde-gruppe/?search=test")
        assert response.status_code == 200

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_kundegrupper_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/kunde-gruppe/")
        assert response.status_code == 401


class TestKundegrupperGet:
    """Tests for GET /kunde-gruppe/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_kundegruppe_by_id(self, authenticated_client: AsyncClient):
        """Test getting a customer group by ID."""
        response = await authenticated_client.get(
            f"/api/v1/kunde-gruppe/{TEST_KUNDEGRUPPE_1['gruppeid']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["gruppeid"] == TEST_KUNDEGRUPPE_1["gruppeid"]

    @pytest.mark.asyncio
    async def test_get_kundegruppe_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent customer group."""
        response = await authenticated_client.get("/api/v1/kunde-gruppe/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_kundegruppe_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(
            f"/api/v1/kunde-gruppe/{TEST_KUNDEGRUPPE_1['gruppeid']}"
        )
        assert response.status_code == 401


class TestKundegrupperCreate:
    """Tests for POST /kunde-gruppe/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_kundegruppe(self, authenticated_client: AsyncClient):
        """Test creating a new customer group."""
        new_gruppe = {
            "gruppe": "Ny Test Kundegruppe",
            "webshop": True,
            "autofaktura": False,
        }

        response = await authenticated_client.post(
            "/api/v1/kunde-gruppe/", json=new_gruppe
        )
        assert response.status_code == 200

        data = response.json()
        assert data["gruppe"] == new_gruppe["gruppe"]
        assert "gruppeid" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_kundegruppe_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/kunde-gruppe/", json={"gruppe": "Test"}
        )
        assert response.status_code == 401


class TestKundegrupperUpdate:
    """Tests for PUT /kunde-gruppe/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_kundegruppe_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test 404 for non-existent customer group."""
        response = await authenticated_client.put(
            "/api/v1/kunde-gruppe/99999", json={"gruppe": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_kundegruppe_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/kunde-gruppe/{TEST_KUNDEGRUPPE_1['gruppeid']}",
            json={"gruppe": "Test"},
        )
        assert response.status_code == 401


class TestKundegrupperDelete:
    """Tests for DELETE /kunde-gruppe/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_kundegruppe_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test 404 for non-existent customer group."""
        response = await authenticated_client.delete("/api/v1/kunde-gruppe/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_kundegruppe_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(
            f"/api/v1/kunde-gruppe/{TEST_KUNDEGRUPPE_1['gruppeid']}"
        )
        assert response.status_code == 401


class TestKundegrupperBulkDelete:
    """Tests for POST /kunde-gruppe/bulk-delete endpoint."""

    @pytest.mark.asyncio
    async def test_bulk_delete_empty_ids(self, authenticated_client: AsyncClient):
        """Test bulk delete with empty list returns 400."""
        response = await authenticated_client.post(
            "/api/v1/kunde-gruppe/bulk-delete", json=[]
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_bulk_delete_nonexistent_ids(
        self, authenticated_client: AsyncClient
    ):
        """Test bulk delete with non-existent IDs returns 404."""
        response = await authenticated_client.post(
            "/api/v1/kunde-gruppe/bulk-delete", json=[99999, 99998]
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_bulk_delete_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/kunde-gruppe/bulk-delete", json=[1])
        assert response.status_code == 401
