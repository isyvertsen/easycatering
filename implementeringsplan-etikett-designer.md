# Implementeringsplan: Visuell Etikett-Designer

## Prosjektbeskrivelse

Utvikle en visuell etikett-designer som lar brukere designe og skrive ut etiketter til Zebra ZT510 printere via BrowserPrint. Løsningen skal støtte dynamiske parametere fra ulike datakilder.

## Teknisk Kontekst

- **Frontend**: Next.js (eksisterende applikasjon)
- **Backend**: FastAPI (eksisterende applikasjon)
- **Database**: PostgreSQL
- **Printer**: Zebra ZT510 via BrowserPrint
- **Print-format**: PDF (PDFDirect)

## Systemarkitektur

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Next.js Frontend                              │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│  pdfme Designer │  Mal-bibliotek  │  Forhåndsvisning │  BrowserPrint   │
│  (drag & drop)  │  (bruker/global)│  (live preview)  │  (printer-valg) │
└────────┬────────┴────────┬────────┴────────┬─────────┴────────┬────────┘
         │                 │                 │                  │
         ▼                 ▼                 ▼                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                                 │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│  /templates     │  /parameters    │  /labels/preview │  /labels/generate│
│  CRUD maler     │  Dynamiske felt │  PDF preview     │  PDF for print   │
└────────┬────────┴────────┬────────┴────────┬─────────┴─────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL                                     │
│  label_templates | template_parameters | template_shares | print_history│
└────────────────────────────────────────────────────────────────────────┘
```

## Teknisk Stack

| Komponent | Teknologi | Versjon |
|-----------|-----------|---------|
| Frontend designer | pdfme (@pdfme/ui, @pdfme/common, @pdfme/schemas) | ^4.0.0 |
| PDF-generering backend | FPDF2 | ^2.7.0 |
| Strekkoder | python-barcode | ^0.15.0 |
| QR-koder | qrcode | ^7.4.0 |
| Print | Zebra BrowserPrint SDK | Nyeste |

---

## Faseoversikt

| Fase | Beskrivelse | Estimat | Avhengigheter |
|------|-------------|---------|---------------|
| 1 | Database & API grunnlag | 3-4 dager | - |
| 2 | PDF Generator Service | 2-3 dager | Fase 1 |
| 3 | Frontend Designer | 5-7 dager | Fase 1, 2 |
| 4 | BrowserPrint integrasjon | 2-3 dager | Fase 3 |
| 5 | Parameter-binding & datakilder | 3-4 dager | Fase 3 |
| 6 | Testing & polish | 2-3 dager | Alle |

**Total estimert tid: 17-24 dager**

---

## Fase 1: Database & API Grunnlag

**Estimat: 3-4 dager**

### 1.1 Database-migrasjoner

Opprett følgende tabeller:

#### label_templates
- `id` (UUID, PK)
- `name` (VARCHAR 255, NOT NULL)
- `description` (TEXT)
- `template_json` (JSONB, NOT NULL) - pdfme template struktur
- `width_mm` (DECIMAL, default 100)
- `height_mm` (DECIMAL, default 50)
- `owner_id` (UUID, FK -> users)
- `is_global` (BOOLEAN, default FALSE)
- `thumbnail_url` (VARCHAR 500)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### template_parameters
- `id` (UUID, PK)
- `template_id` (UUID, FK -> label_templates)
- `field_name` (VARCHAR 100, NOT NULL) - Navn i pdfme schema
- `display_name` (VARCHAR 255, NOT NULL) - Visningsnavn i UI
- `parameter_type` (VARCHAR 50) - text, number, date, barcode, qr, image
- `source_type` (VARCHAR 50) - manual, database, api
- `source_config` (JSONB) - {"table": "products", "column": "name"}
- `is_required` (BOOLEAN, default TRUE)
- `default_value` (TEXT)
- `validation_regex` (VARCHAR 500)
- `sort_order` (INT)

#### template_shares
- `id` (UUID, PK)
- `template_id` (UUID, FK -> label_templates)
- `shared_with_user_id` (UUID, FK -> users)
- `permission` (VARCHAR 20) - view, edit
- `created_at` (TIMESTAMP)
- UNIQUE(template_id, shared_with_user_id)

#### print_history
- `id` (UUID, PK)
- `template_id` (UUID, FK -> label_templates)
- `user_id` (UUID, FK -> users)
- `printer_name` (VARCHAR 255)
- `input_data` (JSONB)
- `copies` (INT)
- `status` (VARCHAR 50) - success, failed
- `error_message` (TEXT)
- `printed_at` (TIMESTAMP)

### 1.2 Pydantic Schemas

Opprett følgende schemas i `app/schemas/label_template.py`:

- `TemplateParameterBase`, `TemplateParameterCreate`, `TemplateParameterResponse`
- `LabelTemplateBase`, `LabelTemplateCreate`, `LabelTemplateUpdate`, `LabelTemplateResponse`
- `GenerateLabelRequest`, `PreviewLabelRequest`
- Enums: `ParameterType`, `SourceType`

### 1.3 FastAPI Endpoints

Opprett router i `app/api/routes/label_templates.py`:

| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/api/label-templates` | Liste brukerens maler (inkl. globale) |
| GET | `/api/label-templates/{id}` | Hent én mal |
| POST | `/api/label-templates` | Opprett ny mal |
| PUT | `/api/label-templates/{id}` | Oppdater mal |
| DELETE | `/api/label-templates/{id}` | Slett mal |
| POST | `/api/label-templates/{id}/share` | Del med bruker |
| GET | `/api/label-templates/{id}/shares` | Liste delinger |
| DELETE | `/api/label-templates/{id}/shares/{user_id}` | Fjern deling |

