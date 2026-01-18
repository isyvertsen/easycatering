# Database Tabell Analyse

**Dato:** 2026-01-17
**Formål:** Identifisere ubrukte tabeller fra legacy MS Access/MSSQL migrering

---

## Sammendrag

| Kategori | Antall |
|----------|--------|
| Totalt tabeller i database | **97** |
| Tabeller med SQLAlchemy modell (i bruk) | **39** |
| Tabeller UTEN modell (potensielt ubrukt) | **58** |
| Tomme tabeller | **21** |
| Tabeller med data men ingen modell | **37** |

---

## 1. TABELLER I AKTIV BRUK (39 stk)

Disse tabellene har SQLAlchemy modeller og brukes i applikasjonen:

### Kjernedata
| Tabell | Beskrivelse |
|--------|-------------|
| `tblprodukter` | Produktkatalog |
| `tblkunder` | Kundedata |
| `tblordrer` | Ordrer |
| `tblordredetaljer` | Ordrelinjer |
| `tblordrestatus` | Ordrestatuser |
| `tblansatte` | Ansatte |
| `tblleverandorer` | Leverandører |
| `tblkategorier` | Produktkategorier |
| `tblkundgruppe` | Kundegrupper |

### Meny og Periode
| Tabell | Beskrivelse |
|--------|-------------|
| `tblmeny` | Menyer |
| `tblmenygruppe` | Menygrupper |
| `tblmenyprodukt` | Meny-produkt kobling |
| `tblperiode` | Menyperioder |
| `tblperiodemeny` | Periode-meny kobling |

### Oppskrifter/Kalkyler
| Tabell | Beskrivelse |
|--------|-------------|
| `tbl_rpkalkyle` | Oppskrifter |
| `tbl_rpkalkyledetaljer` | Oppskriftingredienser |
| `tbl_rpkalkylegruppe` | Oppskriftgrupper |
| `tbl_rptabenheter` | Enhetskonvertering |

### Matinfo (Næringsdata)
| Tabell | Beskrivelse |
|--------|-------------|
| `matinfo_products` | Produkter fra Matinfo.no |
| `matinfo_nutrients` | Næringsstoffer |
| `matinfo_allergens` | Allergener |
| `matinfo_gtin_updates` | GTIN synk-sporing |
| `matinfo_sync_logs` | Synkroniseringslogg |

### System
| Tabell | Beskrivelse |
|--------|-------------|
| `users` | Brukere |
| `user_kunder` | Bruker-kunde kobling |
| `activity_logs` | Aktivitetslogg |
| `app_logs` | Applikasjonslogg |
| `system_settings` | Systeminnstillinger |
| `_migrations` | Migrasjonshistorikk |

### Etiketter og Rapporter
| Tabell | Beskrivelse |
|--------|-------------|
| `label_templates` | Etikettmaler |
| `template_parameters` | Malparametere |
| `template_shares` | Delte maler |
| `print_history` | Utskriftshistorikk |
| `preparation_instructions` | Tilberedningsinstrukser |

### Andre
| Tabell | Beskrivelse |
|--------|-------------|
| `combined_dishes` | Kombinerte retter |
| `combined_dish_products` | Rett-produkt kobling |
| `combined_dish_recipes` | Rett-oppskrift kobling |
| `customer_access_tokens` | Kundetilgangstokens |
| `askony` | ASKO produktdata |

---

## 2. TOMME TABELLER - KAN SLETTES (21 stk)

Disse tabellene inneholder ingen data og kan slettes trygt:

```sql
-- TOMME TABELLER - SAFE TO DELETE
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS eventlog CASCADE;
DROP TABLE IF EXISTS matvarer CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS tbl_rpembalasje CASCADE;
DROP TABLE IF EXISTS tbl_systemverdier CASCADE;
DROP TABLE IF EXISTS tblasko CASCADE;
DROP TABLE IF EXISTS tblbetalingsmate CASCADE;
DROP TABLE IF EXISTS tblkjopsordredetaljer CASCADE;
DROP TABLE IF EXISTS tblkjopsordrer CASCADE;
DROP TABLE IF EXISTS tbllagertransaksjoner CASCADE;
DROP TABLE IF EXISTS tbltmpkundergruppeordre CASCADE;
DROP TABLE IF EXISTS tbltmpordre CASCADE;
DROP TABLE IF EXISTS tbltmpordrebestilling CASCADE;
DROP TABLE IF EXISTS tbltmpordrebestillingsykehjem CASCADE;
DROP TABLE IF EXISTS tblvarebestillingbekreftelseasko CASCADE;
DROP TABLE IF EXISTS tblvaremottak CASCADE;
DROP TABLE IF EXISTS test CASCADE;
DROP TABLE IF EXISTS tmpproduksjonsordre CASCADE;
DROP TABLE IF EXISTS tmptblkundersomikkeharbestilt CASCADE;
DROP TABLE IF EXISTS verificationtoken CASCADE;
```

---

