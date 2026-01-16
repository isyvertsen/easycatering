# Oppskrifter - Brukerdokumentasjon

Oppskriftsmodulen lar deg opprette, administrere og dele oppskrifter for retter som brukes i cateringsystemet.

## Oversikt

Oppskrifter i LKC-systemet har følgende funksjoner:
- Automatisk beregning av næringsverdier basert på ingredienser
- Automatisk deteksjon av allergener
- Porsjonsjustering og skalering
- Kopiering av oppskrifter for rask opprettelse
- Kategorisering av retter
- Kostnadskalkyle basert på ingredienspriser

## Opprette en ny oppskrift

### Steg-for-steg

1. **Naviger til Oppskrifter**
   - Klikk på **Oppskrifter** i venstre meny
   - Du ser nå en oversikt over alle eksisterende oppskrifter

2. **Start ny oppskrift**
   - Klikk på **"Ny oppskrift"**-knappen øverst til høyre
   - Et oppskriftsskjema åpnes

3. **Fyll inn grunnleggende informasjon**

   | Felt | Beskrivelse | Påkrevd |
   |------|-------------|---------|
   | **Navn** | Beskrivende navn (f.eks. "Kyllinggryte med ris") | Ja |
   | **Beskrivelse** | Kort beskrivelse av retten | Nei |
   | **Kategori** | Velg fra: Hovedrett, Dessert, Forrett, Salat, Tilbehør, etc. | Ja |
   | **Porsjoner** | Antall porsjoner oppskriften gir (standard: 4) | Ja |
   | **Porsjonsstørrelse** | Størrelse per porsjon i gram (valgfritt) | Nei |

4. **Legg til ingredienser**

   a. Finn seksjonen **"Ingredienser"**

   b. Klikk **"Legg til ingrediens"**

   c. Søk etter produktet:
      - Skriv produktnavn i søkefeltet
      - Systemet søker i produktkatalogen
      - Velg riktig produkt fra listen

   d. Angi mengde:
      - Skriv inn mengde (f.eks. 500)
      - Velg enhet fra dropdown:
        - `gram` (g) - standard
        - `kilogram` (kg)
        - `liter` (l)
        - `desiliter` (dl)
        - `stykker` (stk)
        - `ss` (spiseskje)
        - `ts` (teskje)

   e. Gjenta for alle ingredienser

   f. **Fjerne ingrediens**: Klikk på søppelkasse-ikonet ved siden av ingrediensen

5. **Legg til tilberedningsinstruksjoner** (valgfritt)
   - Finn seksjonen **"Tilberedning"**
   - Skriv steg-for-steg instruksjoner
   - Bruk nummererte punkter for klarhet
   - Inkluder temperatur, tid og viktige detaljer

6. **Næringsverdier** (automatisk)
   - Systemet beregner næringsverdier **automatisk** basert på ingrediensene
   - Du ser næringsverdier per 100g og per porsjon
   - Følgende verdier beregnes:
     - Energi (kJ og kcal)
     - Fett (inkl. mettet fett)
     - Karbohydrater (inkl. sukkerarter)
     - Protein
     - Salt
     - Kostfiber

7. **Allergener** (automatisk)
   - Allergener detekteres automatisk fra ingrediensene
   - Vises med ikoner og tekst
   - Følgende allergener støttes:
     - Gluten
     - Laktose
     - Egg
     - Fisk
     - Skalldyr
     - Nøtter
     - Peanøtter
     - Soya
     - Selleri
     - Sennep
     - Sesamfrø
     - Sulfitt
     - Lupin
     - Bløtdyr

8. **Lagre oppskriften**
   - Sjekk at all informasjon er korrekt
   - Klikk **"Lagre"**-knappen nederst
   - Oppskriften er nå tilgjengelig i oppskriftsbiblioteket

## Redigere eksisterende oppskrift

1. Gå til **Oppskrifter** i menyen
2. Finn oppskriften du vil redigere:
   - Bruk søkefeltet for å søke etter navn
   - Eller bla gjennom listen
3. Klikk på oppskriftsnavnet eller rediger-ikonet (blyant)
4. Gjør endringer i skjemaet
5. Klikk **"Lagre"** for å bekrefte endringene

**Viktig**: Endringer i oppskriften påvirker alle fremtidige menyer, men ikke eksisterende ordrer.

## Kopiere oppskrift

Kopiering er nyttig når du vil lage en variant av en eksisterende oppskrift.

