"""Tests for Webshop API endpoints.

Tests cover:
- GET /webshop/tilgang - Check webshop access
- GET /webshop/default-leveringsdato - Get default delivery date
- GET /webshop/produkter - List webshop products
- GET /webshop/produkter/{id} - Get single product
- POST /webshop/ordre - Create order
- GET /webshop/mine-ordre - List user's orders
- GET /webshop/ordre/{id} - Get single order
- GET /webshop/ordre/{id}/linjer - Get order lines
- GET /webshop/ordre/status - List orders by status (admin)
- GET /webshop/ordre/godkjenning - List orders for approval (admin)
- PATCH /webshop/ordre/{id}/status - Update order status (admin)
- POST /webshop/ordre/godkjenning/batch - Batch approve orders (admin)
- GET /webshop/ordre/token/{token} - Get order by token (no auth)
- POST /webshop/ordre/{id}/kanseller - Cancel order (admin)
- GET /webshop/draft-ordre - Get draft order
- PUT /webshop/draft-ordre - Update draft order
- DELETE /webshop/draft-ordre/{id} - Delete draft order
- POST /webshop/ordre/{id}/reopen - Reopen order
- POST /webshop/ordre/{id}/kanseller-min-ordre - Cancel own order
- POST /webshop/draft-ordre/{id}/submit - Submit draft order
"""
import pytest

from tests.api.conftest import skip_if_auth_bypass
from httpx import AsyncClient

from tests.fixtures import (
    TEST_PRODUKT_1,
)


class TestWebshopAccess:
    """Tests for webshop access endpoints."""

    @pytest.mark.asyncio
    async def test_check_webshop_access(self, authenticated_client: AsyncClient):
        """Test checking webshop access."""
        response = await authenticated_client.get("/api/v1/webshop/tilgang")
        assert response.status_code == 200

        data = response.json()
        assert "has_access" in data

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_check_webshop_access_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/webshop/tilgang")
        assert response.status_code == 401


class TestWebshopDeliveryDate:
    """Tests for delivery date endpoint."""

    @pytest.mark.asyncio
    async def test_get_default_delivery_date_no_customer(
        self, authenticated_client: AsyncClient
    ):
        """Test getting delivery date when user has no customer."""
        response = await authenticated_client.get("/api/v1/webshop/default-leveringsdato")
        # Test user is not linked to a customer, so should get 400
        assert response.status_code == 400

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_default_delivery_date_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/webshop/default-leveringsdato")
        assert response.status_code == 401


class TestWebshopProducts:
    """Tests for webshop products endpoints."""

    @pytest.mark.asyncio
    async def test_list_webshop_products_no_access(
        self, authenticated_client: AsyncClient
    ):
        """Test listing products without webshop access returns 403."""
        # Test user is not linked to a customer with webshop access
        response = await authenticated_client.get("/api/v1/webshop/produkter")
        # Should return 403 because user has no webshop access
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_webshop_products_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/webshop/produkter")
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_webshop_product_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get(
            f"/api/v1/webshop/produkter/{TEST_PRODUKT_1['produktid']}"
        )
        assert response.status_code == 401


class TestWebshopOrders:
    """Tests for webshop orders endpoints."""

    @pytest.mark.asyncio
    async def test_create_order_no_access(self, authenticated_client: AsyncClient):
        """Test creating order without webshop access returns 403."""
        order_data = {
            "ordrelinjer": [
                {"produktid": TEST_PRODUKT_1["produktid"], "antall": 1}
            ]
        }
        response = await authenticated_client.post(
            "/api/v1/webshop/ordre", json=order_data
        )
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_create_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/webshop/ordre", json={})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_my_orders_no_access(self, authenticated_client: AsyncClient):
        """Test listing orders without webshop access returns 403."""
        response = await authenticated_client.get("/api/v1/webshop/mine-ordre")
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_list_my_orders_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/webshop/mine-ordre")
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/webshop/ordre/9001")
        assert response.status_code == 401


