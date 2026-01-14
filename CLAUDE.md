# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Larvik Kommune Catering (LKC) System - a full-stack catering management application with separate frontend and backend directories.

## Build & Run Commands

### Backend (backend/)
```bash
# Install dependencies (uses uv, NOT pip directly)
uv pip install -r pyproject.toml

# Run dev server (port 8000)
./scripts/start-dev.sh
# OR: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests (requires database)
uv run pytest

# Run tests with coverage
uv run pytest --cov

# Seed test database
uv run python tests/seed_data.py
```

### Frontend (frontend/)
```bash
npm install
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests (watch mode)
npm run test:ci      # Jest tests (CI mode)

# Playwright E2E tests (manually start servers first!)
npx playwright test
```

## Testing Requirements

**IMPORTANT**: Servers must be started manually before running E2E tests:
- Backend on port 8000
- Frontend on port 3001 (Playwright expects this port)
- Tests require a running PostgreSQL database

## Architecture

### Backend (FastAPI + PostgreSQL)
```
app/
├── api/v1/        # REST endpoints
├── core/          # Config, security, migrations
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic
└── infrastructure/# Database handling
```

### Frontend (Next.js 15 + React 19)
```
src/
├── app/           # Next.js App Router pages
├── components/    # React components (ui/, layout/, crud/)
├── hooks/         # Custom React hooks
├── lib/           # API client and utilities
└── types/         # TypeScript definitions
```

## Critical Database Information

Two separate product tables exist:

1. **`matinfo_products`** - READ-ONLY lookup table from Matinfo.no (nutritional data)
2. **`tblprodukter`** - Main product catalog for the catering system

These are linked via `ean_kode` field.

## Database Migrations

Uses **custom migration system** (NOT Alembic):
- Migrations defined in `app/core/migrations.py`
- Run automatically at startup
- Tracked in `_migrations` table

To add a migration:
1. Create class inheriting from `Migration`
2. Implement `up()` method
3. Register in `get_migration_runner()`

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Python files | snake_case | `kunde_gruppe.py` |
| API endpoints | kebab-case | `/kunde-gruppe` |
| Python classes | PascalCase | `KundeGruppe` |

## API Configuration

- Backend: `http://localhost:8000/api`
- API Docs: `http://localhost:8000/api/docs`
- Frontend: `http://localhost:3000`

## Key Technologies

**Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis (cache), uv (package manager)

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Query, NextAuth, Playwright, Jest

## Version Bumping

**VIKTIG**: Hver gang en PR opprettes, SKAL versjonen økes (PATCH bump).

Versjon finnes i to filer som ALLTID må være synkronisert:
- `frontend/package.json` (version felt)
- `backend/pyproject.toml` (version felt)

Eksempel: 2.6.1 → 2.6.2

Gjør dette FØR du lager PR, ikke etter.
