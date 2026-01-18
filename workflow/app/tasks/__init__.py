"""Workflow tasks module."""
from pathlib import Path
import sys

# Add backend to Python path
backend_path = Path(__file__).parent.parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))
