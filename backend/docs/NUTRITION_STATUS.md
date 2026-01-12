# Næringsberegning Status

## Oversikt
Arbeid med å implementere og teste næringsberegning for oppskrifter (tbl_rpkalkyle).

**NOTE**: Denne dokumentasjonen er fra tidligere arbeid. Se backend/CLAUDE.md for siste endringer.

## Hva er gjort

### 1. Fikset Matinfo Database Modeller
**Problem**: Modellene i `matinfo_products.py` refererte til tabellnavn og kolonnenavn som ikke matchet databasen.

**Løsning**: Oppdatert alle tre modeller (OPPDATERT 2025-10-22):
- `MatinfoProduct`: Bruker tabellnavn `matinfo_products` (oppdatert fra `products`)
- `MatinfoAllergen`: Bruker tabellnavn `matinfo_allergens` (oppdatert fra `allergens`)
- `MatinfoNutrient`: Bruker tabellnavn `matinfo_nutrients` (oppdatert fra `nutrients`)

Endret også kolonnenavn for å matche database (f.eks. `item_number` → `itemnumber`).

**Fil**: `/Volumes/WD1tb/code/ravi/LkcServer/catering-system/backend/app/models/matinfo_products.py`

### 2. Verifisert Database Tabeller
Bekreftet at følgende tabeller eksisterer i `catering_db`:
- ✅ `matinfo_products` - Matinfo produktkatalog (OPPDATERT fra `products`)
- ✅ `matinfo_allergens` - Allergener (OPPDATERT fra `allergens`)
- ✅ `matinfo_nutrients` - Næringsverdier (OPPDATERT fra `nutrients`)
- ✅ `tbl_rpkalkyle` - Oppskrifter
- ✅ `tbl_rpkalkyledetaljer` - Oppskriftsingredienser
- ✅ `tblprodukter` - Intern produktkatalog (MAIN products table)
- ✅ `users` - Brukerkontoer

### 3. Identifisert API Endepunkt
Endepunktet for næringsberegning (OPPDATERT 2025-10-22):
- **URL**: `GET /api/v1/oppskrifter/{kalkylekode}/naering` (oppdatert fra `/rpkalkyle/`)
- **Fil**: `/Volumes/WD1tb/code/ravi/LkcServer/catering-system/backend/app/api/v1/oppskrifter.py:278` (renamed from `rpkalkyle.py`)
- **Implementasjon**: Komplett, bruker `tbl_rpkalkyle` og Matinfo-data

## Problem Løst ✅

### Duplikat Tabell-definisjon
**Problem**: Backend kunne ikke starte pga. dupliserte tabell-definisjoner.
- `products_new.py` og `matinfo_products.py` definerte begge tabellene `products`, `allergens`, `nutrients`
- Dette forårsaket SQLAlchemy feil: "Table 'products' is already defined for this MetaData instance"

**Løsning**:
1. **Renamed `products_new.py` til `matinfo_products.py`** (som brukeren foretrakk)
2. **Oppdaterte alle imports** i 7 filer:
   - `app/models/__init__.py`
   - `app/api/v1/produkter.py`
   - `app/api/v1/oppskrifter.py` (renamed from rpkalkyle.py)
   - `app/services/nutrition_calculator.py`
   - `app/services/matinfo_sync.py`
   - `app/services/enhanced_product_search.py`
   - `app/services/product_search.py`
   - `app/services/product_export.py`
3. **Fikset kolonnenavn**: Endret `product_id` til `productid` i oppskrifter.py:343

### Resultat
Næringsendepunktet fungerer nå perfekt! `/api/v1/oppskrifter/2/naering` returnerer (OPPDATERT endpoint):
- Totale næringsverdier for oppskriften
- Næringsverdier per porsjon
- Næringsverdier for hver ingrediens

