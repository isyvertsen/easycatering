# Etiketter - Brukerdokumentasjon

Etikettmodulen lar deg designe, forhåndsvise og skrive ut etiketter for produkter, oppskrifter og ferdige retter.

## Oversikt

Etikettsystemet støtter:
- Visuelle etikettdesigner (drag-and-drop)
- Ferdiglagde maler for vanlige etikettformater
- Automatisk utfylling av næringsverdier og allergener
- Strekkoder (EAN-13, EAN-8, QR-koder)
- Utskrift til vanlige skrivere og Zebra-skrivere
- Batch-utskrift (flere etiketter samtidig)

## Viktige konsepter

### Etiketttyper

| Type | Bruksområde | Eksempel |
|------|-------------|----------|
| **Produktetikett** | Råvarer og produkter | EAN-strekkode med pris |
| **Oppskriftsetikett** | Ferdige retter | Næringsverdier, allergener, holdbarhet |
| **Fryse-/kjøle-etikett** | Datomerking | Produksjonsdato, beste før-dato |
| **Pakke-etikett** | Forsendelsesetiketter | Kunde, adresse, innhold |

### Etikettformater

**Vanlige formater**:
- 70 x 37 mm (standard produktetikett)
- 100 x 50 mm (stor produktetikett)
- 57 x 32 mm (Zebra-skriver standard)
- A4 (for vanlige skrivere)
- A5 (kompakt format)

### Lovkrav for matvarer

Etiketter på mat må inneholde:
- ✓ Produktnavn
- ✓ Ingrediensliste (i synkende rekkefølge)
- ✓ Allergener (fremhevet)
- ✓ Nettovekt/volum
- ✓ Holdbarhetsdato
- ✓ Oppbevaringsinstruksjoner
- ✓ Navn og adresse på produsent
- ✓ Næringsdeklarasjon

LKC hjelper deg med å følge kravene automatisk.

## Opprette etikett

### Metode 1: Bruk ferdig mal

**Raskeste metode for standardetiketter**

1. **Naviger til Etiketter**
   - Klikk på **Etiketter** i venstre meny

2. **Velg mal**
   - Klikk **"Ny etikett"**
   - Velg mal fra galleriet:
     - "Produktetikett standard"
     - "Oppskriftsetikett med næringsverdier"
     - "Fryse-etikett enkel"
     - "Allergen-etikett"
   - Klikk **"Bruk mal"**

3. **Velg produkt/oppskrift**
   - Søk etter produkt eller oppskrift
   - Velg fra listen
   - Data fylles automatisk ut

4. **Forhåndsvis**
   - Forhåndsvisning vises automatisk
   - Sjekk at all informasjon er korrekt

5. **Skriv ut**
   - Klikk **"Skriv ut"**
   - Velg skriver
   - Angi antall kopier
   - Klikk **"Skriv ut"**

### Metode 2: Design egen etikett

**For spesialtilpassede etiketter**

1. **Start etikettdesigner**
   - Klikk **Etiketter** > **"Design ny"**
   - Velg etikettformat (størrelse)
   - Tom designer åpnes

2. **Legg til elementer**

   Dra elementer fra verktøylinjen til etikett-canvas:

   | Element | Beskrivelse | Egenskaper |
   |---------|-------------|------------|
   | **Tekst** | Friteksttekst | Font, størrelse, farge, justering |
   | **Produktnavn** | Automatisk produktnavn | Fet, understreket, størrelse |
   | **Næringstabell** | Næringsdeklarasjon | Layout (tabell/liste), per 100g/porsjon |
   | **Allergener** | Allergeninfo med ikoner | Tekst og/eller ikoner |
   | **Strekkode** | EAN/QR-kode | Type, størrelse, vis tall |
   | **Bilde** | Produktbilde eller logo | Størrelse, posisjon |
   | **Holdbarhet** | Datofelt | Format, produksjons-/utløpsdato |
   | **Ingredienser** | Ingrediensliste | Font, rekkefølge |
   | **Linje** | Skillelinje | Tykkelse, farge, stil |
   | **Boks** | Ramme | Farge, radius, fyll |

