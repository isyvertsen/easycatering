# Backend Tests

This directory contains the test suite for the Catering System backend.

## Test Structure

```
tests/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for API endpoints
├── features/          # BDD feature tests
└── conftest.py        # Test configuration and fixtures
```

## Running Tests

Using `uv` and Python 3.12:

```bash
# Create virtual environment
uv venv --python 3.12

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app --cov-report=html

# Run specific test file
python -m pytest tests/unit/test_config.py

# Run with verbose output
python -m pytest -v
```

## Test Coverage

Current test coverage focuses on:
- Configuration loading and validation
- Health check endpoints
- Authentication bypass in development mode
- Basic API structure

## Development Mode Testing

When `AUTH_BYPASS=true` and `DEBUG=true` are set in the environment:
- Authentication is bypassed for all endpoints
- A development user (dev@localhost) is automatically used
- This allows for easier testing during development

## Adding New Tests

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test API endpoints with mocked external dependencies
3. **Feature Tests**: Use BDD approach for testing complete user workflows

## Test Requirements

- Python 3.12
- All dependencies in requirements.txt
- `.env` file with test configuration (copy from `.env.development`)

## Notes

- Tests use SQLite in-memory database for speed
- External services (Redis, PostgreSQL) are mocked in unit tests
- Integration tests may require actual services running