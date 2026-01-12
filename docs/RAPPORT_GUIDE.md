# Guide: Hvordan lage nye rapporter

## Oversikt

Rapportsystemet består av tre deler:
1. **GraphQL resolver** - Henter data fra databasen
2. **HTML template** - Designer hvordan rapporten ser ut
3. **API endpoint** - Kobler data og template sammen

## Steg-for-steg: Lag en ny rapport

### Eksempel: Produktliste-rapport

La oss lage en rapport som viser alle produkter med pris og leverandør.

---

## Steg 1: Velg hvilke data du trenger

**Spørsmål å stille deg selv:**
- Hvilke tabeller trenger jeg data fra?
- Hvilke felt skal vises i rapporten?
- Trenger jeg å filtrere data? (f.eks. kun aktive produkter)
- Trenger jeg å beregne noe? (f.eks. totalsum)

**For produktliste-eksempelet:**
- Tabell: `tblprodukter` (Produkter)
- Felt: produktnavn, pris, leverandør, kategori
- Filter: Kun aktive produkter
- Beregning: Totalt antall produkter

---

## Steg 2: Lag GraphQL type og resolver (hvis ny datatype)

### 2.1 Legg til GraphQL type i `app/graphql/schema.py`

```python
@strawberry.type
class Produkt:
    produktid: int
    produktnavn: str
    pris: Optional[float]
    leverandor: Optional[str]
    kategori: Optional[str]
    aktiv: bool
```

**Tips:**
- Bruk `Optional[...]` for felt som kan være `None`
- Match feltnavnene med databasekolonnene

### 2.2 Legg til query i `Query` class

```python
@strawberry.type
class Query:
    # ... eksisterende queries ...

    @strawberry.field
    async def produkter(
        self,
        info: strawberry.Info,
        limit: int = 100,
        kun_aktive: bool = True
    ) -> List[Produkt]:
        """Hent liste over produkter."""
        from app.graphql.resolvers import get_produkter
        return await get_produkter(
            info.context["db"],
            limit=limit,
            kun_aktive=kun_aktive
        )
```

### 2.3 Implementer resolver i `app/graphql/resolvers.py`

```python
from app.models.produkter import Produkter as ProdukterModel

async def get_produkter(
    db: AsyncSession,
    limit: int = 100,
    kun_aktive: bool = True
) -> List[Produkt]:
    """
    Hent produkter fra databasen.

    Args:
        db: Database session
        limit: Maksimalt antall produkter
        kun_aktive: Om kun aktive produkter skal returneres

    Returns:
        Liste med produkt-objekter
    """
    query = select(ProdukterModel).limit(limit)

    # Legg til filter hvis kun_aktive
    if kun_aktive:
        query = query.where(ProdukterModel.produktinaktiv == False)

    result = await db.execute(query)
    produkter_models = result.scalars().all()

    # Konverter til GraphQL types
    return [
        Produkt(
            produktid=p.produktid,
            produktnavn=p.produktnavn or "",
            pris=float(p.salgspris) if p.salgspris else None,
            leverandor=p.leverandor,
            kategori=p.kategori,
            aktiv=not p.produktinaktiv
        )
        for p in produkter_models
    ]
```

**Viktige punkter:**
- Bruk `selectinload()` for å eager-loade relasjoner (unngå N+1 queries)
- Håndter `None`-verdier
- Konverter til riktige datatyper (f.eks. `float()` for Decimal)

---

## Steg 3: Design HTML template

### 3.1 Opprett template-fil

**Fil:** `app/templates/reports/produktliste.html`

