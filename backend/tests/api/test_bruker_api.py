"""Tests for Bruker (User) API endpoints.

Tests cover:
- GET /bruker/ - List users with pagination, filtering, and search (admin only)
- GET /bruker/{id} - Get single user (admin only)
- GET /bruker/ansatt/{ansattid} - Get user by employee ID (admin only)
- POST /bruker/ - Create user (admin only)
- PUT /bruker/{id} - Update user (admin only)
- DELETE /bruker/{id} - Soft delete user (admin only)
- POST /bruker/{id}/activate - Reactivate user (admin only)
"""
import pytest

from tests.api.conftest import skip_if_auth_bypass
from httpx import AsyncClient

from tests.fixtures import (
    TEST_USER,
    TEST_ADMIN,
    TEST_INACTIVE_USER,
)


class TestBrukerList:
    """Tests for GET /bruker/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_brukere_returns_paginated_response(
        self, admin_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await admin_client.get("/api/v1/brukere/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_brukere_contains_test_users(self, admin_client: AsyncClient):
        """Test that list contains test users."""
        response = await admin_client.get("/api/v1/brukere/")
        assert response.status_code == 200

        data = response.json()
        user_ids = [u["id"] for u in data["items"]]
        assert TEST_USER["id"] in user_ids
        assert TEST_ADMIN["id"] in user_ids

    @pytest.mark.asyncio
    async def test_list_brukere_filter_by_rolle(self, admin_client: AsyncClient):
        """Test filtering by rolle."""
        response = await admin_client.get("/api/v1/brukere/?rolle=admin")
        assert response.status_code == 200

        data = response.json()
        for user in data["items"]:
            assert user["rolle"] == "admin"

    @pytest.mark.asyncio
    async def test_list_brukere_filter_by_is_active(self, admin_client: AsyncClient):
        """Test filtering by is_active status."""
        response = await admin_client.get("/api/v1/brukere/?is_active=true")
        assert response.status_code == 200

        data = response.json()
        for user in data["items"]:
            assert user["is_active"] is True

    @pytest.mark.asyncio
    async def test_list_brukere_filter_inactive(self, admin_client: AsyncClient):
        """Test filtering for inactive users."""
        response = await admin_client.get("/api/v1/brukere/?is_active=false")
        assert response.status_code == 200

        data = response.json()
        user_ids = [u["id"] for u in data["items"]]
        assert TEST_INACTIVE_USER["id"] in user_ids

    @pytest.mark.asyncio
    async def test_list_brukere_search(self, admin_client: AsyncClient):
        """Test search functionality."""
        response = await admin_client.get("/api/v1/brukere/?search=test")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_brukere_pagination(self, admin_client: AsyncClient):
        """Test pagination parameters."""
        response = await admin_client.get("/api/v1/brukere/?page=1&page_size=1")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 1
        assert data["page_size"] == 1

    @pytest.mark.asyncio
    async def test_list_brukere_sort(self, admin_client: AsyncClient):
        """Test sorting."""
        response = await admin_client.get(
            "/api/v1/brukere/?sort_by=email&sort_order=asc"
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_brukere_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that non-admin users get 403."""
        response = await authenticated_client.get("/api/v1/brukere/")
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_brukere_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/brukere/")
        assert response.status_code == 401


class TestBrukerGet:
    """Tests for GET /bruker/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_bruker_by_id(self, admin_client: AsyncClient):
        """Test getting a user by ID."""
        response = await admin_client.get(f"/api/v1/brukere/{TEST_USER['id']}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == TEST_USER["id"]
        assert data["email"] == TEST_USER["email"]
        assert data["full_name"] == TEST_USER["full_name"]

    @pytest.mark.asyncio
    async def test_get_bruker_not_found(self, admin_client: AsyncClient):
        """Test 404 for non-existent user."""
        response = await admin_client.get("/api/v1/brukere/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_bruker_requires_admin(self, authenticated_client: AsyncClient):
        """Test that non-admin users get 403."""
        response = await authenticated_client.get(f"/api/v1/brukere/{TEST_USER['id']}")
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_bruker_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(f"/api/v1/brukere/{TEST_USER['id']}")
        assert response.status_code == 401


class TestBrukerCreate:
    """Tests for POST /bruker/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_bruker(self, admin_client: AsyncClient):
        """Test creating a new user."""
        new_bruker = {
            "email": "nybruker@lkc.no",
            "full_name": "Ny Bruker",
            "password": "testpassord123",
            "rolle": "bruker",
            "is_active": True,
        }

        response = await admin_client.post("/api/v1/brukere/", json=new_bruker)
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == new_bruker["email"]
        assert data["full_name"] == new_bruker["full_name"]
        assert data["rolle"] == new_bruker["rolle"]
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_bruker_duplicate_email(self, admin_client: AsyncClient):
        """Test that duplicate email returns 400."""
        new_bruker = {
            "email": TEST_USER["email"],  # Existing email
            "full_name": "Duplikat Bruker",
            "password": "testpassord123",
        }

        response = await admin_client.post("/api/v1/brukere/", json=new_bruker)
        assert response.status_code == 400
        assert "allerede i bruk" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_bruker_requires_email(self, admin_client: AsyncClient):
        """Test that email is required."""
        new_bruker = {
            "full_name": "Bruker Uten Email",
            "password": "testpassord123",
        }

        response = await admin_client.post("/api/v1/brukere/", json=new_bruker)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_bruker_requires_admin(self, authenticated_client: AsyncClient):
        """Test that non-admin users get 403."""
        new_bruker = {
            "email": "test2@lkc.no",
            "full_name": "Test",
            "password": "test123",
        }
        response = await authenticated_client.post("/api/v1/brukere/", json=new_bruker)
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_bruker_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/brukere/",
            json={"email": "test@test.no", "password": "test123"},
        )
        assert response.status_code == 401