1. Åpne oppskriften du vil kopiere
2. Klikk **"Kopier"**-knappen
3. En ny oppskrift opprettes med "(Kopi)" lagt til navnet
4. Rediger den kopierte oppskriften etter behov
5. Lagre

## Slette oppskrift

**OBS**: Sletting kan ikke angres!

1. Åpne oppskriften
2. Klikk **"Slett"**-knappen
3. Bekreft sletting i dialogboksen

**Viktig**: Du kan ikke slette oppskrifter som er i bruk i aktive menyer eller ordrer. Du må først fjerne oppskriften fra disse.

## Søke og filtrere oppskrifter

### Søk
- Bruk søkefeltet øverst på oppskrifts-siden
- Søket finner oppskrifter basert på:
  - Oppskriftsnavn
  - Ingredienser
  - Beskrivelse

### Filtrering
Bruk filtermenyen for å begrense visningen:
- **Kategori**: Vis kun en bestemt kategori (f.eks. kun Hovedretter)
- **Allergener**: Finn oppskrifter uten spesifikke allergener
- **Porsjonsstørrelse**: Sorter etter antall porsjoner

### Sortering
Klikk på kolonneoverskrifter for å sortere:
- Navn (A-Å eller Å-A)
- Kategori
- Sist endret
- Antall porsjoner

## Porsjonsjustering

Når du bruker en oppskrift i en meny eller ordre, kan du justere antall porsjoner:

1. Velg oppskriften i meny/ordre-skjemaet
2. Endre porsjonsfelt til ønsket antall
3. Systemet skalerer automatisk:
   - Ingrediensmengder
   - Næringsverdier
   - Totalkostnad

**Eksempel**:
- Oppskrift laget for 4 porsjoner
- Du trenger 20 porsjoner
- System multipliserer alle mengder med 5

## Kostnadskalkyle

Hvis produkter har priser registrert, viser oppskriften:
- **Totalkostnad**: Summen av alle ingredienser
- **Kostnad per porsjon**: Totalkostnad delt på antall porsjoner
- **Dekningsbidrag**: Hvis salgspris er satt

Dette hjelper deg med prissetting av retter.

## Kalkulering av mengder (NYT i v2.7.0)

Kalkuleringsfunksjonaliteten lar deg automatisk beregne ingrediensmengder og priser for et bestemt antall porsjoner.

### Slik kalkulerer du en oppskrift

1. **Åpne oppskriften**
   - Naviger til oppskriften du vil kalkulere
   - Du finner kalkuleringsverktøyet på oppskriftsdetaljsiden

2. **Kalkuler mengder**
   - Finn seksjonen **"Kalkulering og Rapport"**
   - Skriv inn ønsket antall porsjoner i input-feltet
   - Klikk **"Kalkuler"**-knappen

3. **Automatisk beregning**
   - Systemet beregner automatisk:
     - Total mengde for hver ingrediens basert på antall porsjoner
     - Enhetskonvertering (f.eks. gram til kilogram)
     - Totalkostnad basert på produktpriser
   - Resultatene lagres i databasen
   - Ingredienstabellen oppdateres med nye verdier

4. **Se resultatet**
   - Oppdaterte mengder vises i ingredienslisten
   - Nye priser beregnes automatisk
   - Oppskriften er nå klar for det spesifiserte antall porsjoner

### Eksempel
- **Originaloppskrift**: 4 porsjoner
- **Du trenger**: 50 porsjoner (til et arrangement)
- **Systemet kalkulerer**: Alle mengder multipliseres med 12,5
- **Resultat**: Korrekte mengder for 50 porsjoner, klar for innkjøp og produksjon

## PDF-rapport (NYT i v2.7.0)

Generer en detaljert PDF-rapport av oppskriften, perfekt for utskrift og bruk i produksjonen.

### Slik laster du ned en rapport

1. **Åpne oppskriften**
   - Naviger til oppskriften

2. **Velg rapportalternativer**
   - Finn seksjonen **"Kalkulering og Rapport"**
   - **Valgfritt**: Huk av for "Kalkuler for X porsjoner før generering"
     - Dette kalkulerer oppskriften automatisk før PDF-en genereres
     - Nyttig hvis du vil ha rapporten for et spesifikt antall porsjoner

3. **Last ned rapporten**
   - Klikk **"Last ned rapport (PDF)"**-knappen
   - PDF-filen lastes ned automatisk til din datamaskin

### Innhold i PDF-rapporten

Rapporten inneholder:

**Oppskriftsdetaljer:**
- Oppskriftsnavn
- Kalkylekode
- Antall porsjoner
- Referanseporsjon
- Opprettet og revidert dato
- Leveringsdato
- Ansatt-ID
- Produksjonsmetode

