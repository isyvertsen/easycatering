"""Test configuration settings."""
import pytest
from app.core.config import settings


def test_settings_loaded():
    """Test that settings are properly loaded."""
    assert settings.APP_NAME == "Catering System API"
    assert settings.DEBUG is True  # From .env.development
    assert settings.AUTH_BYPASS is True  # From .env.development
    

def test_cors_origins_parsing():
    """Test CORS origins are parsed correctly."""
    assert isinstance(settings.CORS_ORIGINS, list)
    assert "http://localhost:3000" in settings.CORS_ORIGINS


def test_reportbro_config():
    """Test ReportBro configuration is loaded."""
    assert settings.REPORTBRO_RUNSERVER == "https://www.reportbro.com/report/run"
    assert settings.REPORTBRO_APIKEY == "12312222"
    assert settings.REPORTBRO_DEFAULTLABELID == "494d0f8f-d69b-42fe-81ed-2d957940fc7a"


def test_google_oauth_config():
    """Test Google OAuth configuration is set."""
    # Check that OAuth credentials are configured (values from environment)
    assert settings.GOOGLE_CLIENT_ID is not None
    assert settings.GOOGLE_CLIENT_SECRET is not None