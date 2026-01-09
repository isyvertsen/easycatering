# Kunder og Ordrer - Brukerdokumentasjon

Kunde- og ordremodulene lar deg administrere kunder, opprette og følge opp ordrer, og håndtere leveranser.

## Del 1: Kunder

### Oversikt over kundeadministrasjon

Kunderegisteret inneholder:
- Kundenavn og kontaktinformasjon
- Leveringsadresser
- Kundegrupper (skoler, sykehjem, bedrifter, etc.)
- Spesielle krav (allergener, dietter, preferanser)
- Ordrehistorikk
- Fakturainformasjon

## Legge til ny kunde

### Steg-for-steg

1. **Naviger til Kunder**
   - Klikk på **Kunder** i venstre meny
   - Du ser nå en oversikt over alle kunder

2. **Start ny kunde**
   - Klikk **"Ny kunde"**-knappen øverst til høyre
   - Et kundeskjema åpnes

3. **Fyll inn grunnleggende informasjon**

   | Felt | Beskrivelse | Påkrevd |
   |------|-------------|---------|
   | **Kundenummer** | Unikt kundenummer (kan genereres automatisk) | Ja |
   | **Kundenavn** | Navn på kunde/organisasjon | Ja |
   | **Organisasjonsnummer** | Norsk org.nr (9 siffer) | Nei |
   | **Kundegruppe** | Velg: Skole, Sykehjem, Bedrift, Privat, etc. | Ja |
   | **Aktiv** | Er kunden aktiv? (avhuk for aktiv) | Ja |

4. **Kontaktinformasjon**

   | Felt | Beskrivelse |
   |------|-------------|
   | **Kontaktperson** | Navn på hovedkontakt |
   | **E-post** | E-postadresse |
   | **Telefon** | Telefonnummer |
   | **Mobiltelefon** | Mobilnummer |

5. **Adresseinformasjon**

   **Fakturaadresse**:
   - Gateadresse
   - Postnummer
   - Poststed
   - Land (standard: Norge)

   **Leveringsadresse** (hvis annen enn fakturaadresse):
   - Avhuk **"Annen leveringsadresse"**
   - Fyll inn leveringsadresse
   - Legg til leveringsinstruksjoner (f.eks. "Lever i resepsjonen")

6. **Spesielle krav** (valgfritt)

   - **Allergener å unngå**: Velg allergener kunden må unngå
   - **Dietter**: Velg diettpreferanser (vegetar, vegansk, halal, etc.)
   - **Notater**: Fritekstfelt for spesiell informasjon

7. **Leveringsinnstillinger**

   - **Foretrukket leveringsdag**: Velg dag(er)
   - **Foretrukket leveringstid**: Velg tidsvindu
   - **Leveringsfrekvens**: Daglig, ukentlig, etc.

8. **Fakturering**

   - **Betalingsbetingelser**: 14, 30, 60 dager
   - **Fakturareferanse**: Kundens referanse
   - **E-faktura**: Avhuk hvis kunden bruker e-faktura
   - **EHF-adresse**: For elektronisk faktura

9. **Lagre kunden**
   - Klikk **"Lagre"** nederst
   - Kunden er nå opprettet og synlig i kundelisten

## Redigere eksisterende kunde

1. Gå til **Kunder** i menyen
2. Finn kunden:
   - Bruk søkefeltet
   - Eller bla gjennom listen
3. Klikk på kundenavnet eller rediger-ikonet
4. Gjør endringer i skjemaet
5. Klikk **"Lagre"**

## Kundegrupper

Kundegrupper hjelper med å organisere kunder og sette standardinnstillinger.

### Opprette kundegruppe

1. Gå til **Kunder** > **Kundegrupper**
2. Klikk **"Ny kundegruppe"**
3. Fyll inn:
   - Gruppenavn (f.eks. "Skoler i Larvik")
   - Beskrivelse
   - Standardinnstillinger (priser, leveringstid, etc.)
4. Klikk **"Lagre"**

### Fordeler med kundegrupper

- Felles prislister
- Like leveringsbetingelser
- Grupperapportering
- Enkel masseoppdatering

