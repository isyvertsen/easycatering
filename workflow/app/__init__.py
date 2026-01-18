"""Workflow automation service."""
from pathlib import Path
import sys

# Add backend to Python path so we can import models, schemas, etc.
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))
