.PHONY: install run dev test clean migrate

# Install dependencies
install:
	uv venv --python 3.12
	uv pip install -r requirements.txt

# Run in development mode
dev:
	.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run in production mode
run:
	.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Run tests
test:
	.venv/bin/python -m pytest -v

# Run tests with coverage
test-cov:
	.venv/bin/python -m pytest --cov=app --cov-report=html

# Run linting
lint:
	.venv/bin/python -m black app tests
	.venv/bin/python -m isort app tests
	.venv/bin/python -m flake8 app tests

# Run type checking
typecheck:
	.venv/bin/python -m mypy app

# Database migrations
migrate:
	.venv/bin/python -m alembic upgrade head

# Create new migration
migration:
	.venv/bin/python -m alembic revision --autogenerate -m "$(msg)"

# Clean up
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .coverage htmlcov .pytest_cache

# Run with custom port
run-port:
	.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port $(PORT)

# Run with debug logging
debug:
	.venv/bin/python -m uvicorn app.main:app --reload --log-level debug

# Quick start - install and run
start: install dev