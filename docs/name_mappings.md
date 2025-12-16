# Table and Column Name Mappings


## tblAnsatte → tblansatte

| Original Column | Standardized Column |
|-----------------|--------------------|
| AnsattID | ansattid |
| Fornavn | fornavn |
| Etternavn | etternavn |
| Tittel | tittel |
| Adresse | adresse |
| PostNr | postnr |
| Poststed | poststed |
| TlfPrivat | tlfprivat |
| Avdeling | avdeling |
| Fødselsdato | fodselsdato |
| PersonNr | personnr |
| Sluttet | sluttet |
| Stillings% | stillings |
| Resussnr | resussnr |
| E-postJobb | e_postjobb |
| E-postPrivat | e_postprivat |
| SSMA_TimeStamp | ssma_timestamp |
| WindowsBruker | windowsbruker |
| DefaultPrinter | defaultprinter |

## tblKunder → tblkunder

| Original Column | Standardized Column |
|-----------------|--------------------|
| KundeID | kundeid |
| Kundenavn | kundenavn |
| Avdeling | avdeling |
| KontaktID | kontaktid |
| Telefonnummer | telefonnummer |
| BestillerNr | bestillernr |
| LøpeNr | lopenr |
| Merknad | merknad |
| Adresse | adresse |
| Postboks | postboks |
| PostNR | postnr |
| Sted | sted |
| VelgSone | velgsone |
| Leveringsdag | leveringsdag |
| KundeInaktiv | kundeinaktiv |
| KundeNrAgresso | kundenragresso |
| E-post | e_post |
| Webside | webside |
| KundeGruppe | kundegruppe |
| BestillerSelv | bestillerselv |
| Rute | rute |
| MenyInfo | menyinfo |
| AnsattID | ansattid |
| SjåførPåRute | sjaforparute |
| Diett | diett |
| MenyGruppeID | menygruppeid |
| UtDato | utdato |
| InnDato | inndato |
| Avsluttet | avsluttet |
| EksportKatalog | eksportkatalog |
| SSMA_TimeStamp | ssma_timestamp |
| Mobilnummer | mobilnummer |
| Formkost | formkost |
| SykehjemID | sykehjemid |
| E-post2 | e_post2 |

## tblLeverandører → tblleverandorer

| Original Column | Standardized Column |
|-----------------|--------------------|
| LeverandørID | leverandorid |
| Leverandørnavn | leverandornavn |
| Kontaktperson | kontaktperson |
| Adresse | adresse |
| PostNr | postnr |
| Poststed | poststed |
| Telefonnummer | telefonnummer |
| E-post | e_post |
| Webside | webside |
| Betalingsbetingelser | betalingsbetingelser |
| Leveringsbetingelser | leveringsbetingelser |
| Merknad | merknad |
| Aktiv | aktiv |
| SSMA_TimeStamp | ssma_timestamp |

## tblKategorier → tblkategorier

| Original Column | Standardized Column |
|-----------------|--------------------|
| KategoriID | kategoriid |
| Kategorinavn | kategorinavn |
| Beskrivelse | beskrivelse |
| SSMA_TimeStamp | ssma_timestamp |

## tblProdukter → tblprodukter

| Original Column | Standardized Column |
|-----------------|--------------------|
| ProduktID | produktid |
| Produktnavn | produktnavn |
| LeverandørsProduktNr | leverandorsproduktnr |
| AntallEht | antalleht |
| Pakningstype | pakningstype |
| Pakningsstørrelse | pakningsstorrelse |
| Pris | pris |
| PaknPris | paknpris |
| LevrandørID | levrandorid |
| KategoriID | kategoriid |
| Lagermengde | lagermengde |
| Bestillingsgrense | bestillingsgrense |
| Bestillingsmengde | bestillingsmengde |
| EAN-kode | ean_kode |
| Utgått | utgatt |
| Oppdatert | oppdatert |
| Webshop | webshop |
| MVAVerdi | mvaverdi |
| SSMA_TimeStamp | ssma_timestamp |
| LagerID | lagerid |
| Utregningsfaktor | utregningsfaktor |
| UtregnetPris | utregnetpris |
| Visningsnavn | visningsnavn |
| Visningsnavn2 | visningsnavn2 |
| Allergenprodukt | allergenprodukt |
| EnergiKj | energikj |
| Kalorier | kalorier |
| Fett | fett |
| MettetFett | mettetfett |
| KarboHydrater | karbohydrater |
| Sukkerarter | sukkerarter |
| Kostfiber | kostfiber |
| Protein | protein |
| Salt | salt |
| MonoDisakk | monodisakk |
| MatvareID | matvareid |
| WebshopSted | webshopsted |