## Søke og filtrere kunder

### Søk
- Bruk søkefeltet øverst
- Søker i: kundenavn, kundenummer, kontaktperson

### Filter
- **Kundegruppe**: Vis kun en spesifikk gruppe
- **Status**: Aktive/inaktive kunder
- **Leveringsdag**: Kunder med levering på spesifikk dag

### Sortering
Klikk på kolonneoverskrifter:
- Kundenavn (A-Å)
- Kundenummer
- Siste ordre
- Total omsetning

## Kundeoversikt

Når du åpner en kunde ser du:

### Fanene

1. **Oversikt**: Hovedinformasjon og siste aktivitet
2. **Ordrer**: Alle ordrer for denne kunden
3. **Menyer**: Kundetilpassede menyer
4. **Notater**: Historikk og notater
5. **Dokumenter**: Kontrakter, avtaler, etc.
6. **Statistikk**: Omsetning, hyppighet, populære produkter

---

## Del 2: Ordrer

### Oversikt over ordrehåndtering

Ordresystemet håndterer:
- Ordreopprettelse og redigering
- Ordrebekreftelse til kunde
- Produksjonsplanlegging
- Pakkesedler og etiketter
- Leveringsoppfølging
- Fakturering

## Opprette ny ordre

### Steg-for-steg

1. **Naviger til Ordrer**
   - Klikk på **Ordrer** i venstre meny
   - Oversikt over alle ordrer vises

2. **Start ny ordre**
   - Klikk **"Ny ordre"**-knappen øverst til høyre
   - Ordreskjema åpnes

3. **Velg kunde**
   - Søk etter kunde i søkefeltet
   - Eller velg fra kundelist
   - Klikk på kunden
   - Kundeinformasjon fylles automatisk ut

4. **Ordredetaljer**

   | Felt | Beskrivelse | Påkrevd |
   |------|-------------|---------|
   | **Ordrenummer** | Genereres automatisk | Ja |
   | **Ordredato** | Dato ordren ble opprettet (standard: i dag) | Ja |
   | **Leveringsdato** | Når skal ordren leveres? | Ja |
   | **Leveringstid** | Spesifikt tidspunkt (valgfritt) | Nei |
   | **Referanse** | Kundens referanse/bestillingsnummer | Nei |

5. **Velg leveringsadresse**
   - Standard leveringsadresse vises
   - Klikk **"Endre"** for å velge annen adresse
   - Eller legg til ny adresse

6. **Legg til produkter/retter**

   **Metode 1: Søk og legg til**
   - Klikk **"+ Legg til produkt"**
   - Søk etter produkt eller oppskrift
   - Velg fra listen
   - Angi antall/mengde
   - Klikk **"Legg til"**

   **Metode 2: Fra ukemeny**
   - Klikk **"Legg til fra meny"**
   - Velg ukemeny
   - Velg dag(er)
   - Angi porsjoner
   - Klikk **"Legg til valgte"**

   **Metode 3: Fra tidligere ordre**
   - Klikk **"Kopier fra tidligere ordre"**
   - Velg ordre fra listen
   - Produkter kopieres inn
   - Juster mengder om nødvendig

7. **Juster ordrelinjer**

   For hver ordrelinje kan du:
   - **Endre antall**: Klikk på antallsfeltet
   - **Endre pris**: Klikk på prisfeltet (hvis du har tilgang)
   - **Legg til notat**: Spesiell beskjed om denne linjen
   - **Fjern**: Klikk søppelkasse-ikonet

8. **Ordresammendrag**

   På høyre side ser du:
   - **Antall linjer**: Totalt antall produkter/retter
   - **Antall enheter**: Totalt antall porsjoner/stk
   - **Subtotal**: Sum før mva
   - **MVA**: Merverdiavgift (25% eller annet)
   - **Total**: Totalpris inkl. mva
   - **Næringsverdier**: Total ernæring for ordren
   - **Allergener**: Samlede allergener