## 3. TABELLER MED DATA - KREVER VURDERING (37 stk)

### 3.1 Store tabeller (bør arkiveres før sletting)

| Tabell | Rader | Beskrivelse | Mulig fremtidig bruk |
|--------|-------|-------------|---------------------|
| `tbl_rpproduksjondetaljer` | 142,092 | Produksjonsordredetaljer | Produksjonsmodul? |
| `tbllevbestillinger` | 44,219 | Leverandørbestillingslinjer | Innkjøpsmodul? |
| `tbllog` | 36,379 | Gammel aktivitetslogg | Nei - erstattet av activity_logs |
| `tbllevbestillingshode` | 4,213 | Leverandørbestillingshoder | Innkjøpsmodul? |
| `tbl_rpproduksjon` | 500 | Produksjonsordrer | Produksjonsmodul? |

### 3.2 Allergen-relaterte tabeller (mulig fremtidig bruk)

| Tabell | Rader | Beskrivelse | Kommentar |
|--------|-------|-------------|-----------|
| `tblallergener` | 14 | Allergenliste | Kan brukes for allergenhåndtering |
| `tblkalkyleallergen` | 36 | Oppskrift-allergen kobling | Kobling til oppskrifter |
| `tblprodukt_allergen` | 19 | Produkt-allergen kobling | Kobling til produkter |
| `tbl_rpkalkyldetaljer_tblallergener` | 3 | Detalj-allergen kobling | Kan slettes |

### 3.3 Leveringsrelaterte tabeller (delvis i bruk)

| Tabell | Rader | Beskrivelse | Status |
|--------|-------|-------------|--------|
| `tblsone` | 31 | Leveringssoner | **I BRUK** - etiketter.py |
| `tblruteplan` | 4 | Ruteplan | Mulig fremtidig bruk |
| `tblleveringsdag` | 5 | Leveringsdager | Mulig fremtidig bruk |

### 3.4 Kunde-relaterte tabeller

| Tabell | Rader | Beskrivelse | Anbefaling |
|--------|-------|-------------|------------|
| `tblkontaktpersoner` | 5 | Kontaktpersoner | Mulig fremtidig bruk |
| `tblkundersomikkeharbestilt` | 154 | Kunder uten bestilling | Slett - utdatert rapport |
| `tblkunde_kundeinfoprodukt` | 7 | Kunde-infoprodukt | Slett |
| `tblkundeinfoprodukt` | 4 | Kundeinfoprodukter | Slett |

### 3.5 MVA og Økonomi

| Tabell | Rader | Beskrivelse | Anbefaling |
|--------|-------|-------------|------------|
| `tblmva` | 2 | MVA-satser | Undersøk - kan være nødvendig |
| `tblmva_kundekategori` | 8 | MVA per kundekategori | Undersøk |
| `tblkontonummer` | 1 | Kontonummer | Slett |

### 3.6 Lager-relaterte tabeller

| Tabell | Rader | Beskrivelse | Anbefaling |
|--------|-------|-------------|------------|
| `tbllagerlokasjon` | 9 | Lagerlokasjoner | Mulig fremtidig bruk |
| `tbllagertransaksjonstyper` | 4 | Transaksjonstyper | Slett hvis lager ikke implementeres |

### 3.7 Diverse legacy tabeller

| Tabell | Rader | Beskrivelse | Anbefaling |
|--------|-------|-------------|------------|
| `tbl_identepostkobling` | 152 | E-post koblinger | Undersøk |
| `tblaccessmenyer` | 53 | Access menystruktur | Slett |
| `mottakskjokkenitems` | 28 | Mottakskjøkken | Slett |
| `tblmenysykehjem` | 4 | Meny sykehjem | Slett |
| `tblgarnetyr` | 3 | Garnityrer | Slett |
| `tblbestillinger` | 2 | Gamle bestillinger | Slett |
| `tblbestillingsposter` | 5 | Bestillingsposter | Slett |
| `tblkjopsordrestatus` | 3 | Kjøpsordrestatus | Slett |

### 3.8 Temp/Test tabeller (kan slettes)

| Tabell | Rader | Beskrivelse |
|--------|-------|-------------|
| `qrytmpordrebestillingtest` | 92 | Test query |
| `tmpordredetaljer` | 50 | Temp data |
| `tmpproduksjonsordredetaljer` | 26 | Temp data |
| `tmpordredetaljer2` | 2 | Temp data |
| `tsttbl2` | 1 | Test tabell |
| `lagringsfeil_ved_autokorrigering_av_navn` | 4 | Feillogg |

### 3.9 Auth legacy tabeller

| Tabell | Rader | Beskrivelse | Anbefaling |
|--------|-------|-------------|------------|
| `user` | 3 | Gammel user tabell | Slett - erstattet av `users` |
| `inn` | 3 | NextAuth legacy | Slett |

---

## 4. MULIGE FREMTIDIGE MODULER

Basert på de ubrukte tabellene kan følgende moduler vurderes implementert:

