# Backend Kode Review

Utfør en grundig kode-review av backend-prosjektet (LKCserver-backend).

## Review-områder

### 1. API Design
- Sjekk at endpoints følger kebab-case konvensjon
- Verifiser konsistent response-format
- Sjekk for manglende error handling
- Vurder API versjonering (v1)
- Verifiser OpenAPI dokumentasjon

### 2. Kodekvalitet
- Sjekk navnekonvensjoner (snake_case for filer/variabler)
- Vurder SOLID-prinsipper
- Identifiser kompleksitet som kan forenkles
- Se etter duplisert forretningslogikk
- Verifiser separation of concerns (api/services/models)

### 3. SQLAlchemy og Database
- Sjekk for N+1 query problemer
- Vurder bruk av eager/lazy loading
- Identifiser manglende indekser
- Sjekk for SQL injection risiko
- Verifiser at migrasjoner er oppdaterte

### 4. Pydantic Schemas
- Sjekk at schemas matcher modeller
- Identifiser dupliserte schemas
- Vurder validering av input
- Sjekk for manglende Optional/default verdier

### 5. Test-dekning
- Sjekk at pytest tester finnes i `tests/`
- Identifiser kritiske endpoints uten tester
- Vurder test-kvalitet og assertions
- Sjekk for database fixtures

### 6. Sikkerhet
- Søk etter hardkodede credentials
- Sjekk for SQL injection risiko
- Verifiser autentisering på beskyttede endpoints
- Sjekk input-validering
- Vurder rate limiting

### 7. Dead Code og Opprydding
- Finn ubrukte imports
- Identifiser utkommentert kode
- Søk etter print() statements
- Finn TODO/FIXME kommentarer
- Sjekk for ubrukte funksjoner/klasser

### 8. Error Handling
- Sjekk for try/except uten logging
- Verifiser konsistent error responses
- Identifiser manglende error handling
- Sjekk at exceptions er spesifikke

### 9. Performance
- Identifiser tunge operasjoner
- Sjekk for unødvendige database kall
- Vurder caching (Redis)
- Se etter blocking operasjoner

### 10. Dokumentasjon
- Sjekk for docstrings på funksjoner
- Verifiser at API docs er oppdatert
- Sjekk miljøvariabler er dokumentert
- Vurder CLAUDE.md oppdateringer

## Prosjektstruktur å analysere

```
app/
├── api/v1/        # REST endpoints
├── core/          # Config, security, migrations
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic
└── infrastructure/# Database handling
```

## Output-format

### Sammendrag
- Kort oversikt over backend-tilstand
- Antall problemer funnet per kategori
- Overordnet vurdering (kritisk/moderat/bra)

### Detaljerte Funn
For hver kategori:
- **Problem**: Beskrivelse
- **Fil**: Hvilken fil(er)
- **Prioritet**: Kritisk / Høy / Medium / Lav
- **Løsning**: Konkret forslag

### Statistikk
```bash
# Kjør disse for statistikk:

# print() statements
grep -r "print(" LKCserver-backend/app --include="*.py" | wc -l

# TODO/FIXME
grep -rE "TODO|FIXME" LKCserver-backend/app | wc -l

# Antall endpoints
grep -r "@router" LKCserver-backend/app/api --include="*.py" | wc -l

# Antall modeller
find LKCserver-backend/app/models -name "*.py" ! -name "__init__.py" | wc -l

# Antall tester
find LKCserver-backend/tests -name "test_*.py" | wc -l

# try/except uten logging
grep -rA2 "except.*:" LKCserver-backend/app --include="*.py" | grep -v "logger\|logging\|raise" | wc -l
```

### Handlingsplan
Prioritert liste over oppgaver:
1. Kritiske (sikkerhet, SQL injection)
2. Høy prioritet (tester, error handling)
3. Medium (refaktorering, N+1)
4. Lav (dokumentasjon)

## Skriv rapport til fil

Etter analysen, skriv rapporten til:
`docs/code-review-backend-rapport.md`
