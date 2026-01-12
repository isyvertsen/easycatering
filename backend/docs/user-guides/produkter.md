# Produkter - Brukerdokumentasjon

Produktmodulen lar deg administrere produktkatalogen, inkludert råvarer, halvfabrikata og ferdige produkter.

## Oversikt

Produktsystemet i LKC håndterer:
- Produktkatalog med priser og enheter
- Integrasjon med Matinfo.no for næringsverdier
- EAN/strekkode-registrering
- Produktkategorisering
- Allergener og næringsinformasjon
- Leverandørinformasjon
- Lagerintegrasjon (hvis aktivert)

## Viktige konsepter

### Produkttyper

| Type | Beskrivelse | Eksempel |
|------|-------------|----------|
| **Råvare** | Grunnleggende ingrediens | Mel, egg, melk |
| **Halvfabrikata** | Delvis bearbeidet | Ferdigstekt kylling, ferdiglaget saus |
| **Ferdigprodukt** | Klart for salg | Ferdige retter, bakevarer |

### Matinfo-integrasjon

**Matinfo.no** er en norsk database med næringsverdier for >1000 matvarer.

- LKC kan søke i Matinfo
- Importere næringsverdier automatisk
- Hold dataene oppdatert med synkronisering

### EAN-koder

EAN (European Article Number) er strekkoden på produktet.
- 13 siffer (vanligst)
- 8 siffer (mindre produkter)
- Brukes for:
  - Rask produktsøk
  - Automatisk identifikasjon
  - Kobling til Matinfo

## Legge til nytt produkt

### Metode 1: Manuell opprettelse

1. **Naviger til Produkter**
   - Klikk på **Produkter** i venstre meny

2. **Start nytt produkt**
   - Klikk **"Nytt produkt"**-knappen

3. **Fyll inn grunnleggende informasjon**

   | Felt | Beskrivelse | Påkrevd |
   |------|-------------|---------|
   | **Produktnummer** | Internt nummer (kan genereres automatisk) | Nei |
   | **Produktnavn** | Beskrivende navn | Ja |
   | **EAN-kode** | Strekkode (13 siffer) | Nei |
   | **Kategori** | Velg produktkategori | Ja |
   | **Enhet** | g, kg, l, dl, stk, etc. | Ja |
   | **Pris** | Innkjøpspris per enhet | Nei |
   | **Salgspris** | Salgspris (hvis relevant) | Nei |

4. **Leverandørinformasjon** (valgfritt)

   - **Leverandør**: Velg fra leverandørliste eller opprett ny
   - **Leverandørens produktnummer**: Leverandørens artikkelnr
   - **Innkjøpsenhet**: Kolli, kartong, kg, etc.
   - **Kollistørrelse**: Antall enheter per kolli
   - **Minimumbestilling**: Minste bestillingsantall

5. **Næringsverdier** (valgfritt - kan importeres fra Matinfo)

   Per 100g/100ml:
   - Energi (kJ og kcal)
   - Fett (g)
   - Mettet fett (g)
   - Karbohydrater (g)
   - Sukkerarter (g)
   - Kostfiber (g)
   - Protein (g)
   - Salt (g)

6. **Allergener**

   Huk av for allergener produktet inneholder:
   - ☐ Gluten
   - ☐ Laktose
   - ☐ Egg
   - ☐ Fisk
   - ☐ Skalldyr
   - ☐ Nøtter
   - ☐ Peanøtter
   - ☐ Soya
   - ☐ Selleri
   - ☐ Sennep
   - ☐ Sesamfrø
   - ☐ Sulfitt
   - ☐ Lupin
   - ☐ Bløtdyr

7. **Tilleggsinformasjon**

   - **Beskrivelse**: Fritekst beskrivelse
   - **Oppbevaring**: Kjøleskap, frys, tørrvare, etc.
   - **Holdbarhet**: Dager/måneder
   - **Bilde**: Last opp produktbilde

8. **Lagre produktet**
   - Klikk **"Lagre"**
   - Produktet er nå tilgjengelig i katalogen

### Metode 2: Import fra Matinfo

**Raskere metode for kjente matvarer**

1. **Gå til Matinfo-søk**
   - Klikk **Produkter** > **"Søk i Matinfo"**

2. **Søk etter produkt**
   - Skriv produktnavn i søkefeltet
   - Eksempler: "melk", "hvetemel", "kyllingbryst"
   - Trykk Enter eller klikk søk

3. **Velg produkt fra resultater**
   - Liste med treff vises
   - Klikk på riktig produkt
   - Produktinformasjon vises

4. **Forhåndsvis data**
   - Se næringsverdier
   - Se allergener
   - Se produktnavn og beskrivelse

5. **Importer til katalog**
   - Klikk **"Importer produkt"**
   - Produktet opprettes med all Matinfo-data
   - Du kan redigere pris og leverandør etterpå

