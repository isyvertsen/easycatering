"""Test health endpoints."""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test basic health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health/")
    
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "catering-api"}


@pytest.mark.asyncio 
async def test_root_endpoint():
    """Test root endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Catering System API"
    assert data["version"] == "0.1.0"
    assert data["docs"] == "/api/docs"