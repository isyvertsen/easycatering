# Note to Self - Easycatering Project Status

**Sist oppdatert:** 2026-01-13

## Prosjektoversikt

Larvik Kommune Catering (LKC) System - fullstack catering-applikasjon med:
- **Backend:** FastAPI + PostgreSQL + Redis
- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Versjon:** 2.5.11

---

## Dagens fremgang (2026-01-13)

### UI-forbedringer (PR #108 - Merget)

| Endring | Fil | Beskrivelse |
|---------|-----|-------------|
| Menyer pagination | `menus/page.tsx` | Lagt til fungerende søk og pagination |
| Kompakte tabeller | `components/ui/table.tsx` | Redusert padding (h-12→h-9, p-4→py-2 px-3) |
| Søkbar kundevelger | `menus/weekly-plan/page.tsx` | Combobox med søk i stedet for Select |
| Varebok filtrering | `admin/varebok/page.tsx` | Klikkbare status-kort, pagination (max 100) |
| Dialog freeze fix | 3 filer | Fikset nestede dialoger som frøs UI |

### Nestede Dialog Fixes

Fikset problem der UI frøs når to dialoger var åpne samtidig:

| Fil | Problem | Løsning |
|-----|---------|---------|
| `admin/varebok/page.tsx` | AlertDialog på toppen av Dialog | Lukk Dialog før AlertDialog |
| `settings/preparation-instructions/page.tsx` | AI Dialog på toppen av Create Dialog | Lukk Create først |
| `products/ean-management/page.tsx` | Create Dialog fra Preview Dialog | Lukk Preview først |

**Mønster:** Bruk `setTimeout(..., 0)` mellom lukking og åpning for å sikre cleanup.

---

### Performance Analyse

Gjennomført full ytelsesanalyse av frontend og backend. **17 GitHub issues opprettet.**

#### Frontend Issues (#109-116)

| # | Issue | Prioritet |
|---|-------|-----------|
| #109 | N+1 query i produkter page | High |
| #110 | Manglende useMemo | High |
| #111 | Debounce på søk | High |
| #112 | Query invalidation | Medium |
| #113 | CartContext memoization | Medium |
| #114 | Kalkyler pagination | Medium |
| #115 | Lazy load dependencies | Low |
| #116 | ProductCard memoization | Medium |

#### Backend Issues (#117-125)

| # | Issue | Prioritet |
|---|-------|-----------|
| #117 | N+1 kunde.gruppe i ordrer | Critical |
| #118 | aiofiles for async I/O | Critical |
| #119 | Database indekser for søk | Critical |
| #120 | asyncio.gather for parallelle queries | High |
| #121 | Connection pool størrelse | High |
| #122 | Cartesian product i eager loading | High |
| #123 | Pagination response for kunder | High |
| #124 | FK-indekser | High |
| #125 | Redis caching for søk | Medium |

---

## Sikkerhetsforbedringer (Tidligere fullført)

Alle 16 sikkerhets-issues er løst:

#### Kritiske (🔴) - PR #88 (Merget)
| Issue | Beskrivelse | Status |
|-------|-------------|--------|
| #70 | Exposed credentials i .env | ✅ Fikset |
| #71 | Ubeskyttede anonymiserings-endepunkter | ✅ Fikset |
| #72 | AUTH_BYPASS aktivert | ✅ Fikset |
| #73 | XSS via document.write() | ✅ Fikset |

#### Høy prioritet (🟠) - PR #88 (Merget)
| Issue | Beskrivelse | Status |
|-------|-------------|--------|
| #74 | SQL Injection i generic CRUD | ✅ Fikset |
| #75 | File upload uten MIME validering | ✅ Fikset |
| #76 | localStorage uten validering | ✅ Fikset |
| #77 | Mermaid security level loose | ✅ Fikset |

#### Medium prioritet (🟡) - PR #89 (Merget)
| Issue | Beskrivelse | Status |
|-------|-------------|--------|
| #78 | Ingen rate limiting | ✅ Fikset med Redis |
| #79 | JWT kan ikke revokeres | ✅ Fikset med Redis blacklist |
| #80 | CORS for permissiv | ✅ Fikset |
| #81 | Ingen søkelengde-begrensning | ✅ Fikset |
| #82 | OAuth auto-linking | ✅ Fikset |
| #83 | Svak CRON API-nøkkel | ✅ Fikset |

#### Lav prioritet (🟢) - PR #89 (Merget)
| Issue | Beskrivelse | Status |
|-------|-------------|--------|
| #84 | DB-navn i health endpoint | ✅ Fikset |
| #85 | Manglende schema validering | ✅ Fikset |

---

## Åpne Performance Issues

### Høy Prioritet (Bør fikses snart)
- [ ] #109 - N+1 query i produkter (frontend)
- [ ] #111 - Debounce på søk (frontend)
- [ ] #117 - N+1 kunde.gruppe (backend)
- [ ] #118 - aiofiles (backend)
- [ ] #119 - Database indekser (backend)
- [ ] #121 - Connection pool (backend)

### Medium Prioritet
- [ ] #110, #112, #113, #114, #116 (frontend)
- [ ] #120, #122, #123, #124, #125 (backend)

### Lav Prioritet
- [ ] #115 - Lazy load dependencies

---

## Test Issues (BDD)

Test-infrastruktur med BDD-mønster planlagt:

| # | Issue | Status |
|---|-------|--------|
| #91 | Test-infrastruktur grunnlag | Åpen |
| #92 | Kunder API tester | Åpen |
| #93 | Produkter API tester | Åpen |
| #94-100 | Andre API tester | Åpen |

---

## Neste steg

1. [ ] Fiks kritiske backend performance issues (#117, #118, #119)
2. [ ] Fiks høy-prioritet frontend issues (#109, #111)
3. [ ] Øk connection pool (#121)
4. [ ] Implementer BDD test-infrastruktur (#91)

---

## Viktige filer endret i dag

### Frontend
```
src/app/(main)/menus/page.tsx              # Pagination + søk
src/app/(main)/menus/weekly-plan/page.tsx  # Søkbar kundevelger
src/app/(main)/admin/varebok/page.tsx      # Status filter + pagination + dialog fix
src/app/(main)/settings/preparation-instructions/page.tsx  # Dialog fix
src/app/(main)/products/ean-management/page.tsx  # Dialog fix
src/components/ui/table.tsx                # Kompakte tabeller
src/lib/api/menus.ts                       # API parametre
```

### Backend
```
app/api/v1/meny.py                         # Pagination response
```

---

## Redis konfigurasjon

```
REDIS_URL=redis://default:<password>@<host>:6379/0
```

Redis brukes nå til:
- Rate limiting
- JWT token blacklist
- Produkt-søk caching (eksisterende)
- **Planlagt:** API response caching (#125)
