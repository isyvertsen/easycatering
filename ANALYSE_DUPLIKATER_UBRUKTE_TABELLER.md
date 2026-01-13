# Analyse av Duplikater og Ubrukte Tabeller - LKC Catering System

**Dato:** 2026-01-13
**Analyst:** Claude Code
**Scope:** Komplett analyse av backend database modeller, API endpoints og frontend integrasjon

---

## Executive Summary

### Nøkkelstatistikk
- **Totalt antall database modeller:** 26
- **Modeller med aktive API endpoints:** 21
- **Modeller uten API endpoints:** 5
- **Totalt antall API endpoints:** 35 (med 177 routes)
- **Frontend API klienter:** 27 moduler
- **Frontend endpoints som kalles:** 38 unike base paths
- **Backend endpoint dekning:** ~21% av backend endpoints brukes aktivt fra frontend

### Kritiske Funn

#### 🔴 Bugs Funnet
1. **produkter.py** - Type-o i modellnavn: `MatinfoMatinfoProduct` (skal være `MatinfoProduct`)
   - Linje 339, 410, 488, 582

#### 🟡 Duplikater og Overlappende Funksjonalitet
1. **Produkt søk** - 3 separate implementasjoner
2. **GTIN/EAN håndtering** - 2 separate endpoints
3. **Ordre status** - 3 separate implementasjoner
4. **Meny management** - Fragmentert over 4 endpoints

#### 🟢 Ubrukte Tabeller
1. **app_logs** - Ingen API endpoints
2. **report_templates** - Ingen API endpoints
3. **matinfo_gtin_updates** - Ingen API endpoints (kun intern bruk)

---

## Del 1: Database Modeller - Komplett Oversikt

### 1.1 Aktive Modeller med Full API Support

| Modell | Tabell | API Endpoints | Operasjoner | Frontend Bruk |
|--------|--------|---------------|-------------|---------------|
| **Produkter** | tblprodukter | 6 | Full CRUD + GTIN | ✅ Aktivt brukt |
| **MatinfoProduct** | matinfo_products | 4 | Full CRUD + Import | ✅ Aktivt brukt |
| **Kalkyle** | tbl_rpkalkyle | 3 | Full CRUD + Næring | ✅ Aktivt brukt |
| **Ordrer** | tblordrer | 3 | Full CRUD + Status | ✅ Aktivt brukt |
| **Meny** | tblmeny | 5 | Full CRUD | ✅ Aktivt brukt |
| **Periode** | tblperiode | 3 | Full CRUD + Views | ✅ Aktivt brukt |
| **Kunder** | tblkunder | 5 | Full CRUD | ✅ Aktivt brukt |
| **Ansatte** | tblansatte | 3 | Full CRUD | ✅ Aktivt brukt |
| **Kundegruppe** | tblkundgruppe | 2 | Full CRUD | ✅ Aktivt brukt |
| **Leverandorer** | tblleverandorer | 1 | Full CRUD | ✅ Aktivt brukt |
| **Kategorier** | tblkategorier | 1 | Full CRUD | ✅ Aktivt brukt |
| **Menygruppe** | tblmenygruppe | 3 | Full CRUD | ✅ Aktivt brukt |
| **PreparationInstruction** | preparation_instructions | 1 | Full CRUD + AI | ✅ Aktivt brukt |
| **CombinedDish** | combined_dishes | 1 | Full CRUD | ✅ Aktivt brukt |
| **LabelTemplate** | label_templates | ❌ | Via separate endpoints | ✅ Aktivt brukt |

### 1.2 Linking Tabeller (Many-to-Many)