class TestWebshopAdminOrderManagement:
    """Tests for admin order management endpoints."""

    @pytest.mark.asyncio
    async def test_list_orders_by_status_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that list orders by status requires admin role."""
        response = await authenticated_client.get("/api/v1/webshop/ordre/status?status=1")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_list_orders_by_status(self, admin_client: AsyncClient):
        """Test listing orders by status as admin."""
        response = await admin_client.get("/api/v1/webshop/ordre/status?status=1")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_list_orders_for_approval_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that list orders for approval requires admin role."""
        response = await authenticated_client.get("/api/v1/webshop/ordre/godkjenning")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_list_orders_for_approval(self, admin_client: AsyncClient):
        """Test listing orders for approval as admin."""
        response = await admin_client.get("/api/v1/webshop/ordre/godkjenning")
        assert response.status_code == 200

        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_update_order_status_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that update order status requires admin role."""
        response = await authenticated_client.patch(
            "/api/v1/webshop/ordre/9001/status", json={"ordrestatusid": 2}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_order_status_not_found(self, admin_client: AsyncClient):
        """Test 404 for non-existent order."""
        response = await admin_client.patch(
            "/api/v1/webshop/ordre/99999/status", json={"ordrestatusid": 2}
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_batch_approve_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that batch approve requires admin role."""
        response = await authenticated_client.post(
            "/api/v1/webshop/ordre/godkjenning/batch",
            json={"ordre_ids": [9001], "ordrestatusid": 2},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_batch_approve(self, admin_client: AsyncClient):
        """Test batch approve as admin."""
        response = await admin_client.post(
            "/api/v1/webshop/ordre/godkjenning/batch",
            json={"ordre_ids": [], "ordrestatusid": 2},
        )
        assert response.status_code == 200

        data = response.json()
        assert "updated_count" in data

    @pytest.mark.asyncio
    async def test_cancel_order_requires_admin(
        self, authenticated_client: AsyncClient
    ):
        """Test that cancel order requires admin role."""
        response = await authenticated_client.post(
            "/api/v1/webshop/ordre/9001/kanseller",
            json={"arsak": "Test"},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_cancel_order_not_found(self, admin_client: AsyncClient):
        """Test 404 for non-existent order."""
        response = await admin_client.post(
            "/api/v1/webshop/ordre/99999/kanseller",
            json={"arsak": "Test"},
        )
        assert response.status_code == 404


class TestWebshopOrderToken:
    """Tests for token-based order access."""

    @pytest.mark.asyncio
    async def test_get_order_by_token_invalid(self, client: AsyncClient):
        """Test that invalid token returns 404."""
        response = await client.get("/api/v1/webshop/ordre/token/invalidtoken123")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_confirm_receipt_by_token_invalid(self, client: AsyncClient):
        """Test that invalid token returns error."""
        response = await client.post("/api/v1/webshop/ordre/token/invalidtoken123/bekreft")
        assert response.status_code == 400


class TestWebshopDraftOrders:
    """Tests for draft order endpoints."""

    @pytest.mark.asyncio
    async def test_get_draft_order_no_access(self, authenticated_client: AsyncClient):
        """Test getting draft order without webshop access returns 403."""
        response = await authenticated_client.get("/api/v1/webshop/draft-ordre")
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_get_draft_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.get("/api/v1/webshop/draft-ordre")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_draft_order_no_access(self, authenticated_client: AsyncClient):
        """Test updating draft order without webshop access returns 403."""
        response = await authenticated_client.put(
            "/api/v1/webshop/draft-ordre",
            json={"ordrelinjer": []},
        )
        assert response.status_code == 403

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_update_draft_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.put(
            "/api/v1/webshop/draft-ordre",
            json={"ordrelinjer": []},
        )
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_delete_draft_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.delete("/api/v1/webshop/draft-ordre/9001")
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_submit_draft_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/webshop/draft-ordre/9001/submit")
        assert response.status_code == 401


class TestWebshopOrderActions:
    """Tests for order action endpoints."""

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_reopen_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/webshop/ordre/9001/reopen")
        assert response.status_code == 401

    @skip_if_auth_bypass
    @pytest.mark.asyncio
    async def test_cancel_my_order_requires_auth(self, client: AsyncClient):
        """Test that endpoint requires authentication."""
        response = await client.post("/api/v1/webshop/ordre/9001/kanseller-min-ordre")
        assert response.status_code == 401
