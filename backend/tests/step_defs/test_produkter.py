"""BDD step definitions for Produkter API tests.

This module imports scenarios from the produkter.feature file
and uses shared step definitions from conftest.py.
"""
import pytest
from pytest_bdd import scenarios

# Import all scenarios from the feature file
scenarios("../features/produkter.feature")

# All step definitions are imported from step_defs/conftest.py
# No additional steps needed for basic CRUD operations