## tblOrdrer → tblordrer

| Original Column | Standardized Column |
|-----------------|--------------------|
| OrdreID | ordreid |
| KundeID | kundeid |
| AnsattID | ansattid |
| Kundenavn | kundenavn |
| Ordredato | ordredato |
| Leveringsdato | leveringsdato |
| Fakturadato | fakturadato |
| SendesTil | sendestil |
| Betalingsmåte | betalingsmate |
| LagerOk | lagerok |
| Informasjon | informasjon |
| OrdrestatusID | ordrestatusid |
| FakturaID | fakturaid |
| SSMA_TimeStamp | ssma_timestamp |
| KansellertDato | kansellertdato |
| SentBekreftelse | sentbekreftelse |
| SentRegnskap | sentregnskap |
| OrdreLevert | ordrelevert |
| LevertAgresso | levertagresso |

## tblOrdredetaljer → tblordredetaljer

| Original Column | Standardized Column |
|-----------------|--------------------|
| OrdreID | ordreid |
| ProduktID | produktid |
| LevDato | levdato |
| Pris | pris |
| Antall | antall |
| Rabatt | rabatt |
| SSMA_TimeStamp | ssma_timestamp |
| Ident | ident |
| unik | unik |

## tblBestillinger → tblbestillinger

| Original Column | Standardized Column |
|-----------------|--------------------|
| BestillingsID | bestillingsid |
| LeverandørID | leverandorid |
| Leverandør | leverandor |
| Bestillingsdato | bestillingsdato |
| Ønsketlevering | onsketlevering |
| leveringsdato | leveringsdato |
| AnsattID | ansattid |
| Bestillt | bestillt |
| Lageroppdatering | lageroppdatering |
| Merknad | merknad |
| SSMA_TimeStamp | ssma_timestamp |

## tblBestillingsposter → tblbestillingsposter

| Original Column | Standardized Column |
|-----------------|--------------------|
| BestillingsPosterID | bestillingsposterid |
| BestillingsID | bestillingsid |
| ProduktID | produktid |
| LevarandørsProduktNr | levarandorsproduktnr |
| varenavn | varenavn |
| Pakningsstørrelse | pakningsstorrelse |
| Pris | pris |
| Antall_bestillt | antall_bestillt |
| Sum | sum |
| Mottatt | mottatt |
| oppdatert | oppdatert |
| BestMengde | bestmengde |
| MVA% | mva |
| Levkode | levkode |
| SSMA_TimeStamp | ssma_timestamp |

## tbl_rpKalkyle → tbl_rpkalkyle

| Original Column | Standardized Column |
|-----------------|--------------------|
| Kalkylekode | kalkylekode |
| Kalkylenavn | kalkylenavn |
| AnsattID | ansattid |
| OpprettetDato | opprettetdato |
| RevidertDato | revidertdato |
| Informasjon | informasjon |
| RefPorsjon | refporsjon |
| Kategorikode | kategorikode |
| AntallPorsjoner | antallporsjoner |
| Produksjonsmetode | produksjonsmetode |
| GruppeID | gruppeid |
| Alergi | alergi |
| Leveringsdato | leveringsdato |
| Merknad | merknad |
| BrukesTil | brukestil |
| Enhet | enhet |
| NaeringsInnhold | naeringsinnhold |
| TWPorsjon | twporsjon |

## tbl_rpKalkyledetaljer → tbl_rpkalkyledetaljer

| Original Column | Standardized Column |
|-----------------|--------------------|
| Kalkylekode | kalkylekode |
| ProduktID | produktid |
| Produktnavn | produktnavn |
| LeverandørsProduktNr | leverandorsproduktnr |
| Pris | pris |
| Porsjonsmengde | porsjonsmengde |
| Enh | enh |
| TotMeng | totmeng |
| kostPris | kostpris |
| VisningsEnhet | visningsenhet |
| SvinnProsent | svinnprosent |
| tblKalkyleDetaljerID | tblkalkyledetaljerid |
| EnergiKj | energikj |
| Kalorier | kalorier |
| Fett | fett |
| MettetFett | mettetfett |
| KarboHydrater | karbohydrater |
| Sukkerarter | sukkerarter |
| Kostfiber | kostfiber |
| Protein | protein |
| Salt | salt |
| MonoDisakk | monodisakk |