class TestBrukerUpdate:
    """Tests for PUT /bruker/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_bruker(self, admin_client: AsyncClient):
        """Test updating a user."""
        update_data = {
            "full_name": "Oppdatert Navn",
        }

        response = await admin_client.put(
            f"/api/v1/brukere/{TEST_USER['id']}", json=update_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["full_name"] == update_data["full_name"]

    @pytest.mark.asyncio
    async def test_update_bruker_password(self, admin_client: AsyncClient):
        """Test updating user password."""
        update_data = {
            "password": "nyttpassord123",
        }

        response = await admin_client.put(
            f"/api/v1/brukere/{TEST_USER['id']}", json=update_data
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_bruker_duplicate_email(self, admin_client: AsyncClient):
        """Test that duplicate email returns 400."""
        update_data = {
            "email": TEST_ADMIN["email"],  # Another user's email
        }

        response = await admin_client.put(
            f"/api/v1/brukere/{TEST_USER['id']}", json=update_data
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_bruker_not_found(self, admin_client: AsyncClient):
        """Test 404 for non-existent user."""
        response = await admin_client.put(
            "/api/v1/brukere/99999", json={"full_name": "Test"}
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_bruker_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that non-admin users get 403."""
        response = await authenticated_client.put(
            f"/api/v1/brukere/{TEST_USER['id']}", json={"full_name": "Test"}
        )
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_bruker_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/brukere/{TEST_USER['id']}", json={"full_name": "Test"}
        )
        assert response.status_code == 401


class TestBrukerDelete:
    """Tests for DELETE /bruker/{id} endpoint (soft delete)."""

    @pytest.mark.asyncio
    async def test_delete_bruker_soft_deletes(self, admin_client: AsyncClient):
        """Test that delete performs soft delete (sets is_active=False)."""
        # First create a user to delete
        new_bruker = {
            "email": "todelete@lkc.no",
            "full_name": "Til Sletting",
            "password": "test123",
        }
        create_response = await admin_client.post("/api/v1/brukere/", json=new_bruker)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]

        # Delete the user
        response = await admin_client.delete(f"/api/v1/brukere/{user_id}")
        assert response.status_code == 200
        assert "deaktivert" in response.json()["message"].lower()

        # User should still exist but be inactive
        get_response = await admin_client.get(f"/api/v1/brukere/{user_id}")
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] is False

    @pytest.mark.asyncio
    async def test_delete_bruker_cannot_delete_self(self, admin_client: AsyncClient):
        """Test that user cannot delete themselves."""
        response = await admin_client.delete(f"/api/v1/brukere/{TEST_ADMIN['id']}")
        assert response.status_code == 400
        assert "egen brukerkonto" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_delete_bruker_not_found(self, admin_client: AsyncClient):
        """Test 404 for non-existent user."""
        response = await admin_client.delete("/api/v1/brukere/99999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_bruker_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that non-admin users get 403."""
        response = await authenticated_client.delete(f"/api/v1/brukere/{TEST_USER['id']}")
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_bruker_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(f"/api/v1/brukere/{TEST_USER['id']}")
        assert response.status_code == 401


class TestBrukerActivate:
    """Tests for POST /bruker/{id}/activate endpoint."""

    @pytest.mark.asyncio
    async def test_activate_bruker(self, admin_client: AsyncClient):
        """Test reactivating a user."""
        response = await admin_client.post(
            f"/api/v1/brukere/{TEST_INACTIVE_USER['id']}/activate"
        )
        assert response.status_code == 200
        assert "aktivert" in response.json()["message"].lower()

        # Verify user is now active
        get_response = await admin_client.get(
            f"/api/v1/brukere/{TEST_INACTIVE_USER['id']}"
        )
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] is True

    @pytest.mark.asyncio
    async def test_activate_bruker_not_found(self, admin_client: AsyncClient):
        """Test 404 for non-existent user."""
        response = await admin_client.post("/api/v1/brukere/99999/activate")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_activate_bruker_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that non-admin users get 403."""
        response = await authenticated_client.post(
            f"/api/v1/brukere/{TEST_INACTIVE_USER['id']}/activate"
        )
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_activate_bruker_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            f"/api/v1/brukere/{TEST_INACTIVE_USER['id']}/activate"
        )
        assert response.status_code == 401
