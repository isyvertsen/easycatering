# Quick Start: Lag din første rapport på 10 minutter

## Eksempel: Ansattliste

La oss lage en enkel rapport som viser alle ansatte.

### Steg 1: Definer data (GraphQL)

**Åpne:** `app/graphql/schema.py`

**Legg til:**
```python
@strawberry.type
class Ansatt:
    ansattid: int
    fornavn: str
    etternavn: str
    epost: Optional[str]
    telefon: Optional[str]

@strawberry.type
class Query:
    # ... eksisterende queries ...

    @strawberry.field
    async def ansatte(self, info: strawberry.Info) -> List[Ansatt]:
        """Hent alle ansatte."""
        from app.graphql.resolvers import get_ansatte
        return await get_ansatte(info.context["db"])
```

### Steg 2: Hent data fra database

**Åpne:** `app/graphql/resolvers.py`

**Legg til:**
```python
from app.models.ansatte import Ansatte as AnsatteModel

async def get_ansatte(db: AsyncSession) -> List[Ansatt]:
    """Hent alle ansatte fra databasen."""
    query = select(AnsatteModel)
    result = await db.execute(query)
    ansatte_models = result.scalars().all()

    return [
        Ansatt(
            ansattid=a.ansattid,
            fornavn=a.fornavn or "",
            etternavn=a.etternavn or "",
            epost=a.e_post,
            telefon=a.telefonnummer
        )
        for a in ansatte_models
    ]
```

### Steg 3: Design template

**Opprett:** `app/templates/reports/ansattliste.html`

```html
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>Ansattliste</title>
    <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: Arial; font-size: 11pt; }
        h1 { color: #2c5282; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 1cm; }
        th { background: #2c5282; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f9f9f9; }
    </style>
</head>
<body>
    <h1>ANSATTLISTE</h1>
    <p style="text-align: center;">Larvik Kommune Catering</p>

    <table>
        <thead>
            <tr>
                <th>Navn</th>
                <th>E-post</th>
                <th>Telefon</th>
            </tr>
        </thead>
        <tbody>
            {% for ansatt in ansatte %}
            <tr>
                <td>{{ ansatt.fornavn }} {{ ansatt.etternavn }}</td>
                <td>{{ ansatt.epost or "-" }}</td>
                <td>{{ ansatt.telefon or "-" }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <p style="margin-top: 2cm; text-align: center; font-size: 9pt; color: #666;">
        Generert: {{ generert_dato }}
    </p>
</body>
</html>
```

### Steg 4: Lag API endpoint

**Åpne:** `app/api/v1/report_generator.py`

**Legg til:**
```python
@router.get("/ansattliste-pdf")
async def generate_employee_list_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generer ansattliste som PDF."""
    from app.graphql.resolvers import get_ansatte

    # Hent data
    ansatte = await get_ansatte(db)

    # Forbered for template
    data = {
        "ansatte": [
            {
                "fornavn": a.fornavn,
                "etternavn": a.etternavn,
                "epost": a.epost,
                "telefon": a.telefon
            }
            for a in ansatte
        ],
        "generert_dato": datetime.now().strftime("%d.%m.%Y %H:%M")
    }

    # Generer PDF
    report_service = ReportService()
    pdf_bytes = await report_service.generate_pdf_from_html(
        "ansattliste.html",
        data
    )

    # Returner
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=ansattliste.pdf"
        }
    )
```

### Steg 5: Test!

1. **Start backend:**
   ```bash
   cd LKCserver-backend
   ./scripts/start-dev.sh
   ```

2. **Gå til Swagger UI:**
   ```
   http://localhost:8000/api/docs
   ```

3. **Finn endpoint:**
   - Søk etter "ansattliste"
   - Klikk "GET /api/v1/report-generator/ansattliste-pdf"
   - Klikk "Try it out"
   - Klikk "Execute"
   - Last ned PDF!

**Ferdig!** 🎉

---

