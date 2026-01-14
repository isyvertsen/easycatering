# Changelog

All notable changes to the LKC Catering System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