9. **Leveringsinformasjon**
   - **Leveringsmetode**: Frakt, henting, budbil, etc.
   - **Leveringsnotat**: Spesielle instruksjoner
   - **Pakking**: Spesielle pakkekrav

10. **Lagre ordren**
    - Klikk **"Lagre som utkast"** for å lagre uten å sende
    - Eller klikk **"Lagre og send"** for å sende ordrebekreftelse til kunde

## Ordrestatus

Hver ordre har en status som viser hvor langt den har kommet i prosessen:

| Status | Beskrivelse | Handlinger |
|--------|-------------|------------|
| **Utkast** | Ordre er opprettet men ikke bekreftet | Rediger, Send, Slett |
| **Bekreftet** | Ordre er bekreftet og klar for produksjon | Start produksjon, Avbryt |
| **I produksjon** | Kjøkkenet jobber med ordren | Ferdigstill, Marker som klar |
| **Klar** | Ordre er pakket og klar for levering | Lever, Print pakkeseddel |
| **Levert** | Ordre er levert til kunde | Fakturer, Lukk |
| **Fakturert** | Faktura er sendt til kunde | Marker som betalt |
| **Avbrutt** | Ordre er kansellert | Arkiver |

### Endre status

1. Åpne ordren
2. Klikk på status-dropdown øverst
3. Velg ny status
4. Legg til kommentar om nødvendig
5. Klikk **"Oppdater status"**

## Redigere ordre

Du kan redigere ordrer som ikke er levert eller fakturert.

1. Finn ordren i ordrelisten
2. Klikk på ordrenummeret
3. Klikk **"Rediger"**
4. Gjør endringer
5. Klikk **"Lagre"**

**Viktig**: Hvis ordren allerede er i produksjon, informer kjøkkenet om endringer!

## Kopiere ordre

1. Åpne ordren du vil kopiere
2. Klikk **"Kopier ordre"**
3. Velg ny leveringsdato
4. Juster om nødvendig
5. Lagre ny ordre

## Avbryte ordre

1. Åpne ordren
2. Klikk **"Avbryt ordre"**
3. Velg årsak:
   - Kunde avbestilte
   - Feil i ordre
   - Kunne ikke leveres
   - Annet (spesifiser)
4. Skriv kommentar
5. Klikk **"Bekreft avbrytelse"**

**Viktig**: Avbrutte ordrer kan ikke gjenopprettes, men kan kopieres til ny ordre.

## Ordrevisninger

### Listeoversikt (standard)
- Alle ordrer i en liste
- Sortering og filtrering
- Rask oversikt

### Kalenderoversikt
- Ordrer vist i kalender etter leveringsdato
- Dra ordrer for å endre leveringsdato
- Fargekoding etter status

### Kanban-tavle
- Ordrer organisert etter status
- Dra ordrer mellom kolonner for å endre status
- Visuell oversikt over arbeidsprosess

Bytt visning med knappene øverst til høyre.

## Søke og filtrere ordrer

### Søk
- Ordrenummer
- Kundenavn
- Produktnavn
- Referansenummer

### Filter
- **Status**: Velg én eller flere statuser
- **Dato**: Ordredato eller leveringsdato
- **Kunde**: Velg spesifikk kunde
- **Kundegruppe**: Filter på kundegruppe
- **Produkt**: Ordrer som inneholder spesifikt produkt

### Hurtigfilter (forhåndsdefinerte)
- **I dag**: Ordrer for levering i dag
- **Denne uken**: Ordrer for denne uken
- **Forfalt**: Ordrer som skulle vært levert
- **Mine ordrer**: Ordrer du har opprettet

## Ordredokumenter

### Ordrebekreftelse

Sendes til kunde for å bekrefte ordre.

1. Åpne ordre
2. Klikk **"Send ordrebekreftelse"**
3. Forhåndsvis dokument
4. Velg metode:
   - E-post til kunde
   - Last ned PDF
   - Skriv ut
5. Klikk **"Send"**

### Pakkeseddel

Følger med ordren ved levering.

1. Åpne ordre (status: Klar)
2. Klikk **"Print pakkeseddel"**
3. Forhåndsvis
4. Velg format:
   - Standard (A4)
   - Kompakt (A5)
   - Med strekkode