## Dataflyt - Visuelt

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BRUKER KLIKKER "LAST NED PDF"                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (Next.js)                                       │
│    reportsApi.downloadEmployeeList()                        │
│    → HTTP GET til /api/v1/report-generator/ansattliste-pdf │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND ENDPOINT (FastAPI)                               │
│    generate_employee_list_pdf()                             │
│    → Sjekker autentisering                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GRAPHQL RESOLVER                                         │
│    get_ansatte(db)                                          │
│    → SELECT * FROM tblansatte                               │
│    → Konverter til GraphQL types                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DATA TRANSFORMASJON                                      │
│    Konverter GraphQL types til dict for template:           │
│    {                                                         │
│      "ansatte": [                                           │
│        {"fornavn": "Per", "etternavn": "Hansen", ...},      │
│        {"fornavn": "Anne", "etternavn": "Berg", ...}        │
│      ],                                                      │
│      "generert_dato": "03.01.2026 14:30"                    │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. JINJA2 TEMPLATE ENGINE                                   │
│    Render ansattliste.html med data                         │
│    → HTML-fil med tabeller og styling                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. WEASYPRINT                                               │
│    Konverter HTML → PDF                                     │
│    → Bruker CSS for layout                                  │
│    → Returnerer PDF som bytes                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. HTTP RESPONSE                                            │
│    Content-Type: application/pdf                            │
│    Content-Disposition: attachment; filename=ansattliste.pdf│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. FRONTEND HÅNDTERER NEDLASTING                            │
│    → Opprett Blob fra response                              │
│    → Trigger nedlasting i nettleser                         │
│    → Bruker får ansattliste.pdf                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Vanlige mønstre

### Mønster 1: Enkel liste (uten relasjoner)

**Bruk når:** Du viser data fra én tabell

```python
# Resolver
async def get_produkter(db: AsyncSession) -> List[Produkt]:
    query = select(ProdukterModel)
    result = await db.execute(query)
    return [convert_to_graphql(p) for p in result.scalars().all()]
```

### Mønster 2: Med relasjoner (f.eks. ordre → kunde)

**Bruk når:** Du trenger data fra relaterte tabeller

```python
# Resolver
async def get_ordre(ordre_id: int, db: AsyncSession) -> Ordre:
    query = select(OrdrerModel).options(
        selectinload(OrdrerModel.kunde),        # Eager load kunde
        selectinload(OrdrerModel.detaljer)      # Eager load produkter
    ).where(OrdrerModel.ordreid == ordre_id)

    result = await db.execute(query)
    ordre = result.scalar_one_or_none()

    return convert_to_graphql(ordre)
```

### Mønster 3: Med aggregeringer (summer, gjennomsnitt)

**Bruk når:** Du trenger beregninger

```python
# Resolver
async def get_salgsstatistikk(db: AsyncSession) -> Statistikk:
    from sqlalchemy import func

    query = select(
        func.count(OrdrerModel.ordreid).label('antall'),
        func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label('totalsum')
    ).join(OrdredetaljerModel)

    result = await db.execute(query)
    stats = result.one()

    return Statistikk(
        antall_ordrer=stats.antall,
        total_salg=float(stats.totalsum) if stats.totalsum else 0
    )
```

### Mønster 4: Med filtrering

**Bruk når:** Bruker skal kunne filtrere data

```python
# Resolver
async def get_produkter(
    db: AsyncSession,
    kategori: Optional[str] = None,
    kun_aktive: bool = True
) -> List[Produkt]:
    query = select(ProdukterModel)

    if kategori:
        query = query.where(ProdukterModel.kategori == kategori)

    if kun_aktive:
        query = query.where(ProdukterModel.produktinaktiv == False)

    result = await db.execute(query)
    return [convert_to_graphql(p) for p in result.scalars().all()]
```

---

## Sjekkliste for feilsøking

### PDF genereres ikke?
- [ ] Er backend-serveren kjørende?
- [ ] Er template-filen lagt i riktig mappe? (`app/templates/reports/`)
- [ ] Er template-navnet skrevet riktig i koden?
- [ ] Sjekk backend-logger for feilmeldinger

### Data mangler i PDF?
- [ ] Test GraphQL resolver direkte først
- [ ] Logg `data` dictionary før `generate_pdf_from_html()`
- [ ] Sjekk at variabelnavn i template matcher dict-keys
- [ ] Håndter `None`-verdier med `{{ verdi or "-" }}`

### Styling ser feil ut?
- [ ] Er `<meta charset="UTF-8">` i `<head>`?
- [ ] Er CSS inline i template? (ikke ekstern CSS-fil)
- [ ] Test enklere CSS (weasyprint støtter ikke alt)
- [ ] Bruk `@page { size: A4; margin: 2cm; }`

### Excel fungerer ikke?
- [ ] Sjekk MIME-type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- [ ] Sjekk at filename slutter med `.xlsx`
- [ ] Test med `generate_simple_excel()` først

---

## Tips for effektiv rapportutvikling

1. **Start enkelt** - Test med hardkodede data først
2. **Bruk eksisterende templates** - Kopier og tilpass
3. **Test tidlig** - Sjekk PDF ofte mens du utvikler
4. **Logg data** - `print(data)` før du sender til template
5. **Gjenbruk resolvers** - Samme resolver kan brukes av flere rapporter
6. **Versjonskontroll** - Commit templates til Git

---

## Neste steg

Når du har laget din første rapport, prøv å:

1. **Legg til filtering** - La brukere velge dato-range, kategori, etc.
2. **Legg til sortering** - Sorter data alfabetisk eller etter pris
3. **Lag Excel-versjon** - Samme data, annet format
4. **Legg til grafikk** - (Avansert) Bruk matplotlib for charts
5. **Send på e-post** - Implementer e-post-funksjonalitet

Se `RAPPORT_GUIDE.md` for mer avanserte teknikker!
