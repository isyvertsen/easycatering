# Produksjonssystem Epic - Plan

## Oversikt

**Formål:** Lage et produksjonstemplatesystem for kundegruppe 12 (mottakskjøkken/skoler/barnehager).

**VIKTIG:** Dette er et **pre-order system** som kobles til ordresystemet (tblordrer).

## Migrering fra gammelt system

**KRITISK FORSTÅELSE:**

I det gamle systemet ble templates lagret som **vanlige produksjonsordrer** i `tbl_rpproduksjon`:
- Templates hadde en spesiell kunde-ID (f.eks. kunde 0 eller en dummy-kunde)
- De hadde ofte 0-verdier eller standardverdier
- Eksempel: Plan 7879 er en template
- Dette var en workaround/hack i det gamle systemet

**Problemet med gammelt system:**
- Vanskelig å skille templates fra faktiske produksjonsordrer
- Krever logikk for å unngå at templates overføres til ordre
- Krever logikk for å unngå at templates kalkuleres
- Dårlig oversikt og dataintegritet

**Løsning - nytt system:**
- Templates flyttes til dedikerte `tbl_produksjonstemplate` tabeller
- Klart skille mellom template (mal) og produksjonsordre (faktisk bestilling)
- Enklere å ha oversikt
- Kan kalkulere totaler i templates uten å påvirke faktiske ordrer
- Kan ta ut lister og rapporter spesifikt for templates

**Migreringsstrategi:**
- Identifiser eksisterende templates i `tbl_rpproduksjon` (f.eks. kundeid = 0)
- Flytt disse til `tbl_produksjonstemplate` og `tbl_produksjonstemplate_detaljer`
- Marker de gamle som migrerte (eller slett dem)

## Komplett Flyt

### 1. Lag Produksjonstemplate (Admin)
- Administrator lager en template med produkter/retter som skal tilbys
- Template gjelder for en spesifikk periode
- Definerer hva som skal være tilgjengelig for bestilling

### 2. Distribuer til Mottakskjøkken
- Template kopieres automatisk til alle kunder i kundegruppe 12
- Hver kunde får sin egen kopi av templaten (i tbl_produksjon)
- Status: 'draft'

### 3. Mottakskjøkken fyller ut (Webshop)
- Webshop-lignende interface
- Fyller ut antall porsjoner, mengder, etc.
- Lagre utkast eller send inn
- Status: 'draft' → 'submitted'

### 4. Admin Godkjenning
- Admin ser oversikt over alle innsendte bestillinger
- Godkjenner eller avviser
- Status: 'submitted' → 'approved' (eller 'rejected')

### 5. ⭐ Overføring til Ordre (NY - Phase 6)
- Godkjent produksjonsordre overføres til ordinær ordre
- Opprett ordre i tblordrer per kunde
- Opprett ordredetaljer i tblordredetaljer
- Lagre ordre_id referanse i tbl_produksjon
- Status: 'approved' → 'transferred'

### 6. Kalkulering (Senere - Phase 7)
- Beregn total produksjon basert på alle godkjente ordrer
- Aggreger data for produksjonsplanlegging

## Database Design

### tbl_produksjonstemplate (Template - hva tilbys)
```sql
CREATE TABLE tbl_produksjonstemplate (
    template_id SERIAL PRIMARY KEY,
    template_navn VARCHAR(255),
    beskrivelse TEXT,
    kundegruppe INTEGER DEFAULT 12,
    gyldig_fra DATE,
    gyldig_til DATE,
    aktiv BOOLEAN DEFAULT TRUE,
    opprettet_dato TIMESTAMP DEFAULT NOW(),
    opprettet_av INTEGER REFERENCES tblbrukere(brukerid)
);
```

### tbl_produksjonstemplate_detaljer (Produkter i template)
```sql
CREATE TABLE tbl_produksjonstemplate_detaljer (
    template_detaljid SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES tbl_produksjonstemplate(template_id),
    produktid INTEGER REFERENCES tblprodukter(produktid),
    kalkyleid INTEGER REFERENCES tblkalkyle(kalkyleid),
    standard_antall INTEGER,
    maks_antall INTEGER,
    paakrevd BOOLEAN DEFAULT FALSE,
    linje_nummer INTEGER
);
```

### tbl_produksjon (Pre-order per mottakskjøkken)
```sql
CREATE TABLE tbl_produksjon (
    produksjonsid SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES tbl_produksjonstemplate(template_id),
    kundeid INTEGER REFERENCES tblkunder(kundeid),
    periodeid INTEGER REFERENCES tblperiode(periodeid),
    status VARCHAR(50),  -- 'draft', 'submitted', 'approved', 'transferred', 'produced'
    opprettet_dato TIMESTAMP DEFAULT NOW(),
    oppdatert_dato TIMESTAMP DEFAULT NOW(),
    opprettet_av INTEGER REFERENCES tblbrukere(brukerid),
    innsendt_dato TIMESTAMP,
    godkjent_dato TIMESTAMP,
    godkjent_av INTEGER REFERENCES tblbrukere(brukerid),
    levert_dato DATE,
    merknad TEXT,
    -- ⭐ KOBLING TIL ORDRE (Phase 6)
    ordre_id INTEGER REFERENCES tblordrer(ordreid),
    overfort_dato TIMESTAMP,
    overfort_av INTEGER REFERENCES tblbrukere(brukerid)
);
```

