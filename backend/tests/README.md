# Backend Tests

This directory contains the test suite for the Catering System backend.

## Test Structure

```
tests/
├── conftest.py          # Test configuration, fixtures, database setup
├── fixtures/            # Fixed test data with predictable values
│   ├── users.py         # Test users (id >= 9000)
│   ├── customers.py     # Test customers and groups
│   ├── suppliers.py     # Test suppliers
│   ├── categories.py    # Test categories
│   ├── products.py      # Test products
│   └── orders.py        # Test orders and details
├── features/            # BDD feature files (Gherkin)
│   ├── kunder.feature   # Customer API scenarios
│   ├── produkter.feature# Product API scenarios
│   └── ordrer.feature   # Order API scenarios
├── step_defs/           # BDD step definitions
│   ├── conftest.py      # Shared Given/When/Then steps
│   ├── test_kunder.py   # Customer test scenarios
│   ├── test_produkter.py# Product test scenarios
│   └── test_ordrer.py   # Order test scenarios
├── unit/                # Unit tests for individual components
└── integration/         # Integration tests
```

## Test Data (Fixtures)

All test data uses IDs starting at **9000+** to avoid collision with production data.

### Key Test Data:
- **TEST_USER** (id: 9001) - Regular user: test@lkc.no / test123
- **TEST_ADMIN** (id: 9002) - Admin user: admin@lkc.no / admin123
- **TEST_KUNDE_1** (kundeid: 9001) - "Test Barnehage"
- **TEST_KUNDE_2** (kundeid: 9002) - "Test Skole"
- **TEST_PRODUKT_1** (produktid: 9001) - "Test Melk 1L"

## Running Tests

Using `uv`:

```bash
# Run all tests
uv run pytest

# Run BDD tests only
uv run pytest tests/step_defs/ -v

# Run with verbose BDD output
uv run pytest tests/step_defs/ -v --gherkin-terminal-reporter

# Run specific feature
uv run pytest tests/step_defs/test_kunder.py -v

# Run unit tests only
uv run pytest tests/unit/ -v

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Run tests multiple times to verify predictability
for i in {1..5}; do uv run pytest tests/step_defs/test_kunder.py -v; done
```

## BDD Test Pattern (Given-When-Then)

Tests use **pytest-bdd** for Behavior Driven Development:

### Feature File Example:
```gherkin
Feature: Kunder API
  Background:
    Given databasen er seedet med testdata

  Scenario: Hente liste over kunder
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/kunder"
    Then responsen skal ha status 200
    And responsen skal inneholde minst 2 elementer
```

### Step Definition Example:
```python
from pytest_bdd import scenarios

# Import all scenarios from feature file
scenarios("../features/kunder.feature")

# Shared steps are in step_defs/conftest.py
```

## Test Database

Tests use a dedicated test database (`test_nkclarvikkommune`) that is:
1. Dropped and recreated for each test
2. Seeded with fixed test data
3. Completely isolated from production

## Adding New Tests

### 1. Add new fixture data:
```python
# tests/fixtures/new_entity.py
TEST_ENTITY_1 = {
    "id": 9001,  # Use IDs >= 9000
    # ... fields
}
```

### 2. Create feature file:
```gherkin
# tests/features/new_entity.feature
Feature: New Entity API
  Scenario: Get entity
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/entities"
    Then responsen skal ha status 200
```

### 3. Create step definitions:
```python
# tests/step_defs/test_new_entity.py
from pytest_bdd import scenarios
scenarios("../features/new_entity.feature")
```

## Requirements

- Python 3.11+
- PostgreSQL (test database)
- All dependencies in pyproject.toml