### 1.4 Service Layer

Opprett `app/services/label_template_service.py`:

- `get_user_templates(db, user_id, include_global)` - Hent maler med tilgang
- `get_template(db, template_id, user_id)` - Hent mal med tilgangssjekk
- `create_template(db, data, owner_id)` - Opprett med parametere
- `update_template(db, template_id, data, user_id)` - Oppdater med tilgangssjekk
- `delete_template(db, template_id, user_id)` - Slett med tilgangssjekk
- `share_template(db, template_id, user_id, permission)` - Del mal
- `get_database_sources(db, table_name)` - Hent tilgjengelige tabeller/kolonner

### Leveranser Fase 1
- [ ] Migrasjoner opprettet og kjørt
- [ ] Pydantic schemas implementert
- [ ] CRUD endpoints implementert
- [ ] Service layer med tilgangskontroll
- [ ] Enhetstester for CRUD
- [ ] API dokumentert i OpenAPI/Swagger

---

## Fase 2: PDF Generator Service

**Estimat: 2-3 dager**

### 2.1 Avhengigheter

Installer i backend:
```
fpdf2>=2.7.0
python-barcode>=0.15.0
qrcode>=7.4.0
Pillow>=10.0.0
```

### 2.2 PDF Generator

Opprett `app/services/pdf_generator_service.py`:

#### Hovedfunksjoner
- `generate_pdf(template_json, inputs, width_mm, height_mm)` -> bytes
- `generate_pdf_batch(template_json, inputs_list, width_mm, height_mm)` -> bytes

#### Element-renderers
- `_render_text(pdf, schema, x, y, width, height, value)` - Tekst med styling
- `_render_barcode(pdf, x, y, width, height, value, barcode_type)` - Strekkoder
- `_render_qr(pdf, x, y, width, height, value)` - QR-koder
- `_render_image(pdf, x, y, width, height, value)` - Bilder (base64/URL)
- `_render_line(pdf, schema, x, y, width)` - Linjer
- `_render_rectangle(pdf, schema, x, y, width, height)` - Rektangler

#### Hjelpefunksjoner
- `generate_barcode_image(data, barcode_type)` -> bytes
- `generate_qr_image(data)` -> bytes
- `_hex_to_rgb(hex_color)` -> tuple

### 2.3 Font-støtte