```html
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>Produktliste</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 2cm;
            border-bottom: 3px solid #2c5282;
            padding-bottom: 1cm;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1cm;
        }
        th {
            background-color: #2c5282;
            color: white;
            padding: 0.4cm;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 0.3cm;
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .text-right {
            text-align: right;
        }
        .summary {
            margin-top: 1cm;
            padding: 0.5cm;
            background-color: #e6f2ff;
            border-left: 4px solid #2c5282;
        }
        .footer {
            margin-top: 2cm;
            padding-top: 0.5cm;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PRODUKTLISTE</h1>
        <p>Larvik Kommune Catering</p>
        <p style="font-size: 10pt; color: #666;">Generert: {{ generert_dato }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Produktnavn</th>
                <th>Leverandør</th>
                <th>Kategori</th>
                <th class="text-right">Pris</th>
            </tr>
        </thead>
        <tbody>
            {% for produkt in produkter %}
            <tr>
                <td>{{ produkt.navn }}</td>
                <td>{{ produkt.leverandor or "-" }}</td>
                <td>{{ produkt.kategori or "-" }}</td>
                <td class="text-right">
                    {% if produkt.pris %}
                        kr {{ "%.2f"|format(produkt.pris) }}
                    {% else %}
                        -
                    {% endif %}
                </td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="summary">
        <strong>Totalt antall produkter:</strong> {{ antall_produkter }}
    </div>

    <div class="footer">
        <p>Larvik Kommune Catering - Telefon: XXX XX XXX - E-post: kontakt@lkc.no</p>
    </div>
</body>
</html>
```

### 3.2 Jinja2 Template Syntax - Viktige kommandoer

**Variabler:**
```jinja2
{{ variabel }}                    # Enkel variabel
{{ kunde.navn }}                  # Objekt-property
{{ produkt.pris or "-" }}         # Fallback hvis None
{{ "%.2f"|format(pris) }}         # Formatering (2 desimaler)
{{ dato.strftime("%d.%m.%Y") }}   # Dato-formatering (gjøres i Python)
```

**Løkker:**
```jinja2
{% for produkt in produkter %}
    <tr>
        <td>{{ produkt.navn }}</td>
    </tr>
{% endfor %}
```

**Conditionals:**
```jinja2
{% if produkt.pris %}
    kr {{ produkt.pris }}
{% else %}
    Pris ikke tilgjengelig
{% endif %}

{% if produkter|length > 0 %}
    <p>Viser {{ produkter|length }} produkter</p>
{% endif %}
```

**Nyttige filters:**
```jinja2
{{ tekst|upper }}                 # STORE BOKSTAVER
{{ tekst|lower }}                 # små bokstaver
{{ liste|length }}                # Antall elementer
{{ tall|round(2) }}               # Avrund til 2 desimaler
```

### 3.3 CSS Styling Tips

**Sideoppsett for PDF:**
```css
@page {
    size: A4;              /* eller A4 landscape for liggende */
    margin: 2cm;           /* Margin rundt siden */
}
```

**Fargepalett (LKC-stil):**
```css
/* Hovedfarge (blå) */
#2c5282

/* Bakgrunnsfarger */
#f9f9f9  /* Lys grå for annenhver rad */
#e6f2ff  /* Lys blå for infoboxer */
#fff9e6  /* Lys gul for advarsler */

/* Tekstfarger */
#333     /* Normal tekst */
#666     /* Sekundær tekst (footer) */
```

**Tabellstyling:**
```css
table {
    width: 100%;
    border-collapse: collapse;
}
th {
    background-color: #2c5282;
    color: white;
    padding: 0.4cm;
}
td {
    padding: 0.3cm;
    border-bottom: 1px solid #ddd;
}
tr:nth-child(even) {
    background-color: #f9f9f9;  /* Annenhver rad */
}
```

---

## Steg 4: Lag API endpoint

### 4.1 Legg til endpoint i `app/api/v1/report_generator.py`

```python
@router.get("/produktliste-pdf")
async def generate_product_list_pdf(
    kun_aktive: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generer produktliste som PDF.

    Args:
        kun_aktive: Om kun aktive produkter skal inkluderes
        db: Database session
        current_user: Authenticated user

    Returns:
        PDF file download
    """
    # Hent produkter via GraphQL resolver
    from app.graphql.resolvers import get_produkter
    produkter = await get_produkter(db, limit=1000, kun_aktive=kun_aktive)

    # Forbered data for template
    data = {
        "produkter": [
            {
                "navn": p.produktnavn,
                "leverandor": p.leverandor,
                "kategori": p.kategori,
                "pris": p.pris
            }
            for p in produkter
        ],
        "antall_produkter": len(produkter),
        "generert_dato": datetime.now().strftime("%d.%m.%Y %H:%M")
    }

    # Generer PDF
    report_service = ReportService()
    pdf_bytes = await report_service.generate_pdf_from_html(
        "produktliste.html",  # Template-navn
        data
    )

    # Returner PDF
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=produktliste.pdf"
        }
    )
```

