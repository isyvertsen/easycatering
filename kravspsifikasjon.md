# Kravspesifikasjon - Larvik Kommunale Catering (LKC)

## Prosjektoversikt

Larvik kommunale catering (LKC) ønsker nytt datastyringsverktøy for matproduksjon med web-shop, pluss fakturering via kommunens regnskapsprogram Agresso.

### Nøkkeltall
- **Antall lokasjoner**: ca. 40
- **Årlig produksjon**: ca. 290.000 middager
- **Produktsortiment**: Fullt daglig varesortiment
- **Brukere**: Stort antall brukere (ikke faste personer)

---

## 1. Oppskrifter og Næringsberegning

### Krav
- **Oppskriftshåndtering** med automatisk næringsberegning
- **Gruppering av kosttyper**:
  - Normalkost
  - Ulike dietter basert på bestillinger
  - Individuelle menyer for:
    - Etnisitet
    - Allergier
    - Personlige preferanser (f.eks. liker ikke fisk)
    - Formkost

### Funksjonalitet
- Resepter summert på de ulike menyer
- Næringsberegning per porsjon og totalt
- Kobling til vareregister for automatisk oppdatering av næringsinnhold

### Etiketter
- LKC må kunne lage egne etiketter etter behov
- Nye layouter og størrelser uten ekstra kostnader
- Kompatibilitet med ZEBRA ZT510 printer

---

## 2. Vare- og Lagerstyring

### Lagerbeholdning
- Sanntidsoversikt over lagerstatus
- Automatisk varsel ved lavt lager
- Sporingsnummer og batch-håndtering
- Registrering av svinn

### Innkjøp
- **Automatisk innkjøpsberegning** basert på:
  - Inngående bestillinger
  - Lagerbeholdning
  - Produksjonsplan
  - Historiske data

### Import/Export
- **Import av prislister** fra eksterne leverandører med:
  - Næringsinnhold
  - Allergener
  - Varemerking
  - EAN-koder
- **Export av bestillingslister** til leverandører
- **Integrasjon med Matinfo.no** for næringsdata (EAN-kobling)

### Database-struktur
```
matinfo_products    → READ-ONLY lookup (næringsdata)
tblprodukter       → Hovedproduktregister
Kobling via: ean_kode
```

---

## 3. Menyplanlegging og Merking

### Funksjonalitet
- Planlegg menyer med full oversikt over næringsinnhold
- Lage tilpassede menyer for:
  - Spesielle kostholdsbehov
  - Allergiutelukkelse
  - Ulike kundegrupper
- Prisberegning av:
  - Enkeltoppskrifter
  - Komplette menyplaner
- Automatisk kostberegning basert på leverandørpriser

### Rapportering
- Næringsrapporter per meny
- Kostanalyse per rett og meny
- Allergenoversikt
- Eksport til PDF/utskrift

---

## 4. Webshop / Bestillingsportal

### Brukeropplevelse
- **Web-basert løsning** (app foretrukket)
- Responsiv design for mobil/tablet/desktop
- Flere samtidige brukere

### Pålogging og Tilgang
- Registrering via **kundenummer**
- Ingen faste brukerkontoer nødvendig
- Ulike tilgangsnivåer for ulike kunder
- Rollebasert tilgangskontroll

### Bestillingsfunksjonalitet
- Se tilgjengelige produkter
- Bestille produkter
- Redigere varelinjer før bekreftelse
- Se bestillingshistorikk
- Se ordrestatus
- Duplisere tidligere ordre

### Produkthåndtering
- Vise utsolgte/ikke tilgjengelige produkter
- Produktsøk og filtrering
- Kategorisering av produkter

### Bekreftelser
- Automatisk bekreftelse på mottatt bestilling
- Bekreftelse sendes til person som utførte bestillingen
- E-post og/eller SMS-varsling

---

## 5. Fakturering og Regnskap

### Integrasjon
- **Må integreres med Agresso** (kommunens regnskapssystem)
- Automatisk eksport av fakturagrunnlag
- Synkronisering av kunde- og produktdata

### Rapporter
- **Regnskapsrapporter**:
  - Salg per periode
  - Salg per kundegruppe
  - Salg per produkt
- **Salgsrapporter**:
  - Daglig/ukentlig/månedlig
  - Per lokasjon
  - Per kundegruppe
- **Økonomiske nøkkeltall**:
  - Omsetning
  - Dekningsgrad
  - Svinn

---

## 6. Bestillinger fra Eksterne Kunder (Hjemmeboende)

### Menyutskrift
- Enkel menyutskrift på **ukenummer og dato**
- 4 ukers oversikt
- Tydelig visuell presentasjon

### Ordreregistrering
- Registrere **flere ordre på samme kunde** fortløpende per uke
- Kunde- og menyskjema åpent samtidig
- Registrere antall middager direkte i menyplan
- Kunne registrere flere ordre på ulike datoer ved bruk av ukenummer

### Kundehåndtering
- Mulighet for å hente navn og adresse fra annet system
- Kunde-profiler med preferanser
- Leveringsadresser og kontaktinformasjon

---

## 7. Ordre, Levering og Utkjøring

### Dokumenter
- Utskrift av **pakkseddel**
- Utskrift av **ordre**
- Duplisere ordrelinjer til kunde

### Kjørelister
- Lage kjørelister ut fra bestillingsordre
- Sortering etter:
  - Rute
  - Leveringstidspunkt
  - Kunde
- Optimalisering av kjøreruter

### Rapporter
- **Rapport på ulike nivåer**:
  - Per sykehjem
  - Per avdeling
  - Per kundegruppe
- **Antall middager** per kundegruppe på fra-til-dato
- Leveringsstatistikk
- Avviksrapportering