- Last ned DejaVuSans fonter (støtter norske tegn)
- Plasser i `app/fonts/` eller konfigurerbar path
- Støtte for regular, bold, italic

### 2.4 API Endpoints for PDF

Legg til i label_templates router:

| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| POST | `/api/labels/preview` | Generer preview (base64 retur) |
| POST | `/api/labels/generate` | Generer PDF for print (bytes retur) |
| POST | `/api/labels/batch` | Generer flere etiketter i én PDF |

### 2.5 pdfme Template Mapping

Støtte for følgende pdfme schema-typer:
- `text` -> FPDF2 tekst med font-styling
- `image` -> FPDF2 image
- `qrcode` -> qrcode bibliotek -> FPDF2 image
- `code128`, `ean13`, `code39` -> python-barcode -> FPDF2 image

### Leveranser Fase 2
- [ ] PDF generator som parser pdfme templates
- [ ] Støtte for alle elementtyper
- [ ] UTF-8 font-støtte (norske tegn)
- [ ] Preview endpoint med base64 retur
- [ ] Generate endpoint med PDF bytes
- [ ] Batch-generering
- [ ] Enhetstester for generator

---

## Fase 3: Frontend Designer

**Estimat: 5-7 dager**

### 3.1 Avhengigheter

Installer i frontend:
```
@pdfme/common
@pdfme/schemas
@pdfme/ui
lodash (for debounce)
```

### 3.2 Prosjektstruktur

```
src/
├── app/
│   └── labels/
│       ├── page.tsx              # Mal-oversikt
│       ├── new/
│       │   └── page.tsx          # Ny mal
│       ├── [id]/
│       │   ├── page.tsx          # Rediger mal
│       │   └── print/
│       │       └── page.tsx      # Print-dialog
├── components/
│   └── label-designer/
│       ├── LabelDesigner.tsx     # pdfme Designer wrapper
│       ├── ParameterPanel.tsx    # Parameter-konfigurasjon
│       ├── TemplateLibrary.tsx   # Mal-bibliotek
│       ├── PreviewPane.tsx       # Live forhåndsvisning
│       └── SizeSelector.tsx      # Etikettsstørrelse
├── hooks/
│   ├── useLabelTemplates.ts      # API hooks for maler
│   └── usePdfPreview.ts          # Preview hook
├── lib/
│   └── api/
│       └── labelTemplates.ts     # API-klient
└── types/
    └── labels.ts                 # TypeScript types
```

### 3.3 TypeScript Types

Opprett `src/types/labels.ts`:
- `TemplateParameter`
- `LabelTemplate`
- `PdfmeTemplate`
- `PdfmeSchema`
- `PrintJob`

### 3.4 API-klient

Opprett `src/lib/api/labelTemplates.ts`:
- `getTemplates()` - Hent alle maler
- `getTemplate(id)` - Hent én mal
- `createTemplate(data)` - Opprett mal
- `updateTemplate(id, data)` - Oppdater mal
- `deleteTemplate(id)` - Slett mal
- `previewLabel(data)` - Hent preview
- `generateLabels(data)` - Generer PDF

### 3.5 Komponenter

#### LabelDesigner.tsx
- Wrapper rundt pdfme Designer
- Toolbar med navn-input, størrelse-velger, lagre-knapp
- Synkronisering av parametere fra schema
- Callback for lagring

#### ParameterPanel.tsx
- Tabs: "Parametere" / "Test-data"
- Liste over felt fra designeren
- Konfigurasjon per felt (visningsnavn, type, datakilde)
- Test-data input for forhåndsvisning

#### TemplateLibrary.tsx
- Grid/liste av maler
- Filtrering: Mine / Globale / Delt med meg
- Søk
- Thumbnail-visning
- Actions: Rediger, Kopier, Slett, Del

#### PreviewPane.tsx
- Iframe med PDF preview
- Oppdateres ved endring av test-data
- Loading-state

### 3.6 Sider

#### /labels (Mal-oversikt)
- TemplateLibrary komponent
- "Ny mal" knapp
- Filtrering og søk

#### /labels/new (Ny mal)
- LabelDesigner med tom template
- Lagre oppretter ny mal og redirecter