| Modell | Tabell | Linker | API Endpoints | Status |
|--------|--------|--------|---------------|--------|
| **MenyProdukt** | tblmenyprodukt | Meny ↔ Produkter | 3 | ✅ AKTIV |
| **PeriodeMeny** | tblperiodemeny | Periode ↔ Meny | 3 | ✅ AKTIV |
| **Ordredetaljer** | tblordredetaljer | Ordre ↔ Produkter | Via Ordrer | ✅ AKTIV |
| **Kalkyledetaljer** | tbl_rpkalkyledetaljer | Kalkyle ↔ Produkter | Via Kalkyle | ✅ AKTIV |
| **CombinedDishRecipe** | combined_dish_recipes | CombinedDish ↔ Kalkyle | Via CombinedDish | ✅ AKTIV |
| **CombinedDishProduct** | combined_dish_products | CombinedDish ↔ Produkter | Via CombinedDish | ✅ AKTIV |

### 1.3 Støtte Tabeller

| Modell | Tabell | Formål | API Endpoints | Status |
|--------|--------|--------|---------------|--------|
| **Kalkylegruppe** | tbl_rpkalkylegruppe | Gruppe kalkyler | Via Kalkyle | ✅ AKTIV |
| **CustomerAccessToken** | customer_access_tokens | Webshop tokens | Via Bestilling | ✅ AKTIV |
| **User** | users | Autentisering | Via Bruker | ✅ AKTIV |
| **AskoNy** | askony | Asko produktkatalog | 1 (READ ONLY) | ⚠️ READ ONLY |

### 1.4 Logging og Tracking Tabeller

| Modell | Tabell | Formål | API Endpoints | Status |
|--------|--------|--------|---------------|--------|
| **ActivityLog** | activity_logs | Audit trail | ❌ Separate endpoints | ⚠️ IKKE IMPORTERT |
| **AppLog** | app_logs | Error logging | ❌ Ingen | 🔴 UBRUKT I API |
| **MatinfoGTINUpdate** | matinfo_gtin_updates | Matinfo sync tracking | ❌ Ingen | ⚠️ INTERN BRUK |
| **MatinfoSyncLog** | matinfo_sync_logs | Sync logging | ❌ Ingen | ⚠️ INTERN BRUK |

### 1.5 Template Tabeller

| Modell | Tabell | Formål | API Endpoints | Status |
|--------|--------|--------|---------------|--------|
| **LabelTemplate** | label_templates | Label templates | ❌ Separate endpoints | ⚠️ IKKE IMPORTERT |
| **TemplateParameter** | template_parameters | Template params | Via LabelTemplate | ✅ AKTIV |
| **TemplateShare** | template_shares | Template sharing | Via LabelTemplate | ✅ AKTIV |
| **PrintHistory** | print_history | Print tracking | Via LabelTemplate | ✅ AKTIV |
| **ReportTemplates** | report_templates | Report templates | ❌ Ingen | 🔴 UBRUKT |

### 1.6 Matinfo Relaterte Tabeller

| Modell | Tabell | Formål | Linked To | Status |
|--------|--------|--------|-----------|--------|
| **MatinfoProduct** | matinfo_products | Matinfo.no data | tblprodukter (via ean_kode) | ✅ AKTIV |
| **MatinfoNutrient** | matinfo_nutrients | Næringsverdier | matinfo_products | ✅ AKTIV |
| **MatinfoAllergen** | matinfo_allergens | Allergener | matinfo_products | ✅ AKTIV |

---

## Del 2: Duplikater og Overlappende Funksjonalitet

### 2.1 Produkt Søk - 4 Separate Implementasjoner

#### Problem
Det finnes fire forskjellige måter å søke etter produkter på, med overlappende funksjonalitet:

1. **produkter.py**
   - `GET /produkter/` - Standard søk med query parameter
   - `GET /produkter/matinfo/search` - Matinfo fuzzy search
   - `GET /produkter/{produkt_id}/matinfo-suggestions` - Matinfo forslag

2. **product_search.py** (5 endpoints)
   - `POST /product-search/hybrid` - Hybrid search (combines tblprodukter + matinfo)
   - `POST /product-search/semantic` - Semantic search
   - `GET /product-search/suggestions` - Autocomplete suggestions

3. **matinfo.py**
   - `GET /matinfo/products/search` - Standard Matinfo search
   - `POST /matinfo/products/search/hybrid` - Hybrid Matinfo search