3. **Posisjonere elementer**
   - Dra elementer for å flytte
   - Bruk håndtak i hjørnene for å endre størrelse
   - Bruk rutenett for presis plassering
   - Juster med piltaster (1px) eller Shift+piltast (10px)

4. **Tilpass design**
   - Klikk på element for å se egenskaper
   - Endre font, størrelse, farge, etc.
   - Bruk **"Lag"** for å bringe elementer foran/bak
   - Bruk **"Juster"** for å sentrere og fordele

5. **Lagre som mal** (valgfritt)
   - Klikk **"Lagre som mal"**
   - Gi malen et navn
   - Velg kategori
   - Malen er nå tilgjengelig for gjenbruk

6. **Forhåndsvis og skriv ut**
   - Klikk **"Forhåndsvis"**
   - Sjekk at alt ser riktig ut
   - Klikk **"Skriv ut"**

## Næringstabell

Næringstabell genereres automatisk fra produkt/oppskrift.

### Valg for næringstabell

- **Enhet**: Per 100g, per 100ml, per porsjon
- **Format**: Tabell (standard) eller liste
- **Språk**: Norsk, engelsk
- **Inkluder**:
  - ☑️ Energi (kJ og kcal)
  - ☑️ Fett (mettet fett)
  - ☑️ Karbohydrater (sukkerarter)
  - ☑️ Protein
  - ☑️ Salt
  - ☐ Kostfiber (valgfri)
  - ☐ Vitaminer og mineraler (hvis relevant)

### GDA/RI-verdier (Guideline Daily Amount)

Kan vise prosent av daglig anbefalt inntak:
- Aktiveres i etikettinnstillinger
- Basert på 2000 kcal-diett
- Vises som prosent (%) ved siden av verdier

## Allergenmerking

### Automatisk allergendeteksjon

Systemet finner allergener automatisk fra:
- Produktets registrerte allergener
- Oppskriftens ingredienser
- Sporallergener (hvis konfigurert)

### Visningsalternativer

1. **Ikoner**: Visuelle symboler for hver allergen
2. **Tekst**: "Inneholder: gluten, laktose, egg"
3. **Fremhevet i ingrediensliste**: Allergener i **FET** skrift
4. **Kombinasjon**: Både ikoner og tekst

### Sporallergener

Hvis produktet kan inneholde spor:
- "Kan inneholde spor av..."
- Legges til automatisk hvis konfigurert
- Kan redigeres manuelt

## Strekkoder

### Typer strekkoder

| Type | Bruk | Fordeler |
|------|------|----------|
| **EAN-13** | Standard produktstrekkode | Universelt støttet |
| **EAN-8** | Små produkter | Kompakt |
| **QR-kode** | Mer informasjon | Kan inneholde lenke til produktside |
| **Code 128** | Intern bruk | Fleksibel |

### Legge til strekkode

1. Dra **"Strekkode"**-elementet til etikett
2. Velg strekkodetype
3. Angi kode:
   - **Automatisk**: Bruk produktets EAN
   - **Manuell**: Skriv inn kode
   - **Generert**: System genererer intern kode
4. Tilpass visning:
   - Størrelse
   - Vis tall under strekkode
   - Feil-toleranse (for QR)

### QR-koder med ekstra info

QR-koder kan inneholde:
- Produktside med full informasjon
- Sporbarhet (batch-nummer, produksjonsdato)
- Oppskrift med tilberedningsinstruksjoner
- Link til allergeninformasjon

Konfigurer i **Innstillinger** > **Etiketter** > **QR-kode innhold**

## Utskrift

### Vanlige skrivere (A4)

1. Velg etikett(er) for utskrift
2. Klikk **"Skriv ut"**
3. Velg **"Vanlig skriver"**
4. Velg layout:
   - **Enkelt**: En etikett per side
   - **Multippel**: Flere etiketter per ark (f.eks. 24 stk)
   - **Etikett-ark**: Velg etikett-ark mal (Avery, Herma, etc.)