**Eksempel respons for "Risgrøt" (22 porsjoner)**:
```json
{
  "kalkylekode": 2,
  "kalkylenavn": "Risgrøt",
  "portions": 22,
  "total_nutrition": {
    "energy_kj": 4608.6,
    "energy_kcal": 1094.6,
    "protein": 36.78,
    ...
  },
  "nutrition_per_portion": {
    "energy_kj": 209.48,
    "energy_kcal": 49.75,
    ...
  }
}
```

## Status ✅

### Næringsberegning Fungerer!
Næringsendepunktet returnerer korrekte data for oppskrift #2 (Risgrøt):

**Database verdier** (tbl_rpkalkyledetaljer):
- Margarin (produktid 235): 12g ✓
- Salt (produktid 349): 1g ✓
- H-melk (produktid 1288): 800ml ✓
- Grøtris (produktid 1436): 140g ✓
- Vann/kraft (produktid 1574): 1 dl ✓
- **Total: 1053g**

**Matinfo Data**: 4 av 5 ingredienser har næringsinformasjon
| Produktid | Produktnavn | EAN kode | Matinfo Status |
|-----------|-------------|----------|----------------|
| 235 | Margarin | 07036110009735 | ✅ Finnes |
| 349 | Salt | 05701027004259 | ✅ Finnes |
| 1288 | H-melk | 07038010000232 | ✅ Finnes |
| 1436 | Grøtris | 07035620005664 | ✅ Finnes |
| 1574 | Vann/kraft | 27035620042465 | ⚠️  Ingen næring (vann) |

**Resultat**: 80% dekning - kvalitet "god"

### Kode Refaktorering Fullført ✅
**Problem**: Dårlig filnavngiving med "products_new.py"

**Løsning**:
1. Omdøpt `app/api/v1/products_new.py` → `app/api/v1/matinfo.py`
2. Omdøpt `app/schemas/products_new.py` → `app/schemas/matinfo.py`
3. Oppdatert imports i:
   - `app/api/v1/__init__.py`
   - `app/api/v1/matinfo.py`
4. Endret API tag fra "products-detail" til "matinfo-products"

**Resultat**: Ingen flere filer med "new/old" i navnet!

## Neste Steg

1. **Teste frontend-integrasjon**: Verifiser at "Beregn næringsverdier" knappen i frontend fungerer
2. **Test med flere oppskrifter**: Sikre at næringsberegning fungerer for ulike oppskrifter
3. **Dokumentere API**: Legg til eksempler i API-dokumentasjon for næringsendepunktet
4. **Forbedre datakvalitet-rapportering**: Vis hvilke ingredienser som mangler data i frontend

## Database Konfigurasjon

```
Database: catering_db
User: catering_user
Host: localhost
Port: 15432
Password: change_me_in_production
```

## Testing Commands

```bash
# Test næringsendepunkt (OPPDATERT URL)
curl -X 'GET' 'http://localhost:8000/api/v1/oppskrifter/2/naering' -H 'accept: application/json'

# Sjekk database tabeller
PGPASSWORD='change_me_in_production' psql -h localhost -p 15432 -U catering_user -d catering_db -c "\dt"

# Sjekk oppskrift data
PGPASSWORD='change_me_in_production' psql -h localhost -p 15432 -U catering_user -d catering_db -c "SELECT * FROM tbl_rpkalkyle WHERE kalkylekode = 2"
```

## Kode Referanser

### API Endepunkt
`/Volumes/WD1tb/code/ravi/LkcServer/catering-system/backend/app/api/v1/oppskrifter.py:278` (OPPDATERT fra rpkalkyle.py)

### Matinfo Modeller
`/Volumes/WD1tb/code/ravi/LkcServer/catering-system/backend/app/models/matinfo_products.py`

### Frontend Komponenter
- `/Volumes/WD1tb/code/ravi/LkcServer/catering-system/frontend/src/components/recipes/calculate-nutrition-button.tsx`
- `/Volumes/WD1tb/code/ravi/LkcServer/catering-system/frontend/src/components/recipes/nutrition-display.tsx`