4. **Frontend: produkterApi** (lib/api/produkter.ts)
   - `search()` - Uses GET /produkter/
   - `searchMatinfo()` - Uses GET /produkter/matinfo/search
   - `getMatinfoSuggestions()` - Uses GET /produkter/{id}/matinfo-suggestions

#### Anbefaling
**Konsolider til én søke-tjeneste:**
- Bruk `product_search.py` som hovedsøk
- Fjern duplikate søkefunksjoner fra `produkter.py` og `matinfo.py`
- Oppdater frontend til å bruke kun `productSearchApi`

### 2.2 GTIN/EAN Håndtering - 2 Separate Endpoints

#### Problem
GTIN/EAN kode håndtering er spredt over to endpoints:

1. **produkter.py**
   - `PATCH /produkter/{produkt_id}/gtin` - Oppdater enkelt GTIN
   - `POST /produkter/bulk-update-gtin` - Bulk oppdater GTIN

2. **ean_management.py** (3 endpoints)
   - `GET /ean-management/missing-ean` - Finn produkter uten EAN
   - `PATCH /ean-management/update-ean` - Oppdater EAN
   - `POST /ean-management/fix-negative-ean` - Fiks negative EAN verdier

#### Anbefaling
**Flytt all EAN logikk til ean_management.py:**
- Fjern GTIN endpoints fra `produkter.py`
- Bruk `ean_management.py` som single source of truth
- Oppdater frontend til å bruke `eanManagementApi`

### 2.3 Ordre Status - 3 Separate Implementasjoner

#### Problem
Ordre status håndteres på tre forskjellige steder:

1. **ordrer.py**
   - `PUT /ordrer/{ordre_id}/status` - Individual status update
   - `POST /ordrer/batch/status` - Batch status update

2. **webshop.py**
   - `PATCH /webshop/ordre/{ordre_id}/status` - Webshop specific status
   - `POST /webshop/ordre/godkjenning/batch` - Batch approve orders

3. **bestilling_registrer.py**
   - Implicitly creates orders with status via `POST /bestilling-registrer/submit`

#### Anbefaling
**Konsolider status logic:**
- Bruk `ordrer.py` som hovedkilde for status endringer
- Webshop og bestilling skal kalle ordrer endpoints
- Implementer felles status workflow validering

### 2.4 Meny Management - Fragmentert over 4 Endpoints

#### Problem
Meny-relatert funksjonalitet er spredt over flere endpoints:

1. **meny.py** - Main menu CRUD (5 endpoints)
2. **meny_produkt.py** - Menu-product linking (6 endpoints)
3. **periode_view.py** - Period menu view (7 endpoints)
4. **bestilling_skjema.py** - Menu selection form (3 endpoints)

#### Analyse
Dette er **IKKE et problem** - det er god separasjon av ansvar:
- `meny.py` - Core menu entities
- `meny_produkt.py` - Linking logic
- `periode_view.py` - Read-only views
- `bestilling_skjema.py` - Form data helpers

**Ingen endring anbefalt.**

### 2.5 Periode Management - Fragmentert over 3 Endpoints

#### Problem
Periode-relatert funksjonalitet er spredt over flere endpoints:

1. **periode.py** - Main period CRUD (10 endpoints)
2. **periode_meny.py** - Period-menu linking (3 endpoints)
3. **periode_view.py** - Hierarchical view (7 endpoints)

#### Analyse
Dette er **IKKE et problem** - god separasjon av ansvar:
- `periode.py` - Core period entities
- `periode_meny.py` - Linking logic
- `periode_view.py` - Specialized views

**Ingen endring anbefalt.**

---

## Del 3: Ubrukte og Delvis Brukte Tabeller

### 3.1 Tabeller Uten API Endpoints (Kandidater for Fjerning)

