"""Tests for Ordrer (Orders) API endpoints.

Tests cover:
- GET /ordrer/ - List orders with pagination, filtering, and search
- GET /ordrer/{id} - Get single order
- GET /ordrer/{id}/detaljer - Get order details
- POST /ordrer/ - Create order
- POST /ordrer/{id}/detaljer - Add order detail
- PUT /ordrer/{id}/detaljer/{unik} - Update order detail
- DELETE /ordrer/{id}/detaljer/{unik} - Delete order detail
- PUT /ordrer/{id} - Update order
- DELETE /ordrer/{id} - Cancel order
- POST /ordrer/{id}/duplicate - Duplicate order
- PUT /ordrer/{id}/status - Update order status
- POST /ordrer/batch/status - Batch update order status
"""
import pytest

from tests.api.conftest import skip_if_auth_bypass
from datetime import date, datetime
from httpx import AsyncClient

from tests.fixtures import (
    TEST_ORDRE_1,
    TEST_ORDRE_2,
    TEST_ORDRE_COMPLETED,
    TEST_ORDREDETALJ_1,
    TEST_ORDREDETALJ_2,
    TEST_KUNDE_1,
    TEST_PRODUKT_1,
)


class TestOrdrerList:
    """Tests for GET /ordrer/ endpoint."""

    @pytest.mark.asyncio
    async def test_list_ordrer_returns_paginated_response(
        self, authenticated_client: AsyncClient
    ):
        """Test that list endpoint returns paginated response."""
        response = await authenticated_client.get("/api/v1/ordrer/")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["items"], list)

    @pytest.mark.asyncio
    async def test_list_ordrer_contains_test_orders(
        self, authenticated_client: AsyncClient
    ):
        """Test that list contains test orders."""
        response = await authenticated_client.get("/api/v1/ordrer/")
        assert response.status_code == 200

        data = response.json()
        ordreids = [o["ordreid"] for o in data["items"]]
        assert TEST_ORDRE_1["ordreid"] in ordreids

    @pytest.mark.asyncio
    async def test_list_ordrer_filter_by_kunde_id(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by customer ID."""
        response = await authenticated_client.get(
            f"/api/v1/ordrer/?kunde_id={TEST_KUNDE_1['kundeid']}"
        )
        assert response.status_code == 200

        data = response.json()
        # All results should be for that customer
        for ordre in data["items"]:
            assert ordre["kundeid"] == TEST_KUNDE_1["kundeid"]

    @pytest.mark.asyncio
    async def test_list_ordrer_filter_by_date_range(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by date range."""
        response = await authenticated_client.get(
            "/api/v1/ordrer/?fra_dato=2024-01-01&til_dato=2024-12-31"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_ordrer_filter_by_status(
        self, authenticated_client: AsyncClient
    ):
        """Test filtering by order status IDs."""
        response = await authenticated_client.get(
            f"/api/v1/ordrer/?status_ids={TEST_ORDRE_1['ordrestatusid']}"
        )
        assert response.status_code == 200

        data = response.json()
        # All results should have that status
        for ordre in data["items"]:
            assert ordre["ordrestatusid"] == TEST_ORDRE_1["ordrestatusid"]

    @pytest.mark.asyncio
    async def test_list_ordrer_pagination(self, authenticated_client: AsyncClient):
        """Test pagination parameters."""
        response = await authenticated_client.get("/api/v1/ordrer/?limit=1&skip=0")
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 1
        assert data["page_size"] == 1

    @pytest.mark.asyncio
    async def test_list_ordrer_search_by_name(self, authenticated_client: AsyncClient):
        """Test search by customer name."""
        response = await authenticated_client.get("/api/v1/ordrer/?search=Barnehage")
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_ordrer_search_by_id(self, authenticated_client: AsyncClient):
        """Test search by order ID."""
        response = await authenticated_client.get(
            f"/api/v1/ordrer/?search={TEST_ORDRE_1['ordreid']}"
        )
        assert response.status_code == 200

        data = response.json()
        ordreids = [o["ordreid"] for o in data["items"]]
        assert TEST_ORDRE_1["ordreid"] in ordreids

    @pytest.mark.asyncio
    async def test_list_ordrer_sort_by_leveringsdato(
        self, authenticated_client: AsyncClient
    ):
        """Test sorting by delivery date."""
        response = await authenticated_client.get(
            "/api/v1/ordrer/?sort_by=leveringsdato&sort_order=asc"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) >= 0  # Just verify it works

    @pytest.mark.asyncio
    async def test_list_ordrer_sort_by_ordredato_desc(
        self, authenticated_client: AsyncClient
    ):
        """Test sorting by order date descending."""
        response = await authenticated_client.get(
            "/api/v1/ordrer/?sort_by=ordredato&sort_order=desc"
        )
        assert response.status_code == 200

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_ordrer_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/ordrer/")
        assert response.status_code == 401


class TestOrdrerGet:
    """Tests for GET /ordrer/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_ordre_by_id(self, authenticated_client: AsyncClient):
        """Test getting an order by ID."""
        response = await authenticated_client.get(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["ordreid"] == TEST_ORDRE_1["ordreid"]
        assert data["kundeid"] == TEST_ORDRE_1["kundeid"]

    @pytest.mark.asyncio
    async def test_get_ordre_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent order."""
        response = await authenticated_client.get("/api/v1/ordrer/99999")
        assert response.status_code == 404
        assert "ikke funnet" in response.json()["detail"].lower()

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_ordre_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}")
        assert response.status_code == 401


class TestOrdreDetaljer:
    """Tests for order details endpoints."""

    @pytest.mark.asyncio
    async def test_get_ordre_detaljer(self, authenticated_client: AsyncClient):
        """Test getting order details."""
        response = await authenticated_client.get(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}/detaljer"
        )
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify detail fields
        detalj = data[0]
        assert "ordreid" in detalj
        assert "produktid" in detalj
        assert "antall" in detalj
        assert "pris" in detalj

    @pytest.mark.asyncio
    async def test_get_ordre_detaljer_empty(self, authenticated_client: AsyncClient):
        """Test getting details for order with no details returns empty list."""
        # Use an order ID that exists but may have no details
        response = await authenticated_client.get(
            f"/api/v1/ordrer/{TEST_ORDRE_COMPLETED['ordreid']}/detaljer"
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_add_ordre_detalj(self, authenticated_client: AsyncClient):
        """Test adding a detail to an order."""
        new_detalj = {
            "produktid": TEST_PRODUKT_1["produktid"],
            "antall": 5.0,
            "pris": 25.00,
            "rabatt": 0.0,
        }

        response = await authenticated_client.post(
            f"/api/v1/ordrer/{TEST_ORDRE_2['ordreid']}/detaljer", json=new_detalj
        )
        assert response.status_code == 200

        data = response.json()
        assert data["produktid"] == new_detalj["produktid"]
        assert data["antall"] == new_detalj["antall"]
        assert "unik" in data

    @pytest.mark.asyncio
    async def test_add_ordre_detalj_to_nonexistent_order(
        self, authenticated_client: AsyncClient
    ):
        """Test adding detail to non-existent order returns 404."""
        new_detalj = {
            "produktid": TEST_PRODUKT_1["produktid"],
            "antall": 5.0,
            "pris": 25.00,
        }

        response = await authenticated_client.post(
            "/api/v1/ordrer/99999/detaljer", json=new_detalj
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_ordre_detalj(self, authenticated_client: AsyncClient):
        """Test updating an order detail."""
        update_data = {
            "produktid": TEST_ORDREDETALJ_1["produktid"],
            "antall": 15.0,
            "pris": 30.00,
        }

        response = await authenticated_client.put(
            f"/api/v1/ordrer/{TEST_ORDREDETALJ_1['ordreid']}/detaljer/{TEST_ORDREDETALJ_1['unik']}",
            json=update_data,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["antall"] == update_data["antall"]

    @pytest.mark.asyncio
    async def test_update_ordre_detalj_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test updating non-existent order detail returns 404."""
        update_data = {
            "produktid": TEST_PRODUKT_1["produktid"],
            "antall": 10.0,
            "pris": 25.00,
        }

        response = await authenticated_client.put(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}/detaljer/999",
            json=update_data,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_ordre_detalj(self, authenticated_client: AsyncClient):
        """Test deleting an order detail."""
        # First add a detail to delete
        new_detalj = {
            "produktid": TEST_PRODUKT_1["produktid"],
            "antall": 1.0,
            "pris": 10.00,
        }

        add_response = await authenticated_client.post(
            f"/api/v1/ordrer/{TEST_ORDRE_2['ordreid']}/detaljer", json=new_detalj
        )
        assert add_response.status_code == 200
        unik = add_response.json()["unik"]

        # Now delete it
        response = await authenticated_client.delete(
            f"/api/v1/ordrer/{TEST_ORDRE_2['ordreid']}/detaljer/{unik}"
        )
        assert response.status_code == 200
        assert "slettet" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_delete_ordre_detalj_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test deleting non-existent order detail returns 404."""
        response = await authenticated_client.delete(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}/detaljer/999"
        )
        assert response.status_code == 404


class TestOrdrerCreate:
    """Tests for POST /ordrer/ endpoint."""

    @pytest.mark.asyncio
    async def test_create_ordre(self, authenticated_client: AsyncClient):
        """Test creating a new order."""
        new_ordre = {
            "kundeid": TEST_KUNDE_1["kundeid"],
            "kundenavn": TEST_KUNDE_1["kundenavn"],
            "ordredato": str(date.today()),
            "leveringsdato": str(date.today()),
            "informasjon": "Test ny ordre",
        }

        response = await authenticated_client.post("/api/v1/ordrer/", json=new_ordre)
        assert response.status_code == 200

        data = response.json()
        assert data["kundeid"] == new_ordre["kundeid"]
        assert data["kundenavn"] == new_ordre["kundenavn"]
        assert "ordreid" in data

    @pytest.mark.asyncio
    async def test_create_ordre_minimal_fields(
        self, authenticated_client: AsyncClient
    ):
        """Test creating order with minimal required fields."""
        new_ordre = {
            "kundeid": TEST_KUNDE_1["kundeid"],
        }

        response = await authenticated_client.post("/api/v1/ordrer/", json=new_ordre)
        assert response.status_code == 200

        data = response.json()
        assert data["kundeid"] == new_ordre["kundeid"]

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_ordre_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            "/api/v1/ordrer/", json={"kundeid": TEST_KUNDE_1["kundeid"]}
        )
        assert response.status_code == 401


class TestOrdrerUpdate:
    """Tests for PUT /ordrer/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_ordre(self, authenticated_client: AsyncClient):
        """Test updating an order."""
        update_data = {
            "informasjon": "Oppdatert informasjon",
        }

        response = await authenticated_client.put(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}", json=update_data
        )
        assert response.status_code == 200

        data = response.json()
        assert data["informasjon"] == update_data["informasjon"]

    @pytest.mark.asyncio
    async def test_update_ordre_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent order."""
        response = await authenticated_client.put(
            "/api/v1/ordrer/99999", json={"informasjon": "Test"}
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_ordre_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}", json={"informasjon": "Test"}
        )
        assert response.status_code == 401