#### /labels/[id] (Rediger mal)
- LabelDesigner med eksisterende template
- Lagre oppdaterer mal

### Leveranser Fase 3
- [ ] pdfme Designer integrert
- [ ] Mal-bibliotek med filtrering
- [ ] Parameter-konfigurasjon
- [ ] Live forhåndsvisning
- [ ] Lagring til database
- [ ] Responsivt design

---

## Fase 4: BrowserPrint Integrasjon

**Estimat: 2-3 dager**

### 4.1 BrowserPrint Wrapper

Opprett `src/lib/browserprint/index.ts`:

#### Types
```typescript
interface ZebraPrinter {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  version: number;
  provider: string;
}
```

#### BrowserPrintService klasse
- `init()` - Last SDK fra localhost:9101
- `getLocalPrinters()` -> ZebraPrinter[]
- `getDefaultPrinter()` -> ZebraPrinter | null
- `print(printer, pdfData: ArrayBuffer)` - Send PDF til printer
- `printRaw(printer, data: string)` - Send rå data (ZPL fallback)

### 4.2 React Hook

Opprett `src/hooks/useBrowserPrint.ts`:
- `printers` - Liste over tilgjengelige printere
- `defaultPrinter` - Standard-printer
- `selectedPrinter` - Valgt printer (state)
- `isLoading` - Laster printere
- `error` - Feilmelding
- `refresh()` - Oppdater printerliste
- `print(pdfData)` - Skriv ut til valgt printer

### 4.3 Print-komponenter

#### PrinterSelector.tsx
- Dropdown med printere
- Refresh-knapp
- Vis tilkoblingsstatus

#### PrintDialog.tsx
- Modal for utskrift
- Printer-velger
- Dynamisk skjema for parametere
- Antall kopier
- Forhåndsvisning
- Print-knapp med loading-state

### 4.4 Print-side

#### /labels/[id]/print
- Hent mal fra API
- PrintDialog komponent
- Mulighet for å sende data via URL-params

### Leveranser Fase 4
- [ ] BrowserPrint SDK integrert
- [ ] Printer-discovery fungerer
- [ ] PDF sendes til printer
- [ ] Feilhåndtering og retry
- [ ] Print-dialog med preview

---

## Fase 5: Parameter-binding & Datakilder

**Estimat: 3-4 dager**

### 5.1 Manuelle Parametere

- Dynamisk skjema-generering fra template.parameters
- Input-typer basert på parameterType
- Validering (required, regex)
- Default-verdier

### 5.2 Database-kilder

#### Backend
- `GET /api/label-templates/sources/tables` - Liste tabeller
- `GET /api/label-templates/sources/columns?table=X` - Liste kolonner
- `GET /api/label-templates/sources/data?table=X&column=Y&search=Z` - Søk data

#### Frontend
- DatabaseSourceConfig komponent i ParameterPanel
- DatabaseSelect komponent i PrintDialog
- Autocomplete/søk for store datasett

### 5.3 API-kilder

- Konfigurasjon: endpoint URL, headers, response mapping
- Runtime: Hent data fra eksternt API
- Caching for ytelse

### 5.4 Batch-print

#### BatchPrintTable.tsx
- Tabell-editor for flere rader
- Importer fra CSV/Excel
- Kolonner basert på parameters
- Forhåndsvisning av valgt rad
- Print alle

#### Backend
- `POST /api/labels/batch` støtter liste av inputs
- Generer flersidig PDF

### 5.5 Integrasjon med eksisterende data

- Identifiser eksisterende tabeller/APIer som kan brukes
- Lag source_config presets for vanlige brukstilfeller
- Dokumenter hvordan legge til nye kilder

### Leveranser Fase 5
- [ ] Dynamisk skjema fra parameters
- [ ] Database-kilder fungerer
- [ ] Batch-import fra CSV/Excel
- [ ] Batch-print
- [ ] Dokumentasjon for datakilder

---

## Fase 6: Testing & Polish

**Estimat: 2-3 dager**

