"""Test authentication bypass in development mode."""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from app.main import app
from app.core.config import settings
from app.domain.entities.user import User


@pytest.mark.asyncio
async def test_auth_bypass_enabled():
    """Test that auth bypass is enabled in development."""
    assert settings.AUTH_BYPASS is True
    assert settings.DEBUG is True


@pytest.mark.asyncio
async def test_crud_endpoint_without_auth():
    """Test that CRUD endpoints work without authentication when AUTH_BYPASS is enabled."""
    # Mock the database call to avoid actual database connection
    mock_user = User(
        id=1,
        email="dev@localhost",
        full_name="Development User",
        is_active=True,
        is_superuser=False
    )
    
    with patch('app.api.deps.UserService') as mock_service_class:
        mock_service = AsyncMock()
        mock_service.get_by_email.return_value = mock_user
        mock_service_class.return_value = mock_service
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/tables")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)