# Issues

## Open Issues

(Ingen åpne issues)

---

## Closed Issues

### ISSUE-001: Implementer CRUD for brukere
**Prioritet:** CRITICAL
**Status:** Closed
**Opprettet:** 2026-01-08
**Lukket:** 2026-01-08

**Beskrivelse:**
Det mangler fullstendig CRUD-funksjonalitet for brukerhåndtering i systemet.
Brukere skal være koblet mot ansatte (`tblansatte`) via `ansattid`.

**Implementert løsning:**
Utvidet eksisterende `users`-tabell med `ansattid` og `rolle` kolonner.

**Backend (LKCserver-backend/):**
- [x] Migration: `AddAnsattIdAndRolleToUsers` i `app/core/migrations.py`
- [x] Model: Oppdatert `app/domain/entities/user.py` med ansattid, rolle og relationship
- [x] Model: Oppdatert `app/models/ansatte.py` med back_populates relationship
- [x] Schemas: `app/schemas/bruker.py` (BrukerBase, BrukerCreate, BrukerUpdate, BrukerMedAnsatt)
- [x] API: `app/api/v1/bruker.py` med alle CRUD-endepunkter:
  - `GET /api/v1/brukere` - Liste med pagination, søk, filtrering
  - `GET /api/v1/brukere/{id}` - Hent bruker med ansatt-info
  - `POST /api/v1/brukere` - Opprett (validerer ansattid, hasher passord)
  - `PUT /api/v1/brukere/{id}` - Oppdater
  - `DELETE /api/v1/brukere/{id}` - Soft delete (is_active=false)
  - `POST /api/v1/brukere/{id}/activate` - Reaktiver bruker
  - `GET /api/v1/brukere/ansatt/{ansattid}` - Hent bruker for ansatt
- [x] Router registrert i `app/api/v1/__init__.py`

**Frontend (LKCserver-frontend/):**
- [x] Typer: `Bruker`, `BrukerCreate`, `BrukerUpdate`, `AnsattInfo` i `src/types/models.ts`
- [x] API-klient: `src/lib/api/brukere.ts`
- [x] Hooks: `src/hooks/useBrukere.ts` (useBrukereList, useBruker, useCreateBruker, etc.)
- [x] Form: `src/components/users/user-form.tsx` med ansatt-velger dropdown
- [x] Admin-side: `src/app/admin/users/page.tsx` med DataTable, opprett/rediger dialog

**Sikkerhet:**
- [x] Kun admin-brukere kan administrere brukere (require_admin check)
- [x] Passord hashet med bcrypt (eksisterende get_password_hash)
- [x] Passord returneres ALDRI i API-responser
- [ ] Rate limiting (ikke implementert - kan legges til senere)

**Filer endret:**
- `LKCserver-backend/app/core/migrations.py`
- `LKCserver-backend/app/domain/entities/user.py`
- `LKCserver-backend/app/models/ansatte.py`
- `LKCserver-backend/app/schemas/bruker.py` (ny)
- `LKCserver-backend/app/api/v1/bruker.py` (ny)
- `LKCserver-backend/app/api/v1/__init__.py`
- `LKCserver-frontend/src/types/models.ts`
- `LKCserver-frontend/src/lib/api/brukere.ts` (ny)
- `LKCserver-frontend/src/hooks/useBrukere.ts` (ny)
- `LKCserver-frontend/src/components/users/user-form.tsx` (ny)
- `LKCserver-frontend/src/app/admin/users/page.tsx`