### 6.1 Backend Testing

#### Enhetstester
- PDF generator (alle elementtyper)
- Template service (CRUD, tilgangskontroll)
- Parameter validering

#### Integrasjonstester
- API endpoints
- Database-operasjoner

### 6.2 Frontend Testing

#### Komponent-tester
- LabelDesigner (mount, save)
- PrintDialog (printer selection, print)
- ParameterPanel (config changes)

#### E2E-tester (valgfritt)
- Opprett mal -> design -> lagre
- Åpne mal -> print -> velg printer -> skriv ut

### 6.3 Feilhåndtering

- Brukervenlige feilmeldinger (norsk)
- Toast-notifikasjoner for success/error
- Logging til print_history
- Retry-logikk for nettverksfeil
- Graceful degradation ved BrowserPrint-feil

### 6.4 UX-forbedringer

- Loading-states på alle async operasjoner
- Skeleton loaders for mal-bibliotek
- Keyboard shortcuts (Ctrl+S for lagre)
- Autosave (debounced)
- Bekreftelse ved sletting
- Undo/redo i designer (pdfme built-in)

### 6.5 Ytelse

- Debounce preview-oppdatering
- Lazy loading av mal-thumbnails
- Pagination i mal-bibliotek
- Caching av printer-liste

### 6.6 Dokumentasjon

#### Brukerveiledning
- Hvordan lage en mal
- Hvordan konfigurere parametere
- Hvordan skrive ut
- Hvordan dele maler

#### Utvikler-dokumentasjon
- API-dokumentasjon
- Hvordan legge til nye element-typer
- Hvordan legge til nye datakilder

### Leveranser Fase 6
- [ ] Testdekning > 80%
- [ ] Feilhåndtering implementert
- [ ] Loading-states overalt
- [ ] Brukerveiledning skrevet
- [ ] Utvikler-dokumentasjon skrevet
- [ ] Kode review gjennomført

---

## Risiko & Avbøtende Tiltak

| Risiko | Sannsynlighet | Konsekvens | Tiltak |
|--------|---------------|------------|--------|
| pdfme og FPDF2 rendrer ulikt | Middels | Høy | Lag prototype tidlig, juster parser iterativt |
| BrowserPrint ustabil/utilgjengelig | Lav | Middels | Fallback til fil-download |
| Kompleks parameter-binding | Middels | Middels | Start med manual, legg til kilder inkrementelt |
| Ytelsesproblemer ved batch | Lav | Middels | Async generering med progress-feedback |
| Font-problemer (norske tegn) | Lav | Høy | Test tidlig, inkluder fonter i repo |

---

## Milepæler

| Uke | Milepæl | Kriterier |
|-----|---------|-----------|
| 1 | Database og API ferdig | CRUD fungerer, tester grønne |
| 2 | PDF-generator og designer prototype | Kan designe og generere enkel etikett |
| 3 | Full designer med lagring | Kan lagre, laste, redigere maler |
| 4 | Print fungerer | Kan skrive ut til Zebra via BrowserPrint |
| 5 | Parameter-binding og batch | Dynamiske data og batch-print fungerer |
| 6 | Produksjonsklar | Testing, docs, deploy |

---

## Akseptansekriterier

### Must Have
- [ ] Bruker kan designe etikett visuelt med drag-and-drop
- [ ] Bruker kan legge til tekst, strekkoder, QR-koder, bilder
- [ ] Bruker kan konfigurere dynamiske parametere
- [ ] Bruker kan lagre og laste maler
- [ ] Bruker kan skrive ut til Zebra ZT510 via BrowserPrint
- [ ] Bruker kan velge mellom flere printere
- [ ] Maler kan være private eller globale
- [ ] Forhåndsvisning før print

### Should Have
- [ ] Maler kan deles med andre brukere
- [ ] Parametere kan hente data fra database
- [ ] Batch-print fra CSV/Excel
- [ ] Print-historikk

### Nice to Have
- [ ] Parametere kan hente data fra API
- [ ] Mal-thumbnails
- [ ] Autosave
- [ ] Undo/redo