5. Forhåndsvis
6. Klikk **"Skriv ut"**

### Zebra-skrivere

Zebra-skrivere er spesialskrivere for etiketter.

**Fordeler**:
- Rask utskrift
- Høy kvalitet
- Termisk utskrift (ingen blekk)
- Perfekt for mye etikettutskrift

#### Konfigurere Zebra-skriver

Først gang eller ved ny skriver:

1. Gå til **Innstillinger** > **Skrivere**
2. Klikk **"Legg til Zebra-skriver"**
3. Fyll inn:
   - Skrivernavn (f.eks. "Zebra Kjøkken")
   - IP-adresse (hvis nettverksskriver)
   - eller USB-port (hvis USB-tilkoblet)
   - Etikettbredde (mm)
   - Etikettlengde (mm)
4. Test tilkobling
5. Klikk **"Lagre"**

#### Skrive ut til Zebra

1. Velg etikett
2. Klikk **"Skriv ut"**
3. Velg **"Zebra-skriver"**
4. Velg skriver fra liste
5. Angi antall kopier
6. Klikk **"Skriv ut"**

**Tips**: Zebra-skrivere støtter batch-utskrift av mange etiketter raskt.

## Batch-utskrift

Skriv ut mange etiketter samtidig.

### Brukstilfeller
- Ukens menyer (alle retter)
- Alle produkter i en kategori
- Ordrelinje-etiketter

### Steg-for-steg

1. **Velg etiketter**

   **Alternativ A: Fra oppskrifter**
   - Gå til **Oppskrifter**
   - Huk av for oppskrifter
   - Klikk **"Handlinger"** > **"Skriv ut etiketter"**

   **Alternativ B: Fra meny**
   - Gå til **Menyer**
   - Åpne ukemeny
   - Klikk **"Skriv ut alle etiketter for uken"**

   **Alternativ C: Fra ordre**
   - Åpne ordre
   - Klikk **"Skriv ut etiketter for alle produkter"**

2. **Velg etikettmal**
   - Velg hvilken mal som skal brukes
   - Samme mal for alle, eller en per produkttype

3. **Tilpass innstillinger**
   - Antall kopier per etikett
   - Sorteringsrekkefølge
   - Gruppe etter kategori

4. **Forhåndsvis**
   - Se alle etiketter i forhåndsvisning
   - Klikk gjennom for å sjekke

5. **Skriv ut**
   - Velg skriver
   - Klikk **"Skriv ut alle"**

## Etikettmaler

### Administrere maler

Gå til **Etiketter** > **"Maler"** for oversikt.

### Opprette mal

1. Design etikett i designer
2. Klikk **"Lagre som mal"**
3. Fyll inn:
   - Malnavn
   - Beskrivelse
   - Kategori
   - Merkelapper (tags)
4. Lagre

### Redigere mal

1. Åpne mal
2. Klikk **"Rediger"**
3. Gjør endringer i designer
4. Lagre

**Viktig**: Endringer påvirker ikke allerede utskrevne etiketter, men nye utskrifter vil bruke oppdatert mal.

### Dele maler

1. Åpne mal
2. Klikk **"Del"**
3. Velg:
   - Bare meg
   - Min avdeling
   - Alle i organisasjonen
4. Lagre

### Importere/eksportere maler

**Eksportere**:
1. Velg mal
2. Klikk **"Eksporter"**
3. Lagre som .lkc-fil

**Importere**:
1. Klikk **"Importer mal"**
2. Velg .lkc-fil
3. Malen legges til i biblioteket

## Holdbarhetsdato

### Typer datoer

- **Produksjonsdato**: Når produktet ble laget
- **Pakkedato**: Når produktet ble pakket
- **Beste før**: Kvalitetsgaranti til dato
- **Siste forbruksdag**: Må forbrukes innen