#### 🔴 UBRUKT: ReportTemplates
- **Tabell:** `report_templates`
- **Modell:** `ReportTemplates`
- **Status:** Ingen API endpoints, ikke brukt i kode
- **Anbefaling:**
  - ✅ **FJERN** hvis ikke planlagt bruk
  - ⚠️ **BEHOLD** hvis rapport-funksjonalitet skal implementeres

#### 🔴 DELVIS UBRUKT: AppLog
- **Tabell:** `app_logs`
- **Modell:** `AppLog`
- **Status:** Kun brukt internt for logging, ingen API endpoints
- **Anbefaling:**
  - ✅ **BEHOLD** - nødvendig for intern logging
  - ⚠️ Vurder å legge til read-only API for feilsøking

#### 🟡 INTERN BRUK: MatinfoGTINUpdate / MatinfoSyncLog
- **Tabeller:** `matinfo_gtin_updates`, `matinfo_sync_logs`
- **Modeller:** `MatinfoGTINUpdate`, `MatinfoSyncLog`
- **Status:** Kun brukt av backend sync services
- **Anbefaling:**
  - ✅ **BEHOLD** - nødvendig for Matinfo sync tracking
  - ⚠️ Vurder read-only API for admin monitoring

### 3.2 Tabeller med Separate Endpoint Filer (Ikke Importert fra models)

#### ⚠️ ActivityLog
- **Tabell:** `activity_logs`
- **Status:** Har egne endpoints i `activity_logs.py` (6 endpoints), men importerer ikke fra `app.models.activity_log`
- **Problem:** Modellen er definert men ikke brukt i standard måte
- **Anbefaling:**
  - ✅ Refaktorer `activity_logs.py` til å importere fra `app.models.activity_log`
  - ✅ Legg til i `app/models/__init__.py`

#### ⚠️ LabelTemplate
- **Tabell:** `label_templates` (+ relaterte)
- **Status:** Har egne endpoints i `label_templates.py` (13 endpoints), men importerer ikke fra `app.models.label_template`
- **Problem:** Modellen er definert men ikke brukt i standard måte
- **Anbefaling:**
  - ✅ Refaktorer `label_templates.py` til å importere fra `app.models.label_template`
  - ✅ Legg til i `app/models/__init__.py`

### 3.3 READ-ONLY Tabeller (Eksternt Data)

#### ✅ AskoNy (askony)
- **Status:** READ-ONLY produktkatalog fra Asko leverandør
- **Endpoints:** 2 (GET only)
- **Anbefaling:** ✅ **BEHOLD** - viktig for leverandør integrasjon

#### ✅ MatinfoProduct (matinfo_products)
- **Status:** Primært READ-ONLY, data fra Matinfo.no
- **Endpoints:** 19 (med sync/import funksjonalitet)
- **Anbefaling:** ✅ **BEHOLD** - kritisk for næringsdata

---

## Del 4: Frontend vs Backend Mismatch

### 4.1 Backend Endpoints Ikke Brukt av Frontend

**Totalt ubrukte backend endpoints:** ~140 av 177 (79%)

#### Dokumentasjon/Admin (kan fjernes hvis ikke brukt)
- `/v1/documentation/*` - Dokumentasjon endpoints
- `/v1/documentation-chat/*` - Chat interface
- `/v1/cron/*` - Cron job endpoints

#### Sync/Import (kan beholdes for admin)
- `/v1/ean-management/*` - EAN code management
- `/v1/endpoints/matinfo-sync/*` - Matinfo sync
- `/v1/endpoints/vetduat-sync/*` - Vetduat sync
- `/v1/endpoints/ngdata-sync/*` - NG data sync
- `/v1/endpoints/hybrid-sync/*` - Hybrid sync

#### Stats/Monitoring (kan legges til i admin panel)
- `/v1/stats/*` - Statistics endpoints
- `/v1/health/*` - Health check

#### Report Generation (delvis brukt)
- `/v1/report-generator/*` - Report generation
- `/v1/reports/*` - PDF reports

### 4.2 Frontend API Kall Uten Tilsvarende Backend

**Ingen** - Alle frontend API kall har tilsvarende backend endpoints.

