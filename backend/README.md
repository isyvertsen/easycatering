# LKC Backend

Backend API for Larvik Kommunale Catering System.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL med SQLAlchemy ORM
- **Autentisering**: JWT med refresh tokens, Google OAuth
- **Cache**: Redis
- **Package Manager**: uv

## Prosjektstruktur

```
├── app/
│   ├── api/v1/         # API endpoints
│   ├── core/           # Konfigurasjon, sikkerhet, migrasjoner
│   ├── models/         # SQLAlchemy modeller
│   ├── schemas/        # Pydantic schemas
│   ├── services/       # Forretningslogikk
│   └── infrastructure/ # Database-håndtering
├── docs/               # Dokumentasjon og OpenAPI spec
├── scripts/            # Shell og Python scripts
└── tests/              # Tester og HTTP test-filer
```

## Oppsett

### Forutsetninger

- Python 3.11+
- PostgreSQL
- Redis (valgfritt, for caching)

### Installasjon

```bash
# Installer uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Installer dependencies
uv pip install -r pyproject.toml

# Kopier environment fil
cp .env.example .env
# Rediger .env med dine database-innstillinger
```

### Kjøring

```bash
# Development server
./scripts/start-dev.sh

# Eller manuelt
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Dokumentasjon

Når serveren kjører:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Database Migrasjoner

Prosjektet bruker et **egendefinert migrasjonssystem** (ikke Alembic).

Migrasjoner kjøres automatisk ved oppstart. For å legge til ny migrasjon:

1. Opprett ny klasse i `app/core/migrations.py` som arver fra `Migration`
2. Implementer `up()` metoden
3. Registrer i `get_migration_runner()`

## Testing

```bash
# Kjør alle tester
uv run pytest

# Med coverage
uv run pytest --cov

# Seed test database
uv run python tests/seed_data.py
```

## Scripts

Nyttige scripts i `scripts/` mappen:

| Script | Beskrivelse |
|--------|-------------|
| `create_admin_user.py` | Opprett admin bruker |
| `anonymize_customers.py` | Anonymiser kundedata |
| `fix_gtin_codes.py` | Fiks GTIN/EAN koder |
| `run_migrations.py` | Kjør migrasjoner manuelt |

## Environment Variables

Se `.env.example` for påkrevde environment variables.

## Dokumentasjon

Ytterligere dokumentasjon finnes i `docs/` mappen:

- `MENU_SYSTEM_DESIGN.md` - Menysystem design
- `NUTRITION_STATUS.md` - Ernæringsinformasjon status
- `name_mappings.md` - Navnekonvensjoner
