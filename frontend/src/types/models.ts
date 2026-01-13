// Recipe Management Types
export interface Recipe {
  id: number  // Alias for kalkylekode to satisfy CrudItem constraint
  kalkylekode: number
  kalkylenavn: string
  ansattid?: number | null
  opprettetdato?: string | null
  revidertdato?: string | null
  informasjon?: string | null
  refporsjon?: string | null
  kategorikode?: string | null
  antallporsjoner?: number | null
  produksjonsmetode?: string | null
  gruppeid?: number | null
  alergi?: string | null
  leveringsdato?: string | null
  merknad?: string | null
  brukestil?: string | null
  enhet?: string | null
  naeringsinnhold?: string | null
  twporsjon?: number | null
  detaljer?: RecipeIngredient[] | null
}

export interface RecipeIngredient {
  tblkalkyledetaljerid: number
  kalkylekode: number
  produktid: number
  produktnavn?: string | null
  leverandorsproduktnr?: string | null
  pris?: number | null
  porsjonsmengde?: number | null
  enh?: string | null
  totmeng?: number | null
  kostpris?: string | null
  visningsenhet?: string | null
  svinnprosent?: string | null
  energikj?: string | null
  kalorier?: string | null
  fett?: string | null
  mettetfett?: string | null
  karbohydrater?: string | null
  sukkerarter?: string | null
  kostfiber?: string | null
  protein?: string | null
  salt?: string | null
}

export interface RecipeGroup {
  gruppeid: number
  gruppenavn?: string
  merknad?: string
}

// Menu Management Types
export interface Menu {
  menyid: number
  beskrivelse?: string
  menygruppe?: number
  gruppe?: MenuGroup
}

export interface MenuGroup {
  gruppeid: number
  beskrivelse?: string
}

// Customer Types
export interface Customer {
  kundeid: number
  kundenavn: string
  avdeling?: string
  kontaktid?: string
  telefonnummer?: string
  bestillernr?: string
  lopenr?: number
  merknad?: string
  adresse?: string
  postboks?: number
  postnr?: string
  sted?: string
  velgsone?: number
  leveringsdag?: number
  kundeinaktiv?: boolean
  kundenragresso?: number
  e_post?: string
  webside?: string
  kundegruppe?: number
  bestillerselv?: boolean
  rute?: number
  menyinfo?: string
  ansattid?: number
  sjaforparute?: number
  diett?: boolean
  menygruppeid?: number
  utdato?: string
  inndato?: string
  avsluttet?: boolean
  eksportkatalog?: string
  mobilnummer?: string
  formkost?: boolean
  sykehjemid?: number
  e_post2?: string
}

// Order Types
export interface Order {
  id: number  // Alias for ordreid to satisfy CrudItem constraint
  ordreid: number
  kundeid: number
  ansattid?: number
  kundenavn?: string
  ordredato?: string
  leveringsdato?: string
  fakturadato?: string
  sendestil?: string
  betalingsmate?: number
  lagerok?: boolean
  informasjon?: string
  ordrestatusid?: number
  fakturaid?: number
  kansellertdato?: string
  sentbekreftelse?: boolean
  sentregnskap?: string
  ordrelevert?: string
  levertagresso?: string
  kundegruppenavn?: string
  // Relations
  kunde?: Customer
  ansatt?: Employee
  ordredetaljer?: OrderLine[]
}

export interface OrderLine {
  ordreid: number
  produktid: number
  unik: number
  levdato?: string
  pris?: number
  antall?: number
  rabatt?: number
  ident?: string
  // Relations
  produkt?: Product
}

// Product Types
export interface Product {
  id: number  // Alias for produktid to satisfy CrudItem constraint
  produktid: number
  produktnavn: string
  leverandorsproduktnr?: string
  antalleht?: number
  pakningstype?: string
  pakningsstorrelse?: string
  pris?: number
  paknpris?: string
  levrandorid?: number
  kategoriid?: number
  lagermengde?: number
  bestillingsgrense?: number
  bestillingsmengde?: number
  ean_kode?: string
  utgatt?: boolean
  oppdatert?: boolean
  webshop?: boolean
  mvaverdi?: number
  lagerid?: number
  utregningsfaktor?: number
  utregnetpris?: number
  visningsnavn?: string
  visningsnavn2?: string
  rett_komponent?: boolean
  // Relations
  kategori?: Category
  leverandor?: Supplier
  // Note: Nutrition data (energikj, kalorier, fett, etc.) is in matinfo_products, not tblprodukter
}

export interface Category {
  id: number
  navn: string
  beskrivelse?: string
  overordnet_kategori_id?: number
}

export interface Supplier {
  id: number
  navn: string
  kontaktperson?: string
  telefon?: string
  e_post?: string
  adresse?: string
  aktiv: boolean
}

// Employee Types
export interface Employee {
  id: number  // Alias for ansattid to satisfy CrudItem constraint
  ansattid: number
  fornavn: string
  etternavn: string
  tittel?: string
  adresse?: string
  postnr?: string
  poststed?: string
  tlfprivat?: string
  avdeling?: string
  fodselsdato?: string
  personnr?: number
  sluttet?: boolean
  stillings_prosent?: number
  resussnr?: number
  e_postjobb?: string
  e_postprivat?: string
  windowsbruker?: string
  defaultprinter?: string
}

// Supplier Types
export interface Leverandor {
  id: number  // Alias for leverandorid to satisfy CrudItem constraint
  leverandorid: number
  leverandornavn: string
  refkundenummer?: string
  adresse?: string
  e_post?: string
  postnummer?: string
  poststed?: string
  telefonnummer?: string
  bestillingsnr?: string
  utgatt?: boolean
  webside?: string
}

// User Types
export interface AnsattInfo {
  ansattid: number
  fornavn?: string
  etternavn?: string
  e_postjobb?: string
}

export interface Bruker {
  id: number
  email: string
  full_name: string
  ansattid?: number
  rolle: string
  is_active: boolean
  is_superuser: boolean
  created_at?: string
  updated_at?: string
  ansatt?: AnsattInfo
}

export interface BrukerCreate {
  email: string
  full_name: string
  password: string
  ansattid?: number
  rolle?: string
  is_active?: boolean
}

export interface BrukerUpdate {
  email?: string
  full_name?: string
  password?: string
  ansattid?: number | null
  rolle?: string
  is_active?: boolean
}

// Common Types
export interface Allergen {
  id: number
  navn: string
  beskrivelse?: string
}

export interface TableSchema {
  table_name: string
  columns: ColumnSchema[]
}

export interface ColumnSchema {
  name: string
  type: string
  nullable: boolean
  primary_key: boolean
  foreign_key?: {
    table: string
    column: string
  }
}