6. **Tilpass produktet** (valgfritt)
   - Åpne produktet for redigering
   - Legg til pris og leverandørinformasjon
   - Lagre

**Tips**: Matinfo har flest norske og internasjonale merkevarer. For egenproduserte produkter, opprett manuelt.

## Redigere produkt

1. Gå til **Produkter**
2. Finn produktet:
   - Søk i søkefeltet
   - Eller bla gjennom kategorier
3. Klikk på produktnavnet eller rediger-ikonet
4. Gjør endringer
5. Klikk **"Lagre"**

**Viktig**: Endringer i næringsverdier påvirker oppskrifter som bruker produktet.

## Søke etter produkter

### Vanlig søk
- Skriv produktnavn i søkefeltet
- Søker i: navn, produktnummer, EAN-kode

### Fuzzy søk
Systemet bruker "fuzzy matching" som finner produkter selv med skrivefeil:
- "melc" finner "melk"
- "kylling bry" finner "kyllingbryst"

### Strekkode-søk
1. Klikk på strekkode-ikonet i søkefeltet
2. Scan strekkoden med skanner
3. Produktet vises automatisk

### Avansert søk

Klikk **"Avansert søk"** for flere alternativer:

- **Kategori**: Filtrer på kategori
- **Leverandør**: Produkter fra spesifikk leverandør
- **Allergener**: Produkter UTEN valgte allergener
- **Prisområde**: Fra-til pris
- **Lagerstatus**: På lager, lite lager, utsolgt

## Produktkategorier

### Standard kategorier

- **Meieri**: Melk, ost, yoghurt, smør
- **Kjøtt**: Kjøtt, pølser, bacon
- **Fisk**: Fisk, skalldyr
- **Frukt og grønt**: Frukt, grønnsaker, salat
- **Brød og bakervarer**: Brød, kavring, kaker
- **Tørrvarer**: Mel, sukker, pasta, ris
- **Krydder**: Krydder, urter
- **Drikke**: Drikke, juice, melk
- **Diverse**: Alt annet

### Opprette ny kategori

1. Gå til **Produkter** > **Kategorier**
2. Klikk **"Ny kategori"**
3. Fyll inn:
   - Kategorinavn
   - Beskrivelse
   - Overordnet kategori (hvis underkategori)
4. Klikk **"Lagre"**

### Flytte produkter mellom kategorier

**Enkeltvis**:
1. Åpne produktet
2. Velg ny kategori
3. Lagre

**Flere samtidig**:
1. Huk av for produkter i listen
2. Klikk **"Handlinger"** > **"Endre kategori"**
3. Velg ny kategori
4. Klikk **"Oppdater"**

## Matinfo-synkronisering

Holder Matinfo-data oppdatert.

### Manuell synkronisering

1. Gå til **Produkter** > **"Matinfo-synkronisering"**
2. Klikk **"Synkroniser nå"**
3. Systemet oppdaterer:
   - Næringsverdier
   - Allergener
   - Produktnavn (hvis du vil)
4. Du får en rapport over endringer

### Automatisk synkronisering

Kan konfigureres til å kjøre automatisk:
- Daglig
- Ukentlig
- Månedlig

Gå til **Innstillinger** > **Integrasjoner** > **Matinfo** for å sette opp.

### Etter synkronisering

- **Grønne**: Oppdatert uten problemer
- **Gule**: Oppdatert med advarsler (f.eks. stor prisendring)
- **Røde**: Feil (f.eks. produkt finnes ikke lenger i Matinfo)

Gjennomgå gule og røde manuelt.

## Leverandører

### Administrere leverandører

1. Gå til **Produkter** > **Leverandører**
2. Se liste over alle leverandører

### Legge til leverandør

1. Klikk **"Ny leverandør"**
2. Fyll inn:
   - Leverandørnavn
   - Kontaktinformasjon
   - Betalingsbetingelser
   - Leveringstid
3. Klikk **"Lagre"**

### Koble produkt til leverandør

1. Åpne produktet
2. Velg leverandør fra dropdown
3. Legg til leverandørens produktnummer
4. Lagre

## Priser og kostnadsstyring

### Innkjøpspriser

Registrer innkjøpspriser for å:
- Beregne oppskriftskostnader
- Analysere lønnsomhet
- Sammenligne leverandører

### Salgspriser

Sett salgspriser for produkter som selges direkte.

**Priskalkulator**:
1. Åpne produktet
2. Klikk **"Beregn salgspris"**
3. Systemet foreslår pris basert på:
   - Innkjøpspris
   - Påslagsprosent (standard: 30-50%)
   - Konkurrentpriser
4. Juster og lagre

### Prishistorikk

Se prisutvikling over tid:
1. Åpne produktet
2. Gå til fanen **"Prishistorikk"**
3. Se graf og tabell over prisendringer

## Allergener og næringsinformasjon

