# Backend Kode-Review Rapport

**Prosjekt:** LKC (Larvik Kommune Catering) Backend
**Dato:** 2025-12-26
**Reviewer:** Claude Code

---

## Sammendrag

### Overordnet vurdering: **MODERAT**

Backend-prosjektet er generelt godt strukturert med konsistent bruk av FastAPI, SQLAlchemy og Pydantic. Det er imidlertid noen viktige områder som krever oppmerksomhet, spesielt rundt sikkerhet og testdekning.

### Statistikk

| Metrikk | Antall |
|---------|--------|
| API endpoints (@router) | 177 |
| Modell-filer | 22 |
| Test-filer | 22 |
| print() statements | 6 |
| TODO/FIXME kommentarer | 0 |

### Funn per kategori

| Kategori | Kritisk | Høy | Medium | Lav |
|----------|---------|-----|--------|-----|
| Sikkerhet | 1 | 2 | 1 | 0 |
| API Design | 0 | 0 | 1 | 2 |
| Database | 0 | 2 | 2 | 0 |
| Kodekvalitet | 0 | 1 | 2 | 2 |
| Testing | 0 | 1 | 1 | 0 |
| Error Handling | 0 | 1 | 1 | 0 |

---

## Detaljerte Funn

### 1. Sikkerhet

#### KRITISK: SQL Injection-risiko i CRUD-modul

**Problem:** Generisk CRUD-modul (`app/api/crud.py`) bygger SQL-spørringer dynamisk med tabellnavn og kolonnenavn hentet direkte fra brukerinput.

**Fil:** `app/api/crud.py:113-134`

**Detaljer:**
```python
# Linje 113-114
query = f"SELECT * FROM {table_name}"
count_query = f"SELECT COUNT(*) FROM {table_name}"

# Linje 134
query += f" ORDER BY {sort_by} {'DESC' if sort_desc else 'ASC'}"
```

**Prioritet:** Kritisk

**Løsning:**
- Valider `table_name` mot en hviteliste av tillatte tabeller
- Bruk parameteriserte spørringer for alle verdier
- Vurder å fjerne denne generiske CRUD-modulen og bruke dedikerte endpoints

---

#### HØY: Potensielt usikker EAN-management endpoint

**Problem:** EAN-management endpoint (`app/api/v1/ean_management.py:57`) bruker f-string for å bygge SQL-spørring med `category_filter` parameter.

**Fil:** `app/api/v1/ean_management.py:53-82`

**Detaljer:**
```python
category_filter = "AND p.kategoriid != 12" if exclude_numbered else ""
sql = text(f"""
    ...
    {category_filter}
    ...
""")
```

**Prioritet:** Høy

**Løsning:** Selv om denne spesifikke bruken er sikker (hardkodet verdi), er mønsteret risikabelt. Bruk parameteriserte spørringer konsekvent.

---

#### HØY: AUTH_BYPASS-konfigurasjon

**Problem:** `AUTH_BYPASS`-innstillingen tillater å omgå autentisering i utviklingsmiljø.

**Fil:** `app/core/config.py:23`, `app/api/deps.py:31-47`

**Detaljer:** Selv om det er en sjekk for produksjonsmiljø, er denne funksjonaliteten risikabel hvis miljøvariabler settes feil.

**Prioritet:** Høy

**Løsning:**
- Vurder å fjerne AUTH_BYPASS fullstendig
- Alternativt: Legg til en dobbel sjekk (f.eks. sjekk for DEBUG flag)

---

#### MEDIUM: Hardkodede standardverdier for database-credentials

**Problem:** Database-URL inneholder standardverdier med credentials.

**Fil:** `app/core/config.py:33-36`

**Detaljer:**
```python
DATABASE_URL: str = Field(
    default="postgresql+asyncpg://postgres:postgres@localhost:5432/catering",
    ...
)
```

**Prioritet:** Medium

**Løsning:** Fjern standardverdier med passord, krev eksplisitt konfigurasjon.

---

### 2. API Design

#### MEDIUM: Inkonsistent endpoint-navngiving

**Problem:** Noen endpoints bruker ikke kebab-case konsekvent.

**Fil:** `app/api/v1/__init__.py`

**Detaljer:**
- `/askony` burde være `/asko-ny` (allerede fikset til `/asko-ny-produkter`)
- `/meny-produkt` er inkonsekvent med andre plural-former

**Prioritet:** Medium

**Løsning:** Gjennomgå og standardiser alle endpoint-prefiks til kebab-case.

---

#### LAV: Manglende paginering på flere endpoints

**Problem:** Noen list-endpoints returnerer alle resultater uten paginering.

**Fil:** `app/api/v1/kunder.py:15-49`, `app/api/v1/leverandorer.py`