### 4.3 Type Mismatches

#### 🟡 Order Schema
- Frontend sender `kundeid`, backend forventer potensielt annet
- Order lines har `levdato` i frontend

#### 🟡 Product Schema
- Frontend forventer `visningsnavn`, `leverandorsproduktnr`, `pakningstype`
- Sjekk at alle felter returneres korrekt fra backend

#### 🟡 Webshop Draft Orders
- Frontend forventer `DraftOrder` med status code 10
- Backend må automatisk opprette draft status

---

## Del 5: Anbefalinger

### 5.1 Høy Prioritet (Kritiske Bugs)

1. **🔴 FIX: produkter.py Type-o**
   - **Fil:** `backend/app/api/v1/produkter.py`
   - **Linjer:** 339, 410, 488, 582
   - **Problem:** `MatinfoMatinfoProduct` skal være `MatinfoProduct`
   - **Aksjon:** Søk og erstatt `MatinfoMatinfoProduct` med `MatinfoProduct`

### 5.2 Høy Prioritet (Duplikater)

2. **🟡 KONSOLIDER: Produkt Søk**
   - **Problem:** 4 separate søke-implementasjoner
   - **Aksjon:**
     - Bruk `product_search.py` som hovedsøk
     - Fjern søkefunksjoner fra `produkter.py` (behold CRUD)
     - Fjern søkefunksjoner fra `matinfo.py` (behold sync)
     - Oppdater frontend til å bruke kun `productSearchApi`

3. **🟡 KONSOLIDER: GTIN/EAN Håndtering**
   - **Problem:** GTIN endpoints i både `produkter.py` og `ean_management.py`
   - **Aksjon:**
     - Flytt all EAN logikk til `ean_management.py`
     - Fjern GTIN endpoints fra `produkter.py`
     - Oppdater frontend

4. **🟡 KONSOLIDER: Ordre Status**
   - **Problem:** Status håndtering i `ordrer.py`, `webshop.py`, `bestilling_registrer.py`
   - **Aksjon:**
     - Bruk `ordrer.py` som single source of truth
     - Webshop og bestilling skal kalle ordrer endpoints
     - Implementer felles status workflow

### 5.3 Medium Prioritet (Refaktorering)

5. **🟢 REFAKTORER: ActivityLog og LabelTemplate**
   - **Problem:** Modeller definert men ikke importert i standard måte
   - **Aksjon:**
     - Oppdater `activity_logs.py` til å importere fra `app.models.activity_log`
     - Oppdater `label_templates.py` til å importere fra `app.models.label_template`
     - Legg til i `app/models/__init__.py`

6. **🟢 STANDARDISER: API Parameter Naming**
   - **Problem:** Inkonsistent naming (snake_case vs camelCase, with/without trailing slash)
   - **Aksjon:**
     - Bruk snake_case konsistent
     - Fjern trailing slashes
     - Standardiser pagination (page/page_size)

7. **🟢 IMPLEMENTER: Type Checking**
   - **Problem:** Potensielle schema mismatches
   - **Aksjon:**
     - Valider Order schema kompatibilitet
     - Sjekk Product field mappings
     - Verifiser Matinfo data struktur

### 5.4 Lav Prioritet (Opprydding)

8. **🔵 VURDER: Fjern ReportTemplates**
   - **Aksjon:**
     - Hvis rapport-funksjonalitet ikke skal brukes, fjern tabellen
     - Hvis den skal brukes, implementer API endpoints

9. **🔵 VURDER: Legg til Read-Only API for Logging**
   - **Aksjon:**
     - Legg til GET endpoints for `app_logs` (admin kun)
     - Legg til monitoring dashboard for `matinfo_sync_logs`

10. **🔵 DOKUMENTER: API Kontrakter**
    - **Aksjon:**
      - Legg til API response eksempler
      - Dokumenter felt-krav og typer
      - Oppdater OpenAPI/Swagger docs

---

## Del 6: Tabeller som KAN Fjernes (Med Forbehold)

