"""BDD step definitions for Kunder API tests.

This module imports scenarios from the kunder.feature file
and uses shared step definitions from conftest.py.
"""
import pytest
from pytest_bdd import scenarios

# Import all scenarios from the feature file
scenarios("../features/kunder.feature")

# All step definitions are imported from step_defs/conftest.py
# No additional steps needed for basic CRUD operations
