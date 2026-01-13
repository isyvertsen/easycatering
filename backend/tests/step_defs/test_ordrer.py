"""BDD step definitions for Ordrer API tests.

This module imports scenarios from the ordrer.feature file
and uses shared step definitions from conftest.py.
"""
import pytest
from pytest_bdd import scenarios

# Import all scenarios from the feature file
scenarios("../features/ordrer.feature")

# All step definitions are imported from step_defs/conftest.py
# No additional steps needed for basic CRUD operations