### tbl_produksjonsdetaljer (Linjer i pre-order)
```sql
CREATE TABLE tbl_produksjonsdetaljer (
    detaljid SERIAL PRIMARY KEY,
    produksjonsid INTEGER REFERENCES tbl_produksjon(produksjonsid),
    produktid INTEGER REFERENCES tblprodukter(produktid),
    kalkyleid INTEGER REFERENCES tblkalkyle(kalkyleid),
    antall INTEGER,
    enhet VARCHAR(50),
    pris DECIMAL(10,2),
    kommentar TEXT,
    linje_nummer INTEGER
);
```

## Status Flow

```
draft (mottakskjøkken arbeider)
  ↓
submitted (sendt inn av mottakskjøkken)
  ↓
approved (godkjent av admin)
  ↓
transferred (overført til ordre i tblordrer) ⭐ NY!
  ↓
produced (faktisk produsert)

rejected (kan gå tilbake til draft)
```

## Implementation Phases

### Phase 1: Database & Models (2-3 dager)
- Database migrations
- SQLAlchemy models (inkl. ordre_id felter)
- Pydantic schemas
- Basic CRUD API

### Phase 2: Template Management (2-3 dager)
- Lag produksjonstemplate (admin)
- Template detaljer (produkter/retter)
- Aktiver/deaktiver templates
- Frontend pages

### Phase 3: Template Distribution (2-3 dager)
- Distribuer template til alle mottakskjøkken (kundegruppe 12)
- Kopier template til tbl_produksjon for hver kunde
- Batch operation

### Phase 4: Mottakskjøkken Interface (3-4 dager)
- Webshop-lignende UI
- Vis tilgjengelige produkter fra template
- Fylle ut antall/mengder
- Lagre til tbl_produksjonsdetaljer
- Send inn bestilling

### Phase 5: Admin Oversikt (2-3 dager)
- Liste alle produksjonsordrer
- Status per mottakskjøkken
- Approval workflow
- Export/rapport

### Phase 6: Overføring til Ordre (2-3 dager) ⭐ NY!
- Overfør godkjent tbl_produksjon → tblordrer
- Opprett ordredetaljer automatisk
- Lagre ordre_id referanse
- Bulk overføring
- Preview før overføring

### Phase 7: Kalkulering (3-4 dager - senere)
- Aggreger alle mottakskjøkken
- Beregn total produksjon
- Produksjonsplan
- Ingrediensberegning

## Viktige funksjoner

### Distribusjonslogikk
```python
async def distribute_template_to_customers(template_id: int, db: AsyncSession):
    """Distribuer template til alle kunder i kundegruppe 12."""
    template = await db.get(ProduksjonsTemplate, template_id)
    
    # Hent alle kunder i kundegruppe 12
    stmt = select(Kunder).where(Kunder.kundegruppe == 12)
    result = await db.execute(stmt)
    customers = result.scalars().all()
    
    # Opprett produksjonsordre for hver kunde
    for customer in customers:
        production = Produksjon(
            template_id=template_id,
            kundeid=customer.kundeid,
            status='draft',
        )
        db.add(production)
        await db.flush()
        
        # Kopier template detaljer
        template_details = await get_template_details(template_id, db)
        for detail in template_details:
            prod_detail = ProduksjonsDetaljer(
                produksjonsid=production.produksjonsid,
                produktid=detail.produktid,
                kalkyleid=detail.kalkyleid,
                antall=detail.standard_antall,
                linje_nummer=detail.linje_nummer,
            )
            db.add(prod_detail)
    
    await db.commit()
```

### ⭐ Overføring til Ordre (Phase 6)
```python
async def transfer_to_order(produksjonsid: int, db: AsyncSession):
    """Overfør godkjent produksjonsordre til tblordrer."""
    
    # Hent produksjonsordre
    prod = await db.get(Produksjon, produksjonsid)
    
    if prod.status != 'approved':
        raise ValueError("Kan kun overføre godkjente ordrer")
    
    if prod.ordre_id:
        raise ValueError("Allerede overført til ordre")
    
    # Opprett ny ordre
    ordre = Ordrer(
        kundeid=prod.kundeid,
        ordredato=datetime.now(),
        leveringsdato=prod.levert_dato,
        periodeid=prod.periodeid,
        status='confirmed',
        merknad=f"Overført fra produksjonsordre #{produksjonsid}"
    )
    db.add(ordre)
    await db.flush()
    
    # Kopier produksjonsdetaljer til ordredetaljer
    for detail in prod.detaljer:
        ordre_detail = Ordredetaljer(
            ordreid=ordre.ordreid,
            produktid=detail.produktid,
            kalkyleid=detail.kalkyleid,
            antall=detail.antall,
            pris=detail.pris,
            enhet=detail.enhet
        )
        db.add(ordre_detail)
    
    # Oppdater produksjonsordre
    prod.ordre_id = ordre.ordreid
    prod.status = 'transferred'
    prod.overfort_dato = datetime.now()
    
    await db.commit()
    return ordre.ordreid
```

## Success Criteria

### Phase 1-5:
- Admin kan lage produksjonstemplates
- Admin kan distribuere template til alle mottakskjøkken med ett klikk
- Mottakskjøkken kan se sin produksjonsbestilling (webshop-style)
- Mottakskjøkken kan fylle ut antall og sende inn
- Admin kan godkjenne/avvise bestillinger

### Phase 6 (NY):
- Godkjent produksjonsordre kan overføres til ordre
- Ordre opprettes automatisk i tblordrer per kunde
- Ordredetaljer kopieres korrekt
- Referanse mellom produksjon og ordre lagres
- Bulk overføring fungerer

### Phase 7 (senere):
- Produksjonskalkulering fungerer

## Estimert tid
**Total Phase 1-6: 15-19 dager (3-4 uker)**
**Phase 7 (senere): 3-4 dager**

## Priority
**CRITICAL** - Må gjøres før workflow automation

---

🤖 Generated with Claude Code