**Tilleggsinformasjon:**
- Informasjon om oppskriften
- Brukes til (formål)
- Merknader

**Ingrediensliste:**
- Sortert etter **Lager-ID** for enklere vareinntak
- Produktnavn
- Porsjonsmengde med enhet
- Total mengde
- Visningsenhet (f.eks. kg i stedet for g)

### Bruksområder for rapporten

- **Produksjon**: Skriv ut og bruk som arbeidsark i kjøkkenet
- **Vareinntak**: Sortert etter lager-ID gjør det enkelt å plukke varer
- **Dokumentasjon**: Lagre som digital kopi av oppskriften
- **Kostnadsanalyse**: Se totalkostnader for ingredienser
- **Leverandørbestilling**: Bruk som grunnlag for innkjøp

### Tips for effektiv bruk

1. **Kalkuler før utskrift**: Huk av for automatisk kalkulering for å få riktig antall porsjoner i rapporten
2. **Lagring**: Lagre PDF-ene med beskrivende navn (f.eks. "Kyllinggryte_50porsjoner_2026-01-16.pdf")
3. **Arkivering**: Oppretthold en digital arkivmappe for produksjonsrapporter

## Bilder

Du kan legge til bilder på oppskrifter:

1. Åpne oppskriften for redigering
2. Klikk på **"Last opp bilde"**-knappen
3. Velg bildefil fra din datamaskin (JPG, PNG)
4. Bildet vises på oppskriften
5. For å endre: Klikk på bildet og last opp nytt

## Best practices

### Navngivning
- Bruk beskrivende og konsistente navn
- Inkluder viktige ingredienser i navnet
- Eksempler:
  - ✅ "Kyllinggryte med ris og grønnsaker"
  - ✅ "Laksepai med spinat"
  - ❌ "Gryte 1"
  - ❌ "Fisk"

### Kategorisering
- Velg riktig kategori fra starten
- Dette gjør det lettere å finne oppskrifter senere
- Bruk kategorier konsekvent

### Ingredienser
- Bruk produkter fra produktkatalogen for nøyaktige næringsverdier
- Hvis et produkt mangler, legg det til i produktkatalogen først
- Vær nøyaktig med mengder for korrekte beregninger

### Tilberedningsinstruksjoner
- Skriv klare, steg-for-steg instruksjoner
- Inkluder temperaturer og tider
- Tenk på at andre skal kunne følge instruksjonene

## Feilsøking

### Problem: Næringsverdier vises ikke
**Løsning**: Sjekk at alle ingredienser har næringsverdier registrert i produktkatalogen. Produkter uten næringsverdier bidrar ikke til beregningen.

### Problem: Kan ikke finne et produkt
**Løsning**:
1. Sjekk stavemåten
2. Prøv å søke på deler av navnet
3. Hvis produktet ikke finnes, opprett det i **Produkter**-modulen først

### Problem: Allergener vises ikke riktig
**Løsning**: Allergener kommer fra produktenes registrerte allergener. Sjekk at produktene har riktige allergener registrert i produktkatalogen.

### Problem: Kan ikke slette oppskrift
**Løsning**: Oppskriften er sannsynligvis i bruk i en meny eller ordre. Fjern oppskriften fra disse først, eller arkiver i stedet for å slette.

## Tips og triks

1. **Bruk kopiering**: I stedet for å lage en ny oppskrift fra bunnen av, kopier en lignende og rediger
2. **Standardporter**: Opprett oppskrifter for standard porsjonsantall (f.eks. 10 eller 50) for lettere skalering
3. **Faste maler**: Lag "mal-oppskrifter" for vanlige retter som du kan kopiere og tilpasse
4. **Sjekk allergener**: Alltid dobbeltsjekk allergeninfo før du serverer retter til kunder
5. **Oppdater jevnlig**: Hold oppskriftene oppdaterte med nye priser og leverandørinfo

---

## Om denne funksjonen

Kalkuleringsfunksjonaliteten og PDF-rapport (v2.7.0) ble utviklet med assistanse fra [Claude Code](https://claude.com/claude-code), Anthropics AI-assistent for programvareutvikling. Funksjonen erstatter den tidligere SQL stored procedure `sp_KalkulerOppskrift` med moderne Python/FastAPI-kode for bedre vedlikeholdbarhet og utvidbarhet.

---

**Neste steg**: Lær hvordan du bruker oppskrifter i [Menyplanlegging](./menyer.md)