class TestOrdrerCancel:
    """Tests for DELETE /ordrer/{id} endpoint (cancel)."""

    @pytest.mark.asyncio
    async def test_cancel_ordre(self, authenticated_client: AsyncClient):
        """Test canceling an order."""
        # First create an order to cancel
        new_ordre = {
            "kundeid": TEST_KUNDE_1["kundeid"],
            "kundenavn": "Ordre til kansellering",
        }
        create_response = await authenticated_client.post(
            "/api/v1/ordrer/", json=new_ordre
        )
        assert create_response.status_code == 200
        ordre_id = create_response.json()["ordreid"]

        # Cancel the order
        response = await authenticated_client.delete(f"/api/v1/ordrer/{ordre_id}")
        assert response.status_code == 200
        assert "kansellert" in response.json()["message"].lower()

    @pytest.mark.asyncio
    async def test_cancel_ordre_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent order."""
        response = await authenticated_client.delete("/api/v1/ordrer/99999")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_cancel_ordre_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete(f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}")
        assert response.status_code == 401


class TestOrdreDuplicate:
    """Tests for POST /ordrer/{id}/duplicate endpoint."""

    @pytest.mark.asyncio
    async def test_duplicate_ordre(self, authenticated_client: AsyncClient):
        """Test duplicating an order."""
        response = await authenticated_client.post(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}/duplicate"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["ordreid"] != TEST_ORDRE_1["ordreid"]  # New ID
        assert data["kundeid"] == TEST_ORDRE_1["kundeid"]  # Same customer
        assert "kopi" in data["informasjon"].lower()  # Contains copy note

    @pytest.mark.asyncio
    async def test_duplicate_ordre_not_found(self, authenticated_client: AsyncClient):
        """Test 404 for non-existent order."""
        response = await authenticated_client.post("/api/v1/ordrer/99999/duplicate")
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_duplicate_ordre_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}/duplicate"
        )
        assert response.status_code == 401


class TestOrdreStatusUpdate:
    """Tests for PUT /ordrer/{id}/status endpoint."""

    @pytest.mark.asyncio
    async def test_update_ordre_status(self, authenticated_client: AsyncClient):
        """Test updating order status."""
        # Create a new order to update status
        new_ordre = {
            "kundeid": TEST_KUNDE_1["kundeid"],
            "kundenavn": "Status test ordre",
        }
        create_response = await authenticated_client.post(
            "/api/v1/ordrer/", json=new_ordre
        )
        assert create_response.status_code == 200
        ordre_id = create_response.json()["ordreid"]

        # Update status
        response = await authenticated_client.put(
            f"/api/v1/ordrer/{ordre_id}/status?status_id=2"
        )
        assert response.status_code == 200
        assert "message" in response.json()

    @pytest.mark.asyncio
    async def test_update_ordre_status_not_found(
        self, authenticated_client: AsyncClient
    ):
        """Test 404 for non-existent order."""
        response = await authenticated_client.put(
            "/api/v1/ordrer/99999/status?status_id=2"
        )
        assert response.status_code == 404

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_ordre_status_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            f"/api/v1/ordrer/{TEST_ORDRE_1['ordreid']}/status?status_id=2"
        )
        assert response.status_code == 401


class TestOrdreBatchStatus:
    """Tests for POST /ordrer/batch/status endpoint."""

    @pytest.mark.asyncio
    async def test_batch_update_status(self, authenticated_client: AsyncClient):
        """Test batch updating order status."""
        # Create test orders for batch update
        ordre_ids = []
        for i in range(2):
            new_ordre = {
                "kundeid": TEST_KUNDE_1["kundeid"],
                "kundenavn": f"Batch test {i}",
            }
            create_response = await authenticated_client.post(
                "/api/v1/ordrer/", json=new_ordre
            )
            assert create_response.status_code == 200
            ordre_ids.append(create_response.json()["ordreid"])

        # Batch update status
        response = await authenticated_client.post(
            f"/api/v1/ordrer/batch/status?ordre_ids={ordre_ids[0]}&ordre_ids={ordre_ids[1]}&status_id=2"
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "updated_count" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_batch_update_status_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post(
            f"/api/v1/ordrer/batch/status?ordre_ids={TEST_ORDRE_1['ordreid']}&status_id=2"
        )
        assert response.status_code == 401
