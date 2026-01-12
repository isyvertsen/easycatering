# Claude Memory - LKC Backend

## Prosjektstruktur

```
├── app/              # Hovedapplikasjon
│   ├── api/v1/       # API endpoints
│   ├── core/         # Konfig, sikkerhet, migrasjoner
│   ├── models/       # SQLAlchemy modeller
│   ├── schemas/      # Pydantic schemas
│   └── services/     # Forretningslogikk
├── docs/             # Dokumentasjon + openapi.yaml
├── scripts/          # Shell og Python scripts
└── tests/            # Tester + HTTP test-filer
```

## Database: Viktig om Produkt-tabeller

Det finnes **to forskjellige** produkt-tabeller:

### 1. `matinfo_products` (Matinfo.no data)
- **READ-ONLY** oppslags-tabell fra Matinfo.no
- Inneholder ernæringsinfo og allergener
- Modell: `MatinfoProduct` i `matinfo_products.py`
- Relaterte tabeller: `matinfo_allergens`, `matinfo_nutrients`

### 2. `tblprodukter` (Interne produkter)
- **Hoved produktkatalog** for catering-systemet
- Priser, lager, kategorier
- Modell: `Produkter` i `produkter.py`
- Kobles til Matinfo via `ean_kode` felt

## Navnekonvensjoner

| Type | Konvensjon | Eksempel |
|------|------------|----------|
| Python filer | snake_case | `kunde_gruppe.py` |
| API endpoints | kebab-case | `/kunde-gruppe` |
| Klasser | PascalCase | `KundeGruppe` |

## Database Migrasjoner

**VIKTIG**: Bruk det egendefinerte migrasjonssystemet, IKKE Alembic.

- Migrasjoner i `app/core/migrations.py`
- Kjører automatisk ved oppstart
- Sporet i `_migrations` tabellen

For ny migrasjon:
1. Opprett klasse som arver fra `Migration`
2. Implementer `up()` metoden
3. Registrer i `get_migration_runner()`

## Testing

```bash
# Kjør tester
uv run pytest

# Seed test database
uv run python tests/seed_data.py

# Kjør med test database
./scripts/run_test_server.sh
```

Test database: `catering_test`

## API Konfigurasjon

- Backend: port 8000
- Frontend: port 3000
- API base: `http://localhost:8000/api`
- Docs: `http://localhost:8000/api/docs`

## Kolonner fjernet fra tblprodukter

Disse kolonnene skal IKKE være i modellen:
- allergenprodukt, energikj, kalorier, fett, mettetfett
- karbohydrater, sukkerarter, kostfiber, protein, salt
- monodisakk, matvareid, webshopsted

## Matinfo Sync - Viktige mønster

**AsyncSession håndtering:**
- Bruk alltid `AsyncSession` (ikke `Session`) med `get_db`
- IKKE del AsyncSession mellom samtidige operasjoner
- Prosesser synkronisering sekvensielt, ikke parallelt

**Foreign key constraints:**
- Ved oppdatering av `matinfo_products`: slett allergener/nutrients FØRST
- IKKE endre `id`-feltet på eksisterende produkter
- Bruk eksisterende product ID for nye relaterte records

**Feilhåndtering:**
```python
try:
    await self.db.rollback()
except Exception:
    pass  # Session kan allerede være i ugyldig tilstand
```

## Pull Requests - VIKTIG

**ALLTID sjekk om PR eksisterer før du refererer til den:**

```bash
# Sjekk PR status før du sier at den er opprettet
gh pr list --state all -L 10

# Sjekk spesifikk PR
gh pr view <PR_NUMBER>
```

**Workflow:**
1. Lag PR med `gh pr create`
2. Verifiser at PR ble opprettet med `gh pr view <number>`
3. IKKE anta at PR eksisterer - sjekk alltid først
4. Hvis PR allerede er merget, lag ny branch for nye endringer