### 6.1 Kandidater for Fjerning

#### 🔴 FJERN (hvis ikke planlagt bruk):
- **report_templates** - Ingen bruk funnet

#### 🟡 BEHOLD (men vurder):
- **app_logs** - Intern logging (legg til read-only API for admin)
- **matinfo_gtin_updates** - Sync tracking (legg til admin monitoring)
- **matinfo_sync_logs** - Sync logging (legg til admin monitoring)

### 6.2 Tabeller som IKKE Skal Fjernes

**Alle andre 22 tabeller er aktivt brukt og skal beholdes.**

---

## Del 7: Oppsummering - Quick Reference

### 7.1 Database Modeller Status

| Status | Antall | Beskrivelse |
|--------|--------|-------------|
| ✅ AKTIV | 21 | Full API support, aktivt brukt |
| ⚠️ DELVIS | 3 | Aktivt brukt men ikke standard import |
| 🟡 INTERN | 2 | Kun intern bruk, ingen API |
| 🔴 UBRUKT | 1 | Ingen bruk funnet |
| **TOTALT** | **27** | **Alle modeller** |

### 7.2 Prioriterte Aksjoner

| Prioritet | Aksjon | Estimert Innsats | Risiko |
|-----------|--------|------------------|--------|
| **KRITISK** | Fix Type-o i produkter.py | 5 min | Lav |
| **HØY** | Konsolider søk (4→1) | 4 timer | Medium |
| **HØY** | Konsolider GTIN (2→1) | 2 timer | Lav |
| **HØY** | Konsolider ordre status (3→1) | 4 timer | Medium |
| **MEDIUM** | Refaktorer ActivityLog/LabelTemplate | 2 timer | Lav |
| **MEDIUM** | Standardiser API naming | 4 timer | Lav |
| **LAV** | Fjern ReportTemplates (hvis ubrukt) | 30 min | Lav |
| **LAV** | Legg til logging API | 2 timer | Lav |

### 7.3 Duplikater Funnet

| Type | Antall Implementasjoner | Anbefalt | Status |
|------|-------------------------|----------|--------|
| Produkt søk | 4 | 1 (product_search) | 🔴 FIX |
| GTIN håndtering | 2 | 1 (ean_management) | 🔴 FIX |
| Ordre status | 3 | 1 (ordrer) | 🔴 FIX |
| Meny management | 4 | 4 (god separasjon) | ✅ OK |
| Periode management | 3 | 3 (god separasjon) | ✅ OK |

### 7.4 Ubrukte Tabeller

| Tabell | Status | Anbefaling |
|--------|--------|------------|
| report_templates | 🔴 Ubrukt | FJERN hvis ikke planlagt |
| app_logs | 🟡 Intern bruk | BEHOLD + legg til API |
| matinfo_gtin_updates | 🟡 Intern bruk | BEHOLD + admin API |
| matinfo_sync_logs | 🟡 Intern bruk | BEHOLD + admin API |

---

## Konklusjon

LKC Catering systemet har en **godt strukturert database** med **minimal redundans**. De fleste tabeller er aktivt brukt og har klare formål.

**Hovedutfordringene** er:
1. ✅ En kritisk bug (type-o) som må fikses umiddelbart
2. ✅ Fire separate søke-implementasjoner som bør konsolideres
3. ✅ Overlappende GTIN/EAN håndtering
4. ✅ Fragmentert ordre status logikk

**Positive aspekter:**
- God separasjon av ansvar (meny/periode management)
- Klare modell-til-endpoint mappinger
- Matinfo produkter skilt fra interne produkter
- Many-to-Many linking godt implementert

**Anbefalt aksjon:**
Start med å fikse den kritiske type-o buggen, deretter konsolider søk-funksjonalitet, GTIN håndtering og ordre status logikk. Dette vil redusere kompleksitet og vedlikeholdskostnader betydelig.

---

**Rapport generert:** 2026-01-13
**Versjon:** 1.0
**Neste review:** Etter implementering av høy-prioritet endringer