**Viktige punkter:**
- Bruk beskrivende endpoint-navn (f.eks. `/produktliste-pdf`)
- Legg til query parameters for filtering (`kun_aktive`)
- Formatér datoer i Python før de sendes til template
- Sett riktig `filename` i Content-Disposition header

---

## Steg 5: Test rapporten

### 5.1 Test i Swagger UI

1. Start backend: `cd LKCserver-backend && ./scripts/start-dev.sh`
2. Gå til: http://localhost:8000/api/docs
3. Finn endpoint: `GET /api/v1/report-generator/produktliste-pdf`
4. Klikk "Try it out"
5. Klikk "Execute"
6. Last ned PDF og åpne

### 5.2 Test i frontend (valgfritt)

**Legg til i `src/lib/api/reports.ts`:**

```typescript
downloadProductListPdf: async (activeOnly: boolean = true): Promise<void> => {
  try {
    const response = await api.get(
      `/v1/report-generator/produktliste-pdf?kun_aktive=${activeOnly}`,
      { responseType: 'blob' }
    )

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'produktliste.pdf')
    document.body.appendChild(link)
    link.click()

    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download product list:', error)
    throw error
  }
}
```

**Legg til knapp i produktliste-siden:**

```tsx
import { reportsApi } from "@/lib/api/reports"

<Button onClick={() => reportsApi.downloadProductListPdf()}>
  <Download className="mr-2 h-4 w-4" />
  Eksporter til PDF
</Button>
```

---

## Vanlige rapport-typer

### 1. Liste-rapport (som produktliste)
- Viser mange rader i en tabell
- Typisk: kundeliste, produktliste, ansattliste

### 2. Detalj-rapport (som ordrebekreftelse)
- Viser én hovedentitet med detaljer
- Typisk: ordrebekreftelse, faktura, leveringsseddel

### 3. Sammendragsrapport
- Aggregert data (summer, gjennomsnitt)
- Typisk: månedlig salg, lagerstatistikk

### 4. Grupperte rapporter
- Data gruppert etter kategori/kunde/måned
- Eksempel: produkter gruppert etter kategori

**Template-eksempel for gruppering:**

```html
{% for kategori, produkter in produkter_etter_kategori.items() %}
<h2>{{ kategori }}</h2>
<table>
    {% for produkt in produkter %}
    <tr>
        <td>{{ produkt.navn }}</td>
        <td>{{ produkt.pris }}</td>
    </tr>
    {% endfor %}
</table>
{% endfor %}
```

---

## Excel-rapporter

For Excel-rapporter, bruk `generate_simple_excel()`:

```python
@router.get("/produktliste-excel")
async def generate_product_list_excel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generer produktliste som Excel."""
    produkter = await get_produkter(db, limit=1000)

    headers = ["Produktnavn", "Leverandør", "Kategori", "Pris"]

    rows = [
        [
            p.produktnavn,
            p.leverandor or "",
            p.kategori or "",
            p.pris if p.pris else ""
        ]
        for p in produkter
    ]

    report_service = ReportService()
    excel_bytes = await report_service.generate_simple_excel(
        headers=headers,
        rows=rows,
        sheet_name="Produkter"
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=produktliste.xlsx"
        }
    )
```

---

## Feilsøking

### Problem: PDF viser ikke norske tegn (æøå)
**Løsning:** Sjekk at `<meta charset="UTF-8">` er i `<head>`

### Problem: Styling ser ikke riktig ut i PDF
**Løsning:**
- weasyprint støtter ikke all CSS
- Bruk enkle CSS-properties (unngå flexbox/grid i enkelte tilfeller)
- Test i PDF, ikke bare i nettleser

### Problem: Tabeller går over flere sider
**Løsning:**
```css
tr {
    page-break-inside: avoid;  /* Ikke del rader over sider */
}
```

### Problem: Data mangler i rapporten
**Løsning:**
- Sjekk at resolver returnerer riktige data
- Test GraphQL query direkte først
- Logg `data` dictionary før den sendes til template

---

## Beste praksis

### Data-henting:
✅ Bruk GraphQL resolvers (gjenbrukbar logikk)
✅ Eager-load relasjoner med `selectinload()`
✅ Håndter `None`-verdier
❌ Ikke hent alt fra database - bruk `limit`