**Detaljer:** `get_kunder` har `limit=100` som standard, men ingen eksplisitt pagineringsrespons med total count.

**Prioritet:** Lav

**Løsning:** Standardiser pagineringsresponser på alle list-endpoints.

---

#### LAV: Matinfo-router mangler prefix

**Problem:** Matinfo-router inkluderes uten prefix i router-konfigurasjon.

**Fil:** `app/api/v1/__init__.py:41-42`

**Detaljer:**
```python
api_router.include_router(matinfo.router, tags=["matinfo-products"])
api_router.include_router(product_search.router, tags=["product-search"])
```

**Prioritet:** Lav

**Løsning:** Vurder å legge til eksplisitt prefix for bedre API-organisering.

---

### 3. Database og SQLAlchemy

#### HØY: Potensielle N+1 query-problemer

**Problem:** Flere endpoints laster relaterte data uten eager loading.

**Fil:** `app/api/v1/produkter.py:113-115`

**Detaljer:**
```python
query = base_query.offset(skip).limit(limit)
result = await db.execute(query)
produkter = result.scalars().all()
# Produkter har relationships som kan forårsake N+1
```

**Prioritet:** Høy

**Løsning:** Bruk `selectinload` eller `joinedload` for relationships som trengs.

**Positiv observasjon:** Mange steder bruker allerede `selectinload` korrekt (f.eks. i `menu_management.py`, `matinfo.py`).

---

#### HØY: Manglende indekser på ofte-søkte felt

**Problem:** Søkefelt i produkter mangler trolig indekser.

**Fil:** `app/api/v1/produkter.py:80-90`

**Detaljer:**
```python
base_query = base_query.where(
    or_(
        ProdukterModel.produktnavn.ilike(search_term),
        ProdukterModel.visningsnavn.ilike(search_term),
        ProdukterModel.leverandorsproduktnr.ilike(search_term),
        ProdukterModel.ean_kode.ilike(search_term),
        ...
    )
)
```

**Prioritet:** Høy

**Løsning:** Legg til indekser på `produktnavn`, `visningsnavn`, `ean_kode` i migrasjoner.

---

#### MEDIUM: Syntaksfeil i produkter.py

**Problem:** Referanse til ikke-eksisterende modell.

**Fil:** `app/api/v1/produkter.py:329, 400, 572`

**Detaljer:**
```python
.where(MatinfoMatinfoProduct.id.in_(product_ids))  # Feil: MatinfoMatinfoProduct
```
Korrekt er `MatinfoProduct.id`.

**Prioritet:** Medium

**Løsning:** Endre `MatinfoMatinfoProduct` til `MatinfoProduct`.

---

#### MEDIUM: Lazy loading på Kunder.gruppe relationship

**Problem:** `lazy="joined"` er satt på gruppe-relationship, som kan være tungt.

**Fil:** `app/models/kunder.py:49`

**Detaljer:**
```python
gruppe = relationship("Kundegruppe", ..., lazy="joined")
```

**Prioritet:** Medium

**Løsning:** Vurder å bruke `lazy="selectin"` eller `lazy="select"` og eksplisitt laste når nødvendig.

---

### 4. Kodekvalitet

#### HØY: print() statements i produksjonskode

**Problem:** 6 print-statements finnes i koden.

**Filer:**
- `app/services/dish_name_generator.py:30` - print i error-håndtering
- `app/services/matinfo_sync.py:505` - print etter sync
- `app/core/config.py:94` - OK (dokumentasjon)
- `app/api/v1/label_templates.py:191-197` - Metode heter `log_print` (OK)

**Prioritet:** Høy

**Løsning:** Erstatt print() med logger.info() eller logger.debug().

---

#### MEDIUM: Duplisert MatinfoSearchResult-schema

**Problem:** Inline Pydantic-modeller definert i endpoint-filer i stedet for schemas/.

**Fil:** `app/api/v1/produkter.py:225-268`

**Detaljer:** `MatinfoAllergenInfo`, `MatinfoNutrientInfo`, `MatinfoSearchResult`, etc. er definert direkte i endpoint-filen.

**Prioritet:** Medium

**Løsning:** Flytt til `app/schemas/matinfo.py` for gjenbruk.

---

#### MEDIUM: Bare except: uten spesifikk exception

**Problem:** Noen steder fanger alle exceptions uten spesifisering.

**Fil:** `app/api/v1/matinfo.py:847`

**Detaljer:**
```python
except:
    pass
```

**Prioritet:** Medium

**Løsning:** Spesifiser exception-type eller logg feilen.

---

#### LAV: Inkonsistent bruk av Optional

