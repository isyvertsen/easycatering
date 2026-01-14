# Easycatering - Larvik Kommune Catering System

Full-stack monorepo for LKC (Larvik Kommune Catering) system.

## Struktur

```
easycatering/
├── frontend/          # Next.js 15 + React 19 frontend
├── backend/           # FastAPI + PostgreSQL backend
├── docs/              # Delt dokumentasjon
├── CLAUDE.md          # AI-assistanse konfigurasjon
└── ISSUES.md          # Issue tracking
```

## Quick Start

### Backend
```bash
cd backend
uv pip install -r pyproject.toml
./scripts/start-dev.sh
# API: http://localhost:8000/api/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:3000
```

## Versjoner

| Komponent | Versjon |
|-----------|---------|
| Frontend  | 2.6.0   |
| Backend   | 2.6.0   |

Se [CHANGELOG.md](CHANGELOG.md) for endringshistorikk.

## Teknologi

**Backend:** FastAPI, SQLAlchemy, PostgreSQL, Redis, UV

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui

**AI-støtte:** OpenAI, Azure OpenAI, Anthropic (Claude)

## Dokumentasjon

- [CHANGELOG](CHANGELOG.md) - Endringshistorikk
- [API Dokumentasjon](backend/docs/API_DOCUMENTATION.md)
- [Brukerveiledning](backend/docs/user-guides/README.md)
- [Rapport Guide](docs/RAPPORT_GUIDE.md)

## Lisens

Proprietary - Larvik Kommune
