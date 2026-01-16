"""API test configuration and shared fixtures."""
import pytest
from app.core.config import settings

# Skip decorator for auth tests when AUTH_BYPASS is enabled
skip_if_auth_bypass = pytest.mark.skipif(
    settings.AUTH_BYPASS,
    reason="AUTH_BYPASS is enabled, skipping auth requirement tests"
)