5. Klikk **"Skriv ut"**

### Følgeseddel

Ekstra informasjon til kunde (f.eks. oppvarmingsinstruksjoner).

1. Åpne ordre
2. Klikk **"Generer følgeseddel"**
3. Velg hva som skal inkluderes:
   - Oppvarmingsinstruksjoner
   - Næringsverdier
   - Holdbarhetsdato
   - Allergener
4. Last ned eller skriv ut

## Produksjonsplanlegging

Under **Ordrer** > **Produksjon** finner du:

### Produksjonsliste

Viser alle ordrer som skal produseres.

**Grupper etter**:
- Leveringsdato
- Produkt
- Kunde

**Viser**:
- Hvilke retter/produkter som skal produseres
- Totalt antall porsjoner
- Ingredienslister
- Estimert produksjonstid

### Ingredienssamledrag

Automatisk beregning av totale ingredienser for alle ordrer i periode.

1. Gå til **Ordrer** > **Produksjon** > **Ingrediensliste**
2. Velg periode (f.eks. neste uke)
3. Systemet summerer alle ingredienser
4. Eksporter til:
   - Innkjøpsliste
   - Excel
   - PDF

Dette gjør innkjøp mye enklere!

## Rapporter

### Ordrestatistikk

Under **Rapporter** > **Ordrer** finner du:

- **Omsetning**: Per periode, kunde, produkt
- **Ordrefrekvens**: Hvor ofte kunder bestiller
- **Populære produkter**: Mest solgte retter
- **Gjennomsnittlig ordrestørrelse**: Verdi og antall
- **Leveringspresisjon**: Andel ordrer levert til rett tid

### Eksportere data

1. Gå til **Ordrer**
2. Sett filter for ønsket data
3. Klikk **"Eksporter"**
4. Velg format:
   - Excel (.xlsx)
   - CSV
   - PDF
5. Last ned fil

## Best practices

### Ordreopprettelse
- **Opprett tidlig**: Legg inn ordrer så snart de er bekreftet
- **Dobbeltsjekk**: Kontroller alltid leveringsdato og adresse
- **Notater**: Legg til viktig informasjon i notater-feltet

### Kommunikasjon
- **Send bekreftelse**: Alltid send ordrebekreftelse til kunde
- **Oppdater status**: Hold kunden informert om ordrestatus
- **Varsle om endringer**: Informer straks ved forsinkelser eller problemer

### Produksjon
- **Planlegg fremover**: Se produksjonsliste minst 3 dager frem
- **Ingrediensliste**: Generer ukentlig ingrediensliste for effektiv innkjøp
- **Optimaliser**: Grupper ordrer med like produkter for effektiv produksjon

## Feilsøking

### Problem: Kan ikke legge til produkt i ordre
**Løsning**:
1. Sjekk at produktet er aktivt
2. Sjekk at produktet har pris
3. Prøv å søke på produktnummer i stedet for navn

### Problem: Næringsverdier mangler
**Løsning**: Næringsverdier kommer fra produktene/oppskriftene. Sjekk at disse har fullstendige næringsverdier.

### Problem: Kan ikke endre ordre
**Løsning**: Ordrer som er fakturert kan ikke endres. Du må kreditere ordren og lage ny.

### Problem: Kunde mottar ikke ordrebekreftelse
**Løsning**:
1. Sjekk at kundens e-post er korrekt
2. Sjekk spam-filter
3. Last ned PDF og send manuelt

## Tips og triks

1. **Favorittordrer**: Merk hyppige ordrer som favoritter for rask gjenbruk
2. **Maler**: Lag ordremaler for standardleveranser
3. **Bulkoppretting**: Opprett flere ordrer samtidig fra ukemeny
4. **Mobilapp**: Bruk mobilappen for ordreoppdatering i felt
5. **Varsler**: Sett opp e-postvarsler for ordrestatusen­dringer

---

**Neste steg**: Lær om [produktadministrasjon](./produkter.md) og hvordan du kobler produkter til ordrer
