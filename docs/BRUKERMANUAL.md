# Brukermanual - Larvik Kommune Catering System

**Versjon:** 2.7.0
**Sist oppdatert:** 2026-01-16

---

## Innholdsfortegnelse

1. [Oversikt](#oversikt)
2. [Hovedmeny](#hovedmeny)
3. [Dashboard](#dashboard)
4. [Oppskrifter](#oppskrifter)
5. [Bestillinger](#bestillinger)
6. [Produkter](#produkter)
7. [Kunder](#kunder)
8. [Ansatte](#ansatte)
9. [Menyer](#menyer)
10. [Rapporter](#rapporter)
11. [Etiketter](#etiketter)
12. [Administrasjon](#administrasjon)
13. [Innstillinger](#innstillinger)

---

## Oversikt

Larvik Kommune Catering System (LKC) er et komplett system for administrasjon av catering-virksomhet. Systemet håndterer:

- Oppskrifter og kalkyler
- Bestillinger og ordrehåndtering
- Produkter og lagerstyring
- Kunder og kundegrupper
- Menyer og perioder
- Rapporter og analyser
- Etikett-utskrift

---

## Hovedmeny

Hovedmenyen vises øverst på skjermen og gir tilgang til:

| Meny | Beskrivelse |
|------|-------------|
| **Dashboard** | Oversikt og statistikk |
| **Oppskrifter** | Administrer oppskrifter og kalkyler |
| **Bestillinger** | Håndter ordrer og leveranser |
| **Produkter** | Produktkatalog og GTIN-koder |
| **Ansatte** | Personaladministrasjon |
| **Rapporter** | Analyser og utskrifter |
| **Innstillinger** | Systemkonfigurasjon |

---

## Dashboard

**Sti:** `/`

Dashboard viser en oversikt over dagens aktivitet:

### Funksjoner
- **Dagens ordrer** - Antall bestillinger som skal leveres i dag
- **Ukens statistikk** - Graf over ordrer og omsetning
- **Varsler** - Viktige meldinger og påminnelser
- **Hurtiglenker** - Snarveier til vanlige oppgaver

### Backend-status
Øverst til høyre vises en indikator for systemstatus:
- 🟢 Grønn: Alt fungerer normalt
- 🟡 Gul: Advarsel
- 🔴 Rød: Problem med tilkobling

---

## Oppskrifter

### Oppskriftsliste
**Sti:** `/recipes`

Viser alle oppskrifter i systemet.

#### Funksjoner
- **Søk** - Finn oppskrifter etter navn
- **Filtrer** - Vis kun aktive/inaktive
- **Sorter** - Etter navn, dato eller kostnad
- **Ny oppskrift** - Opprett ny oppskrift

#### Handlinger per oppskrift
- **Rediger** - Endre oppskriftens innhold
- **Dupliser** - Lag en kopi
- **Slett** - Fjern oppskriften

### Oppskriftsdetaljer
**Sti:** `/recipes/[id]`

Detaljert visning og redigering av en oppskrift.

#### Innhold
- **Grunndata** - Navn, beskrivelse, kategori
- **Ingredienser** - Liste over produkter med mengder
- **Næringsinnhold** - Automatisk beregnet fra ingredienser
- **Kostnadskalkyle** - Totalkostnad basert på produktpriser
- **Tilberedning** - Fremgangsmåte

#### Nye funksjoner (v2.7.0)
- **Kalkulering** - Beregn mengder for et spesifikt antall porsjoner
  - Skriv inn ønsket antall porsjoner
  - Klikk "Kalkuler" for å beregne alle ingrediensmengder
  - Systemet oppdaterer automatisk totalmengder og priser
  - Enhetskonvertering håndteres automatisk

- **PDF-rapport** - Last ned detaljert produksjonsrapport
  - Klikk "Last ned rapport (PDF)" for å generere rapport
  - Valgfritt: Kalkuler for et bestemt antall porsjoner først
  - Rapporten inneholder:
    - Oppskriftsdetaljer (navn, porsjoner, datoer)
    - Ingrediensliste sortert etter Lager-ID
    - Mengder og enheter
    - Tilleggsinformasjon (bruk, merknader)
  - Perfekt for bruk i produksjonen eller vareinntak

### Kalkyler
**Sti:** `/kalkyler`

Oversikt over alle kalkyler (oppskrifter med priskalkyle).

#### Funksjoner
- **Se kalkyle** - Vis detaljert kostnadsoversikt
- **Kalkuler mengder** - Automatisk beregning for ønsket antall porsjoner (NYT i v2.7.0)
  - Beregner totalmengder for alle ingredienser
  - Konverterer enheter automatisk (gram til kilogram, etc.)
  - Oppdaterer priser basert på nye mengder
- **Last ned rapport (PDF)** - Generer produksjonsrapport (NYT i v2.7.0)
  - Detaljert PDF med ingrediensliste sortert etter Lager-ID
  - Inkluderer alle mengder, enheter og tilleggsinformasjon
  - Kan kalkuleres for et bestemt antall porsjoner før generering

---

## Bestillinger

### Ordreliste
**Sti:** `/orders`

Oversikt over alle bestillinger.

#### Funksjoner
- **Filtrer etter status** - Ny, Under behandling, Klar, Levert
- **Filtrer etter dato** - Velg datoperiode
- **Søk** - Finn ordre etter kunde eller ordrenummer
- **Ny ordre** - Opprett manuell bestilling

#### Ordrestatus
| Status | Beskrivelse |
|--------|-------------|
| **Ny** | Ordre mottatt, ikke behandlet |
| **Under behandling** | Ordre er under produksjon |
| **Klar** | Ordre er ferdig produsert |
| **Levert** | Ordre er levert til kunde |
| **Kansellert** | Ordre er avbrutt |

### Ordredetaljer
**Sti:** `/orders/[id]`

Detaljert visning av en enkelt ordre.

#### Innhold
- **Kundeinformasjon** - Navn, adresse, kontaktperson
- **Ordrelinjer** - Produkter med antall og pris
- **Leveringsinformasjon** - Dato, tid, adresse
- **Kommentarer** - Spesielle ønsker fra kunde
- **Historikk** - Logg over endringer

#### Handlinger
- **Rediger** - Endre ordredetaljer
- **Endre status** - Oppdater ordrestatus
- **Skriv ut** - Skriv ut plukkliste eller følgeseddel
- **Kanseller** - Avbryt ordren

### Plukking
**Sti:** `/plukking`

Plukkliste for ordrer som skal klargjøres.

#### Funksjoner
- **Filtrer etter kundegruppe** - Vis kun spesifikke grupper
- **Filtrer etter dato** - Velg leveringsdato
- **Registrer plukking** - Merk produkter som plukket
- **Skriv ut plukkliste** - Generer utskrift

### Bestillingsskjema
**Sti:** `/bestilling/skjema`

Generer og skriv ut bestillingsskjemaer.

#### Funksjoner
- **Velg periode** - Hvilken menyperiode
- **Velg kundegruppe** - Hvilke kunder
- **Generer PDF** - Lag utskriftsvennlig dokument
- **Send til printer** - Direkte utskrift

---

## Produkter

### Produktliste
**Sti:** `/produkter`

Oversikt over alle produkter i katalogen.

#### Funksjoner
- **Søk** - Finn produkter etter navn, EAN eller leverandørnummer
- **Filtrer** - Med/uten GTIN, kategori, leverandør
- **GTIN-status** - Se hvilke produkter som mangler strekkode
- **Ny produkt** - Legg til nytt produkt

#### Statistikk
- Totalt antall produkter
- Produkter med GTIN
- Produkter uten GTIN
- Prosent komplett

### Produktdetaljer
**Sti:** `/produkter/[id]`

Rediger produktinformasjon.

#### Felter
- **Produktnavn** - Navn som vises i systemet
- **EAN/GTIN** - Strekkode
- **Leverandørnummer** - Leverandørens produktkode
- **Kategori** - Produktkategori
- **Pris** - Innkjøpspris
- **MVA** - Momssats
- **Leverandør** - Tilknyttet leverandør

### GTIN/EAN-administrasjon
**Sti:** `/products/ean-management`

Verktøy for å finne og koble GTIN-koder.

#### Funksjoner
- **Automatisk søk** - Søk i Matinfo og VetDuAt
- **Manuell kobling** - Koble produkt til GTIN
- **Bulk-oppdatering** - Oppdater mange produkter samtidig
- **Eksporter manglende** - Last ned liste over produkter uten GTIN

### Matinfo-søk
**Sti:** `/matinfo`

Søk i Matinfo-databasen for produktinformasjon.

#### Funksjoner
- **Søk etter navn** - Finn produkter
- **Se næringsinnhold** - Detaljert næringsinformasjon
- **Koble til produkt** - Link Matinfo-data til eget produkt

---

## Kunder

### Kundeliste
**Sti:** `/customers`

Oversikt over alle kunder.

#### Funksjoner
- **Søk** - Finn kunder etter navn eller adresse
- **Filtrer** - Aktive/inaktive kunder
- **Sorter** - Etter navn eller kundenummer
- **Eksporter** - Last ned kundeliste til Excel
- **Ny kunde** - Opprett ny kunde

#### Kolonner
- Kundenavn
- Avdeling
- Adresse
- Kontaktinformasjon
- Status (aktiv/inaktiv)

### Kundedetaljer
**Sti:** `/customers/[id]`

Detaljert kundeinformasjon med faner.

#### Faner
1. **Grunndata** - Navn, adresse, kontakt
2. **Bestillinger** - Kundens ordrehistorikk
3. **Leveringsadresser** - Alternative leveringssteder
4. **Innstillinger** - Kundesspesifikke preferanser

### Kundegrupper
**Sti:** `/kundegrupper`

Administrer kundegrupper (f.eks. barnehager, skoler).

#### Funksjoner
- **Opprett gruppe** - Lag ny kundegruppe
- **Rediger** - Endre gruppenavn og innstillinger
- **Se kunder** - Vis kunder i gruppen
- **Slett** - Fjern tom gruppe

---

## Ansatte

### Ansattliste
**Sti:** `/employees`

Oversikt over alle ansatte.

#### Funksjoner
- **Søk** - Finn ansatte etter navn
- **Filtrer** - Aktive/inaktive
- **Ny ansatt** - Legg til ny ansatt

### Ansattdetaljer
**Sti:** `/employees/[id]`

Rediger ansattinformasjon.

#### Felter
- Fornavn og etternavn
- E-post
- Telefon
- Stilling
- Avdeling
- Startdato
- Status (aktiv/inaktiv)

---

## Menyer

### Menyoversikt
**Sti:** `/menus`

Hovedside for menyadministrasjon.

#### Hurtiglenker
| Funksjon | Beskrivelse |
|----------|-------------|
| **Ukentlig menyplan** | Generer 4-ukers bestillingsskjema |
| **Registrer bestilling** | Registrer ordrer fra utfylte skjemaer |
| **Menymaler** | Administrer gjenbrukbare maler |
| **Periode-administrasjon** | Sett opp perioder og tilordne menyer |

### Menyliste
Tabelloversikt over alle menyer med søk og paginering.

### Ukentlig menyplan
**Sti:** `/menus/weekly-plan`

Generer bestillingsskjema for kunder.

#### Funksjoner
- **Velg kunde** - Søkbar dropdown med alle kunder
- **Velg periode** - Aktiv menyperiode
- **Generer skjema** - Lag PDF med 4 ukers meny
- **Skriv ut** - Send direkte til printer

### Menymaler
**Sti:** `/menus/templates`

Opprett og administrer gjenbrukbare menymaler.

#### Funksjoner
- **Ny mal** - Opprett tom menymal
- **Rediger** - Legg til/fjern produkter
- **Dupliser** - Kopier eksisterende mal
- **Slett** - Fjern mal

### Periode-administrasjon
**Sti:** `/menus/management`

Sett opp menyperioder.

#### Funksjoner
- **Opprett periode** - Definer start- og sluttdato
- **Tilordne menyer** - Koble menymaler til perioder
- **Aktiver periode** - Gjør periode tilgjengelig for bestilling

### Perioder
**Sti:** `/perioder`

Oversikt over alle menyperioder.

#### Visning
- Periodenavn
- Start- og sluttdato
- Antall menyer
- Status (aktiv/inaktiv)

---

## Rapporter

### Rapportoversikt
**Sti:** `/reports`

Tilgjengelige rapporter og analyser.

### Tilgjengelige rapporter

#### Salgsrapporter
- **Daglig salg** - Omsetning per dag
- **Ukentlig salg** - Ukessammendrag
- **Månedlig salg** - Månedsoversikt
- **Produktsalg** - Mest solgte produkter

#### Kunderapporter
- **Kundeliste** - Eksporter alle kunder
- **Kundeomsetning** - Salg per kunde
- **Kundegruppe-rapport** - Salg per gruppe

#### Produksjonsrapporter
- **Plukkliste** - Varer som skal plukkes
- **Produksjonsplan** - Hva som skal lages

### AI-rapportgenerator
**Sti:** `/reports/ai-generator`

Generer innsiktsrapporter med kunstig intelligens.

#### Funksjoner
- **Velg periode** - Tidsrom for analyse
- **Velg rapporttype** - Salg, kunder, produkter
- **Generer rapport** - AI analyserer data og lager rapport
- **Eksporter** - Last ned som PDF eller HTML

### Periode-menyrapport
**Sti:** `/reports/period-menu`

Rapport over menyer og produkter per periode.

---

## Etiketter

### Etikettoversikt
**Sti:** `/labels`

Administrer etikettmaler.

#### Funksjoner
- **Se alle maler** - Liste over etikettdesign
- **Ny mal** - Opprett ny etikettmal
- **Rediger** - Endre eksisterende design
- **Dupliser** - Kopier mal

### Etikettdesigner
**Sti:** `/labels/[id]`

Visuell designer for etiketter.

#### Verktøy
- **Tekst** - Legg til tekstfelter
- **Strekkode** - QR-kode, EAN-13, Code128
- **Bilder** - Last opp logo eller bilder
- **Former** - Linjer og rektangler
- **Variabler** - Dynamisk innhold (produktnavn, dato, etc.)

#### Størrelser
- 100x50mm (standard)
- 57x32mm (liten)
- Egendefinert størrelse

### Etikettutskrift
**Sti:** `/labels/[id]/print`

Skriv ut etiketter.

#### Funksjoner
- **Velg produkt** - Hvilket produkt skal skrives ut
- **Antall** - Hvor mange etiketter
- **Forhåndsvisning** - Se hvordan etiketten blir
- **Skriv ut** - Send til Zebra-printer

---

## Administrasjon

### Brukeradministrasjon
**Sti:** `/admin/users`

Administrer systembrukere.

#### Funksjoner
- **Se brukere** - Liste over alle brukere
- **Ny bruker** - Opprett brukerkonto
- **Rediger** - Endre brukerinfo og rolle
- **Deaktiver** - Sperre brukertilgang
- **Aktiver** - Gjenåpne tilgang

#### Roller
| Rolle | Tilgang |
|-------|---------|
| **Admin** | Full tilgang til alt |
| **Bruker** | Begrenset tilgang |

### Produktmatching (Varebok)
**Sti:** `/admin/varebok`

Match produkter med leverandørdata.

#### Funksjoner
- **Last opp leverandørfil** - CSV fra leverandør
- **Se matchforslag** - AI-foreslåtte koblinger
- **Godkjenn match** - Koble produkt til leverandørdata
- **Filtrer etter status** - Eksakt match, delvis match, ingen match

#### Status-kort
Klikk på status-kortene for å filtrere listen:
- **Alle produkter** - Vis alle
- **Eksakt match** - Produkter med perfekt match
- **Delvis match** - Mulige matcher
- **Ingen match** - Produkter uten match

### Tilberedningsinstruksjoner
**Sti:** `/settings/preparation-instructions`

Administrer forhåndsdefinerte instruksjoner for etiketter.

#### Funksjoner
- **Se instruksjoner** - Liste over alle
- **Ny instruksjon** - Opprett ny
- **Forbedre med AI** - La AI forbedre teksten
- **Aktiver/deaktiver** - Slå instruksjon av/på

### Webshop-administrasjon

#### Godkjenning
**Sti:** `/admin/webshop-godkjenning`

Godkjenn nye webshop-bestillinger.

#### Plukkliste
**Sti:** `/admin/webshop-plukkliste`

Generer plukklister for webshop-ordrer.

#### Plukking
**Sti:** `/admin/webshop-plukking`

Registrer plukking av webshop-ordrer.

#### Pakkliste
**Sti:** `/admin/webshop-pakkliste`

Pakklister for ferdigplukkede ordrer.

#### Fakturering
**Sti:** `/admin/webshop-fakturering`

Fakturering av webshop-ordrer.

#### Regnskap
**Sti:** `/admin/webshop-regnskap`

Regnskapsoversikt for webshop.

#### Kansellering
**Sti:** `/admin/webshop-kansellering`

Kanseller webshop-ordrer.

### Systemlogg
**Sti:** `/admin/activity-log`

Se aktivitetslogg for systemet.

#### Innhold
- Hvem gjorde hva
- Tidspunkt
- Type handling
- Berørte data

### Applikasjonslogg
**Sti:** `/admin/app-log`

Teknisk logg for feilsøking.

### Systemstatus
**Sti:** `/admin/system`

Teknisk informasjon om systemet.

#### Visning
- Backend-status
- Database-tilkobling
- Redis-status
- API-responstider

### Dokumentasjon
**Sti:** `/admin/documentation`

Systemdokumentasjon og API-referanse.

---

## Innstillinger

### Hovedinnstillinger
**Sti:** `/settings`

Systemkonfigurasjon med faner.

#### Bedrift
- Bedriftsnavn
- Organisasjonsnummer
- Adresse
- Kontaktinformasjon

#### E-post
- SMTP-server konfigurasjon
- E-postvarsler
- Automatiske rapporter

#### Varsler
- Nye ordrer
- Lave lagernivåer
- Leveringsforsinkelser
- Systemoppdateringer

#### System
- Språk
- Tidssone
- Valuta
- Datoformat
- Printer-innstillinger

#### Sikkerhet
- To-faktor autentisering
- Passordpolicy
- IP-begrensning
- Øktvarighet

### Skriverinnstillinger
**Sti:** `/settings/printers`

Administrer Zebra-printere.

#### Funksjoner
- **Legg til printer** - Koble til ny printer
- **Test utskrift** - Verifiser tilkobling
- **Sett standard** - Velg hovedprinter
- **Fjern printer** - Koble fra printer

---

## Tastatursnarveier

| Snarvei | Funksjon |
|---------|----------|
| `Ctrl + K` | Åpne hurtigsøk |
| `Ctrl + N` | Ny (kontekstavhengig) |
| `Ctrl + S` | Lagre |
| `Escape` | Lukk dialog |

---

## Feilsøking

### Vanlige problemer

#### "Kan ikke koble til backend"
1. Sjekk at backend-serveren kjører
2. Verifiser nettverkstilkobling
3. Se statusindikator øverst til høyre

#### "Printer ikke funnet"
1. Sjekk at Zebra Browser Print er installert
2. Verifiser at printer er slått på
3. Gå til Innstillinger → Skrivere → Test utskrift

#### "Data lagres ikke"
1. Sjekk internettforbindelse
2. Prøv å laste siden på nytt
3. Kontakt administrator hvis problemet vedvarer

---

## Kontakt support

Ved spørsmål eller problemer, kontakt:

- **E-post:** support@larvik.kommune.no
- **Telefon:** 33 12 34 56
- **Åpningstider:** Man-Fre 08:00-16:00