**Problem:** Noen schemas bruker `Optional[T] = None` og andre `T | None`.

**Fil:** `app/api/v1/ean_management.py:20`

**Detaljer:**
```python
ean_kode: str | None  # Python 3.10+ syntax
```

**Prioritet:** Lav

**Løsning:** Standardiser på én stil (anbefaler `str | None` for moderne Python).

---

#### LAV: Manglende docstrings

**Problem:** Noen service-funksjoner mangler docstrings.

**Prioritet:** Lav

**Løsning:** Legg til docstrings på public functions, spesielt i services/.

---

### 5. Testing

#### HØY: Lav testdekning for kritiske endpoints

**Problem:** 22 testfiler vs 177 endpoints antyder utilstrekkelig testdekning.

**Detaljer:**
- Tester finnes primært for: matinfo, produkter, gtin, nutrition
- Mangler: ordrer, kunder, ansatte, leverandorer, kategorier, etc.

**Prioritet:** Høy

**Løsning:** Prioriter integrasjonstester for CRUD-operasjoner på alle hovedmodeller.

---

#### MEDIUM: Test-konfigurasjon bruker produksjonsdatabase

**Problem:** Test-database-URL utledes fra DATABASE_URL med string-replace.

**Fil:** `tests/conftest.py:15`

**Detaljer:**
```python
TEST_DATABASE_URL = settings.DATABASE_URL.replace("/_dev", "/test_nkclarvikkommune")
```

**Prioritet:** Medium

**Løsning:** Bruk dedikert TEST_DATABASE_URL miljøvariabel.

---

### 6. Error Handling

#### HØY: Inkonsistent feilhåndtering

**Problem:** Noen endpoints kaster HTTPException direkte, andre bruker sentrale handlers.

**Fil:** Flere filer i `app/api/v1/endpoints/`

**Detaljer:**
```python
# Direkte HTTPException (brukes mange steder)
raise HTTPException(status_code=500, detail=str(e))

# Vs. custom exceptions fra app/core/exceptions.py (mindre brukt)
```

**Prioritet:** Høy

**Løsning:** Bruk konsekvent de sentrale exception-klassene fra `app/core/exceptions.py`.

---

#### MEDIUM: Exception-handlers fanger for bredt

**Problem:** `generic_exception_handler` fanger alle Exception.

**Fil:** `app/core/exceptions.py:237`

**Detaljer:** Dette er nødvendig som catch-all, men kan skjule spesifikke feil under utvikling.

**Prioritet:** Medium

**Løsning:** Logg stack trace alltid, vurder Sentry-integrasjon.

---

### 7. Performance

#### Info: Positiv observasjon - Eager loading

Mange endpoints bruker `selectinload` korrekt for å unngå N+1:
- `app/api/v1/menu_management.py`
- `app/api/v1/combined_dishes.py`
- `app/api/v1/matinfo.py`

#### Info: Redis-caching

Redis-klient initialiseres i `enhanced_product_search.py` med graceful fallback hvis utilgjengelig.

---

## Handlingsplan

### Kritisk (Må fikses umiddelbart)

1. **Fiks SQL injection i crud.py**
   - Valider tabellnavn mot hviteliste
   - Bruk kun parameteriserte spørringer

### Høy prioritet

2. **Fjern AUTH_BYPASS eller styrk sikkerhetssjekker**
3. **Fiks syntaksfeil i produkter.py (MatinfoMatinfoProduct)**
4. **Erstatt print() med logger**
5. **Øk testdekning for hovedendpoints**
6. **Standardiser feilhåndtering med custom exceptions**
7. **Legg til database-indekser for søkefelt**

### Medium prioritet

8. **Flytt inline Pydantic-modeller til schemas/**
9. **Fjern hardkodede database-credentials fra defaults**
10. **Fiks bare except: statements**
11. **Konfigurer dedikert test-database-URL**

### Lav prioritet

12. **Standardiser endpoint-navngiving**
13. **Legg til manglende docstrings**
14. **Standardiser Optional-syntax**
15. **Vurder paginering på alle list-endpoints**

---

## Positive Funn

- **God prosjektstruktur**: Klar separasjon mellom api/, models/, schemas/, services/
- **Konsistent autentisering**: Alle v1-endpoints bruker `get_current_user`
- **Sentralisert exception handling**: God infrastruktur i `app/core/exceptions.py`
- **Moderne stack**: FastAPI, SQLAlchemy 2.0 async, Pydantic v2
- **Migrasjonssystem**: Custom migrations system er godt dokumentert
- **Eager loading**: Mange steder bruker selectinload korrekt
- **API dokumentasjon**: OpenAPI docs tilgjengelig på /api/docs

---

*Rapport generert: 2025-12-26*
