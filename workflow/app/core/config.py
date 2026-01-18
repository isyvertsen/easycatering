"""Configuration for workflow service.

This imports the main configuration from backend and adds workflow-specific settings.
"""
import sys
from pathlib import Path

# Add backend to Python path so we can import from it
backend_path = Path(__file__).parent.parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Import backend configuration
from app.core.config import Settings, settings

__all__ = ["Settings", "settings"]