---

## 8. Printer og Etiketter

### Hardware-kompatibilitet
- Må være kompatibel med eksisterende printere
- Spesifikk støtte for **ZEBRA ZT510**

### Etikettfunksjonalitet
- LKC må kunne lage nye etiketter etter behov
- Nye layouter og størrelser
- **Ingen ekstra kostnader** for nye etikettmaler
- Støtte for:
  - QR-koder
  - Strekkoder (EAN)
  - Allergenvarsler
  - Næringsmerking
  - Dato/holdbarhet

---

## 9. Lisenser og Priser

### Lisensmodell
- **Én lisens omfatter**:
  - Alle brukere (ubegrenset)
  - Alle installasjoner
  - All produksjon
  - Alle lokasjoner (ca. 40)

### Priskrav
- Alle kostnader skal være inkludert i pristilbudet
- Kun kostnader angitt i pristilbudet vil kunne faktureres
- Ingen skjulte kostnader eller tilleggspriser

---

## 10. Databehandling og GDPR

### Data som Lagres
Systemet skal håndtere følgende personopplysninger:

#### Kundedata
- Navn og kontaktinformasjon
- Kundenummer
- Leveringsadresse
- Kostpreferanser og allergier
- Bestillingshistorikk

#### Metadata
- Påloggingsdata
- IP-adresser
- Brukerlogger

### Krav til Leverandør
- Utkast til **databehandleravtale** må vedlegges tilbud
- Overholdelse av **GDPR** og norsk personvernlovgivning
- Dokumentasjon av:
  - Sikkerhetsrutiner
  - Backup-rutiner
  - Datalagringslokasjon
  - Slettingsrutiner

### Sikkerhet
- Kryptering av sensitiv data
- Sikker autentisering
- Logging av datatilgang
- Regelmessige sikkerhetsoppdateringer

---

## 11. Implementering og Opplæring

### Implementeringsplan
Leverandør må beskrive:
- Faseinndeling av implementering
- Tidsplan og milepæler
- Datamigrering fra eksisterende systemer
- Testfase og pilotperiode
- Go-live strategi
- Rollback-plan ved kritiske feil

### Opplæringsplan
Leverandør må beskrive:
- Opplæringsopplegg for:
  - Superbrukere
  - Produksjonspersonale
  - Bestillere/kunder
  - IT-administratorer
- Opplæringsmateriell:
  - Brukermanualer (norsk)
  - Video-tutorials
  - Quick-guides
- Support etter go-live

### Testfaser
1. **Utviklertest**: Enhetstester og integrasjonstester
2. **UAT (User Acceptance Testing)**: Testing med LKC-brukere
3. **Pilot**: Begrenset produksjonstest på 1-2 lokasjoner
4. **Full utrulling**: Alle lokasjoner

---

## 12. Tekniske Krav

### System-arkitektur
- Web-basert løsning (tilgjengelig via nettleser)
- Responsiv design
- Support for moderne nettlesere (Chrome, Firefox, Safari, Edge)
- Mobile app (iOS/Android) foretrukket for bestilling

### Integrasjoner
| System | Type | Formål |
|--------|------|---------|
| Agresso | Toveis | Fakturering og regnskap |
| Matinfo.no | Import | Næringsdata (EAN-kobling) |
| Leverandører | Import/Export | Prislister og bestillinger |
| Eksterne kundesystemer | Import | Navn og adressedata |

### Database
- PostgreSQL (foretrukket) eller tilsvarende
- Backup-rutiner
- Høy tilgjengelighet (minimal nedetid)

### Ytelse
- Responstid < 2 sekunder for normale operasjoner
- Support for minst 100 samtidige brukere
- Skalerbarhet for fremtidig vekst

### Sikkerhet
- HTTPS/TLS-kryptering
- Rollebasert tilgangskontroll (RBAC)
- Audit logging
- Regelmessige sikkerhetsoppdateringer

---

## 13. Vedlegg og Referanser

### Påkrevde Vedlegg fra Leverandør
- **Vedlegg 02**: Databehandleravtale (utkast)
- **Vedlegg 04**: Detaljert databeskrivelse
- **Vedlegg 05**: Implementeringsplan

### Relaterte Dokumenter
- `/LKCserver-backend/`: Backend-kode (FastAPI)
- `/LKCserver-frontend/`: Frontend-kode (Next.js)
- `CLAUDE.md`: Teknisk dokumentasjon for utviklere

---

## API-endpoints (Relevante Eksisterende)

Basert på eksisterende system, følgende API-områder må dekkes:

```
/api/v1/kunde-gruppe      → Kundegruppehåndtering
/api/v1/produkter         → Produktkatalog
/api/v1/oppskrifter       → Oppskriftshåndtering
/api/v1/bestillinger      → Bestillingshåndtering
/api/v1/fakturering       → Faktureringssystem
/api/v1/rapporter         → Rapportgenerering
```

---

## Oppsummering av Kritiske Suksessfaktorer

1. **Integrasjon med Agresso** må fungere feilfritt
2. **Enkel brukeropplevelse** for ikke-tekniske brukere
3. **Fleksibel etikettløsning** uten ekstra kostnader
4. **Omfattende lisens** uten begrensninger
5. **GDPR-compliance** og datasikkerhet
6. **God opplæring** og support
7. **Pålitelig drift** med minimal nedetid
8. **Skalerbarhet** for fremtidig vekst (290.000+ middager/år)

---

## Kontakt og Spørsmål

For spørsmål om denne kravspesifikasjonen, kontakt:
- **Organisasjon**: Larvik Kommune
- **Avdeling**: Larvik Kommunale Catering (LKC)

---

*Dokumentet sist oppdatert: 2026-01-07*