### Allergenhåndtering

**Viktig**: Nøyaktig allergeninformasjon er kritisk!

**Best practices**:
- Alltid dobbeltsjekk allergener
- Oppdater når leverandør endrer produkt
- Marker usikre produkter tydelig
- Hold dokumentasjon oppdatert

### Næringsinformasjon

Næringsverdier brukes til:
- Automatisk beregning i oppskrifter
- Etiketter med næringsdeklarasjon
- Ernæringsanalyse av menyer
- Rapportering til kunder

**Tips**: Hvis Matinfo ikke har produktet, bruk leverandørens produktinformasjon eller lignende produkter som referanse.

## Lager (hvis aktivert)

### Lagerstatus

Hvis lagerstyring er aktivert, ser du:
- **På lager**: Antall enheter på lager
- **Reservert**: Antall reservert til ordrer
- **Tilgjengelig**: På lager minus reservert
- **Bestilt**: Antall på vei fra leverandør

### Lagervarsel

Sett minimumsgrenser:
1. Åpne produktet
2. Sett **"Minimum lagernivå"**
3. Få e-post når beholdningen går under

### Lagerjustering

1. Åpne produktet
2. Klikk **"Juster lager"**
3. Velg type:
   - Innkjøp (øker beholdning)
   - Svinn (reduserer beholdning)
   - Korreksjon (justerer til riktig tall)
4. Angi mengde og grunn
5. Lagre

## Import og eksport

### Importere produkter fra Excel

1. Gå til **Produkter** > **"Import"**
2. Last ned Excel-mal
3. Fyll inn produktdata i malen
4. Last opp filen
5. Forhåndsvis import
6. Klikk **"Importer"**

**Excel-mal inneholder**:
- Produktnavn
- EAN-kode
- Kategori
- Pris
- Enhet
- Næringsverdier
- Allergener

### Eksportere produkter

1. Gå til **Produkter**
2. Sett filter om nødvendig
3. Klikk **"Eksporter"**
4. Velg format:
   - Excel (.xlsx)
   - CSV
   - PDF
5. Last ned fil

## Produktrapporter

Under **Rapporter** > **Produkter** finner du:

### Mest brukte produkter
- Hvilke produkter brukes oftest i oppskrifter
- Hvilke produkter selges mest
- Periode: måned, kvartal, år

### Prisutvikling
- Hvordan priser har utviklet seg
- Sammenligning med forrige periode
- Grafisk fremstilling

### Leverandøranalyse
- Kjøp per leverandør
- Sammenligning av priser
- Leverandørrating

## Best practices

### Produktopprettelse
- **Konsistent navngivning**: Bruk samme format (f.eks. "Melk, lettmelk, 1L")
- **Alltid legg til EAN**: Gjør søk og identifikasjon enklere
- **Riktig kategori**: Plasser produkter i riktig kategori fra starten

### Datakvalitet
- **Hold data oppdatert**: Sjekk og oppdater jevnlig
- **Verifiser allergener**: Dobbeltsjekk med leverandør
- **Komplett informasjon**: Fyll ut så mye som mulig

### Matinfo-bruk
- **Søk før opprettelse**: Sjekk alltid Matinfo først
- **Synkroniser regelmessig**: Hold data oppdatert
- **Dokumenter avvik**: Noter hvis du endrer Matinfo-data manuelt

## Feilsøking

### Problem: Finner ikke produkt i Matinfo
**Løsning**:
1. Prøv alternative søkeord (f.eks. "melk" i stedet for "lettmelk")
2. Søk på merkevare (f.eks. "Tine lettmelk")
3. Hvis fortsatt ikke funnet, opprett manuelt

### Problem: Næringsverdier stemmer ikke
**Løsning**:
1. Sjekk at produktet er riktig koblet til Matinfo
2. Synkroniser data på nytt
3. Sammenlign med leverandørens informasjon
4. Korriger manuelt om nødvendig

### Problem: Kan ikke slette produkt
**Løsning**: Produktet er sannsynligvis i bruk i oppskrifter eller ordrer. Marker som inaktivt i stedet.

### Problem: Duplikate produkter
**Løsning**:
1. Identifiser riktig produkt
2. Oppdater oppskrifter til å bruke riktig produkt
3. Slett duplikat (eller marker som inaktiv)

## Tips og triks

1. **Hurtigsøk**: Bruk Ctrl/Cmd + K for global produktsøk
2. **Strekkode-skanning**: Invester i USB-strekkode-skanner for rask produktregistrering
3. **Favoritter**: Marker ofte brukte produkter som favoritter
4. **Produktmaler**: Lag maler for produkttyper du ofte legger til
5. **Batch-oppdatering**: Oppdater flere produkter samtidig med Excel-import

---

**Neste steg**: Lær hvordan du designer og skriver ut [etiketter](./etiketter.md) for produkter og oppskrifter