### Template-design:
✅ Bruk konsistent styling (farger, fonter)
✅ Inkluder generert dato/tid
✅ Legg til footer med kontaktinfo
✅ Test utskrift i PDF
❌ Ikke bruk kompleks CSS (weasyprint støtter ikke alt)

### API-endpoints:
✅ Bruk beskrivende navn (`/produktliste-pdf`, ikke `/rapport1`)
✅ Legg til query parameters for filtering
✅ Sett riktig filename i response headers
✅ Legg til docstrings

### Filorganisering:
```
app/
├── graphql/
│   ├── schema.py          # GraphQL types
│   └── resolvers.py       # Data-henting
├── templates/reports/
│   ├── ordrebekreftelse.html
│   ├── leveringsseddel.html
│   └── produktliste.html  # <-- Ny template her
└── api/v1/
    └── report_generator.py  # Endpoints
```

---

## Hurtigreferanse

### Lag ny PDF-rapport - Sjekkliste:

1. ☐ Legg til GraphQL type i `schema.py` (hvis ny datatype)
2. ☐ Legg til query i `Query` class
3. ☐ Implementer resolver i `resolvers.py`
4. ☐ Opprett HTML template i `templates/reports/`
5. ☐ Legg til endpoint i `report_generator.py`
6. ☐ Test i Swagger UI (http://localhost:8000/api/docs)
7. ☐ (Valgfritt) Legg til i `reports.ts` for frontend
8. ☐ (Valgfritt) Legg til knapp i UI

### Lag ny Excel-rapport - Sjekkliste:

1. ☐ Implementer resolver (samme som PDF)
2. ☐ Lag endpoint med `generate_simple_excel()`
3. ☐ Definer headers og rows
4. ☐ Sett riktig MIME-type (.xlsx)
5. ☐ Test nedlasting

---

## Eksempel på kompleks rapport (med beregninger)

**Månedsrapport for salg:**

```python
@router.get("/manedsrapport-salg")
async def generate_monthly_sales_report(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generer månedsrapport for salg."""
    from sqlalchemy import func, extract
    from app.models.ordrer import Ordrer
    from app.models.ordredetaljer import Ordredetaljer

    # Hent ordrer for måneden
    query = select(
        Ordrer.ordreid,
        Ordrer.kundenavn,
        Ordrer.ordredato,
        func.sum(Ordredetaljer.pris * Ordredetaljer.antall).label('totalsum')
    ).join(
        Ordredetaljer, Ordrer.ordreid == Ordredetaljer.ordreid
    ).where(
        extract('year', Ordrer.ordredato) == year,
        extract('month', Ordrer.ordredato) == month
    ).group_by(
        Ordrer.ordreid,
        Ordrer.kundenavn,
        Ordrer.ordredato
    )

    result = await db.execute(query)
    ordrer = result.all()

    # Beregn totaler
    total_salg = sum(ordre.totalsum for ordre in ordrer if ordre.totalsum)
    antall_ordrer = len(ordrer)
    gjennomsnitt = total_salg / antall_ordrer if antall_ordrer > 0 else 0

    data = {
        "ar": year,
        "maned": month,
        "ordrer": [
            {
                "ordreid": o.ordreid,
                "kundenavn": o.kundenavn,
                "ordredato": o.ordredato.strftime("%d.%m.%Y"),
                "totalsum": f"{o.totalsum:.2f}" if o.totalsum else "0.00"
            }
            for o in ordrer
        ],
        "total_salg": f"{total_salg:.2f}",
        "antall_ordrer": antall_ordrer,
        "gjennomsnitt_per_ordre": f"{gjennomsnitt:.2f}",
        "generert_dato": datetime.now().strftime("%d.%m.%Y %H:%M")
    }

    report_service = ReportService()
    pdf_bytes = await report_service.generate_pdf_from_html(
        "manedsrapport_salg.html",
        data
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=salg_{year}_{month:02d}.pdf"
        }
    )
```

---

## Kontakt

For hjelp med rapportsystemet, sjekk:
- Backend API dokumentasjon: http://localhost:8000/api/docs
- GraphQL schema: `app/graphql/schema.py`
- Eksisterende templates: `app/templates/reports/`