### 4.1 Produksjonsmodul
Tabeller som kan brukes:
- `tbl_rpproduksjon` - Produksjonsordrer
- `tbl_rpproduksjondetaljer` - Produksjonsdetaljer

### 4.2 Innkjøpsmodul
Tabeller som kan brukes:
- `tbllevbestillingshode` - Leverandørbestillinger
- `tbllevbestillinger` - Bestillingslinjer

### 4.3 Allergenhåndtering
Tabeller som kan brukes:
- `tblallergener` - Allergenliste
- `tblprodukt_allergen` - Produkt-allergen kobling
- `tblkalkyleallergen` - Oppskrift-allergen kobling

### 4.4 Utvidet leveringsplanlegging
Tabeller som kan brukes:
- `tblsone` - Leveringssoner (allerede i bruk)
- `tblruteplan` - Ruteplanlegging
- `tblleveringsdag` - Leveringsdager

### 4.5 Lagermodul
Tabeller som kan brukes:
- `tbllagerlokasjon` - Lagerlokasjoner
- `tbllagertransaksjonstyper` - Transaksjonstyper

---

## 5. ANBEFALINGER

### Prioritet 1 - Slett umiddelbart (lav risiko)
- 21 tomme tabeller
- Temp/test tabeller med data
- Legacy auth tabeller (`user`, `inn`)

### Prioritet 2 - Slett etter backup
- Access-relaterte tabeller (`tblaccessmenyer`)
- Utdaterte rapporttabeller (`tblkundersomikkeharbestilt`)
- Gamle logg (`tbllog`) - data finnes i `activity_logs`

### Prioritet 3 - Arkiver og slett
- Store legacy tabeller (produksjon, leverandørbestillinger)
- Eksporter til CSV/JSON før sletting

### Prioritet 4 - Behold for fremtidig bruk
- Allergen-tabeller
- Leveringsplanlegging-tabeller
- Lager-tabeller
- MVA-tabeller

---

## 6. SQL SCRIPTS

### Script for å slette tomme tabeller
Se seksjon 2 ovenfor.

### Script for å eksportere data før sletting
```sql
-- Eksempel: Eksporter tbllog til CSV
COPY tbllog TO '/tmp/tbllog_backup.csv' WITH CSV HEADER;

-- Eksempel: Eksporter leverandørbestillinger
COPY tbllevbestillinger TO '/tmp/tbllevbestillinger_backup.csv' WITH CSV HEADER;
COPY tbllevbestillingshode TO '/tmp/tbllevbestillingshode_backup.csv' WITH CSV HEADER;
```

---

## Vedlegg: Komplett tabelloversikt

### Alle 97 tabeller i databasen:
```
_migrations, account, activity_logs, app_logs, askony,
combined_dish_products, combined_dish_recipes, combined_dishes,
customer_access_tokens, eventlog, inn, label_templates,
lagringsfeil_ved_autokorrigering_av_navn, matinfo_allergens,
matinfo_gtin_updates, matinfo_nutrients, matinfo_products,
matinfo_sync_logs, matvarer, mottakskjokkenitems,
preparation_instructions, print_history, qrytmpordrebestillingtest,
session, system_settings, tbl_identepostkobling, tbl_rpembalasje,
tbl_rpkalkyldetaljer_tblallergener, tbl_rpkalkyle, tbl_rpkalkyledetaljer,
tbl_rpkalkylegruppe, tbl_rpproduksjon, tbl_rpproduksjondetaljer,
tbl_rptabenheter, tbl_systemverdier, tblaccessmenyer, tblallergener,
tblansatte, tblasko, tblbestillinger, tblbestillingsposter,
tblbetalingsmate, tblgarnetyr, tblkalkyleallergen, tblkategorier,
tblkjopsordredetaljer, tblkjopsordrer, tblkjopsordrestatus,
tblkontaktpersoner, tblkontonummer, tblkunde_kundeinfoprodukt,
tblkundeinfoprodukt, tblkunder, tblkundersomikkeharbestilt,
tblkundgruppe, tbllagerlokasjon, tbllagertransaksjoner,
tbllagertransaksjonstyper, tbllevbestillinger, tbllevbestillingshode,
tblleverandorer, tblleveringsdag, tbllog, tblmeny, tblmenygruppe,
tblmenyprodukt, tblmenysykehjem, tblmva, tblmva_kundekategori,
tblordredetaljer, tblordrer, tblordrestatus, tblperiode,
tblperiodemeny, tblprodukt_allergen, tblprodukter, tblruteplan,
tblsone, tbltmpkundergruppeordre, tbltmpordre, tbltmpordrebestilling,
tbltmpordrebestillingsykehjem, tblvarebestillingbekreftelseasko,
tblvaremottak, template_parameters, template_shares, test,
tmpordredetaljer, tmpordredetaljer2, tmpproduksjonsordre,
tmpproduksjonsordredetaljer, tmptblkundersomikkeharbestilt, tsttbl2,
user, user_kunder, users, verificationtoken
```