### Automatisk beregning

Systemet kan beregne holdbarhet automatisk:

1. Sett standard holdbarhet på produkt/oppskrift
2. Når etikett skrives ut, beregnes:
   - Produksjonsdato = i dag
   - Beste før = i dag + holdbarhetsdager
3. Visers på etikett

### Manuell datering

1. Åpne etikett for utskrift
2. Klikk **"Endre datoer"**
3. Angi manuelle datoer
4. Skriv ut

## Etikettgalleri

Se og administrer tidligere utskrevne etiketter.

### Finne etikett

1. Gå til **Etiketter** > **"Galleri"**
2. Filtrer:
   - Dato
   - Produkt/oppskrift
   - Mal
   - Skrevet ut av
3. Klikk på etikett for å åpne

### Skrive ut på nytt

1. Åpne etikett fra galleriet
2. Klikk **"Skriv ut på nytt"**
3. Samme data skrives ut igjen

**Tips**: Nyttig hvis etikett er skadet eller man trenger flere kopier.

## Best practices

### Design
- **Hold det enkelt**: Ikke overfyll etikett med informasjon
- **Les barhet**: Bruk minimum 8pt font for tekst
- **Kontrast**: Sørg for god kontrast (svart på hvit)
- **Marg**: Legg alltid til 2-3mm marg rundt kanten

### Juridisk
- **Følg lovkrav**: Sjekk at alle påkrevde elementer er med
- **Allergenmerking**: Dobbeltsjekk allergeninfo
- **Holdbarhet**: Sett realistiske holdbarhetsdatoer
- **Dokumentasjon**: Lagre kopier av etiketter

### Effektivitet
- **Lag maler**: Lag gode maler for standardetiketter
- **Batch-utskrift**: Skriv ut flere samtidig for å spare tid
- **Automatiser**: Bruk automatisk datautfylling
- **Test først**: Skriv ut testeksemplar før store batch

## Feilsøking

### Problem: Zebra-skriver skriver ikke
**Løsning**:
1. Sjekk at skriveren er på og tilkoblet
2. Test tilkobling i **Innstillinger** > **Skrivere**
3. Sjekk at etikettrulle er lagt i korrekt
4. Kalibrer skriver (se skrivermanual)

### Problem: Næringsverdier mangler
**Løsning**: Produktet/oppskriften mangler næringsinformasjon. Gå til produkt/oppskrift og legg til næringsverdier.

### Problem: Etikett ser feil ut på utskrift
**Løsning**:
1. Sjekk at riktig etikettformat er valgt
2. Sjekk skriverinnstillinger (margin, skalering)
3. Forhåndsvis før utskrift
4. Juster design om nødvendig

### Problem: Strekkode scanner ikke
**Løsning**:
1. Sjekk at strekkoden er stor nok (minst 25mm bred)
2. Sjekk skriverkvalitet (rengjør skriverhode)
3. Øk størrelsen på strekkode i designer
4. Test med flere skannere

### Problem: Allergener stemmer ikke
**Løsning**: Sjekk at produktene/ingrediensene har riktige allergener registrert. Oppdater i produktkatalogen.

## Tips og triks

1. **Hurtigtast**: `Ctrl/Cmd + P` for rask utskrift av åpen etikett

2. **Favorittmaler**: Marker ofte brukte maler som favoritter for rask tilgang

3. **Forhåndsvisning**: Alltid forhåndsvis før første utskrift av batch

4. **Lagre design**: Lagre halvferdige design som utkast for å fortsette senere

5. **Gjenbruk**: Kopier eksisterende etikett i stedet for å starte på nytt

6. **Mobile**: Bruk mobilapp for rask etikett-utskrift fra produksjons gulvet

7. **Backup**: Eksporter viktige maler regelmessig for backup

---

**Relatert**: Se også [Rapporter](./rapporter.md) for statistikk over etikettutskrift og [Innstillinger](./innstillinger.md) for skriveroppsett
