# Prosjekt Status - LKC System

**Oppdatert:** 2026-01-12

---

## Git Status

### Frontend (LKCserver-frontend)

**Aktiv branch:** `feature/top-navigation-bar`

| Branch | Status | Siste commit |
|--------|--------|--------------|
| `main` | 34 commits bak | Merge PR #94 |
| `feature/top-navigation-bar` | **AKTIV** | fix: resolve merge conflict |
| `feature/bestillingsskjema-print` | Merget (PR #96) | fix: blank page issue |
| `claude/issue-87-20260108-1415` | Merget (PR #95) | fix: menu API endpoints |

**Remote branches (ikke merget):**
- `feature/reorganize-navigation-menu`
- `fix/order-422-empty-strings`
- `fix/webshop-orderline-type-errors`
- `refactor/remove-unused-sidebar`
- `claude/issue-98-20260110-0849`

---

### Backend (LKCserver-backend)

**Aktiv branch:** `claude/issue-72-20260108-1416`

| Branch | Status | Siste commit |
|--------|--------|--------------|
| `main` | 7 commits bak | Merge PR #78 |
| `claude/issue-72-20260108-1416` | **AKTIV** | fix: resolve merge conflicts |

---

## Åpne GitHub Issues

### Issue #100: Sentral ordregistrering for alle kunder
**Status:** OPEN
**Type:** Funksjonsønske (Enhancement)
**Repository:** Frontend
**Opprettet:** 2026-01-10

**Beskrivelse:**
Funksjon for sentral registrering av ordre hvor admin kan:
- Velge en kunde og registrere ordre på vegne av kunden
- Tilgang til alle webshop-varer
- Mulighet til å velge fra hele varelageret

**Nytteverdi:** Effektivisere ordrehåndtering for administrativt personale.

---

## Hva må gjøres nå?

### Prioritet 1: Synkronisere branches med main

**Frontend:**
```bash
cd LKCserver-frontend
git checkout main
git pull origin main
# Sjekk om feature/top-navigation-bar skal merges eller slettes
```

**Backend:**
```bash
cd LKCserver-backend
git checkout main
git pull origin main
# Sjekk om claude/issue-72-20260108-1416 skal merges eller slettes
```

### Prioritet 2: Rydde opp gamle branches

Vurder å slette disse remote branches hvis de er ferdig/utdatert:
- `fix/order-422-empty-strings`
- `fix/webshop-orderline-type-errors`
- `refactor/remove-unused-sidebar`
- `claude/issue-98-20260110-0849`
- `feature/reorganize-navigation-menu`

### Prioritet 3: Implementere Issue #100

Når branches er ryddet opp, kan arbeidet starte på sentral ordregistrering:
1. Lag ny branch fra main
2. Design backend API for admin-ordrer
3. Lag frontend UI for kundevalg og ordreregistrering
4. Test og merge

---

## Nylig fullført

- **PR #96:** Bestillingsskjema print-funksjon
- **PR #95:** Menu API endpoint fixes
- **PR #94:** Kunde-bestilling proxy routes
- **ISSUE-001:** CRUD for brukere (lukket 2026-01-08)

---

## Teknisk status

| Komponent | Status |
|-----------|--------|
| Backend server | Kjører på port 8000 |
| Frontend server | Stopp/start etter behov |
| Database | PostgreSQL aktiv |
| API Proxy | Fungerer via Next.js |

---

## Neste steg (anbefalt rekkefølge)

1. Bytt til main og pull siste endringer (frontend + backend)
2. Vurder om aktive branches skal merges eller slettes
3. Rydd opp remote branches som ikke lenger er nødvendige
4. Start arbeid på Issue #100 (sentral ordregistrering)
