"""Test application startup."""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_app_starts():
    """Test that the FastAPI app starts correctly."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Catering System API"
        assert data["version"] == "0.1.0"
        assert data["docs"] == "/api/docs"


@pytest.mark.asyncio
async def test_api_docs_available():
    """Test that API documentation is available."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Check OpenAPI schema
        response = await client.get("/api/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert schema["info"]["title"] == "Catering System API"
        assert schema["info"]["version"] == "0.1.0"