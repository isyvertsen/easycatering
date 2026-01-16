# Changelog

All notable changes to the LKC Catering System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.7.0] - 2026-01-16

### Added
- **Kalkuleringsfunksjonalitet for oppskrifter** - Beregn automatisk ingrediensmengder og priser for et spesifikt antall porsjoner
  - Nytt API-endpoint: `POST /v1/oppskrifter/{id}/kalkuler`
  - Oppdaterer database med beregnede verdier (totalmengder og priser)
  - Automatisk enhetskonvertering via `tbl_rpTabEnheter`
  - Erstatter gammel SQL stored procedure `sp_KalkulerOppskrift`

- **PDF-rapport for oppskrifter** - Generer detaljerte produksjonsrapporter
  - Nytt API-endpoint: `GET /v1/oppskrifter/{id}/rapport-pdf`
  - Ingrediensliste sortert etter Lager-ID for effektivt vareinntak
  - Inkluderer oppskriftsdetaljer, mengder, enheter og tilleggsinformasjon
  - Valgfri kalkulering før PDF-generering
  - Genereres med ReportLab, profesjonelt layoutet

- **Ny database-modell**: `TabEnhet` for enhetstabellen `tbl_rpTabEnheter`
- **Frontend UI**: Ny seksjon "Kalkulering og Rapport" på oppskriftsside med:
  - Input-felt for antall porsjoner
  - Kalkuler-knapp med live oppdatering
  - Last ned rapport-knapp med valgfri kalkulering
  - Loading-states og feilhåndtering

- **Brukerdokumentasjon**: Oppdatert med detaljert guide for ny funksjonalitet
  - `/backend/docs/user-guides/oppskrifter.md` - Komplett guide
  - `/docs/BRUKERMANUAL.md` - Oppdatert oversikt

### Changed
- Versjon bumped fra 2.6.18 til 2.7.0 (minor version for ny funksjonalitet)

### Fixed
- `TabEnhet.kalkuler` datatype fra Integer til Boolean (match database)
- SQL case-sensitivity i rapport-query (kolonnenavn lowercase)
- Navnefeil `KalkyleGruppe` → `Kalkylegruppe` i eksisterende kode

### Technical Details
- Backend: FastAPI, SQLAlchemy, ReportLab
- Frontend: React, Next.js, TypeScript
- 5 nye unit-tester i `test_oppskrifter_api.py`
- Utviklet med assistanse fra Claude Code (Anthropic)
- GitHub Issues: #186, #187, #188
- Pull Request: #189

---

## [2.6.0] - 2026-01-14

### Added
- **Konfigurerbar AI-støtte**: Støtte for flere AI-leverandører (OpenAI, Azure OpenAI, Anthropic/Claude)
  - Ny `AI_PROVIDER` miljøvariabel for å velge leverandør
  - Konfigurerbare modeller, temperaturer og max tokens
  - AI-klientfabrikk for enkel bytte mellom leverandører

### Changed
- **Ytelsesoptimaliseringer** (Issues #109-123):
  - Fikset N+1 spørringsproblem i ordrer og kunder API
  - Lagt til database-indekser for raskere søk (pg_trgm for fuzzy-søk)
  - Optimalisert produktstatistikk - hentes nå fra backend i stedet for frontend
  - Økt database connection pool størrelse
  - Lagt til React Query caching og memoization i frontend
  - Implementert debounced søk i produktlisten

### Fixed
- Fjernet overflødig "Perioder" menyvalg (tilgjengelig via Periodevisning)

### Dependencies
- Lagt til `aiofiles` for asynkron filhåndtering
- Lagt til `anthropic` som valgfri avhengighet for Claude-støtte

---

## [2.5.11] - 2026-01-13

### Fixed
- GitHub repository referanser oppdatert til easycatering monorepo
- UseQueryOptions type i useOrdersList hook

### Added
- Kundeordrer-fane

---

## [2.5.0] - Previous Release

Se git historikk for tidligere versjoner.
