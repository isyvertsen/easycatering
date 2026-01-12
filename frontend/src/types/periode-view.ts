/**
 * Types for the periode-view API
 * Hierarchical view of periods with menu groups, menus, and products
 */

export interface PeriodeViewProdukt {
  produktid: number
  produktnavn: string
  pris: number | null
}

export interface PeriodeViewMeny {
  menyid: number
  beskrivelse: string
  menygruppe: number
  menygruppe_beskrivelse: string
  produkt_antall: number
  produkter: PeriodeViewProdukt[]
}

export interface PeriodeViewMenygruppe {
  gruppeid: number
  beskrivelse: string
  menyer: PeriodeViewMeny[]
}

export interface PeriodeView {
  menyperiodeid: number
  ukenr: number
  fradato: string
  tildato: string
  total_menyer: number
  total_produkter: number
  menygrupper: PeriodeViewMenygruppe[]
}

export interface PeriodeViewListResponse {
  items: PeriodeView[]
  total: number
  page: number
  page_size: number
  pages: number
}

// Request types for mutations
export interface KopierPeriodeRequest {
  kilde_periode_id: number
  ukenr: number
  fradato: string
  tildato: string
  kopier_produkter: boolean
}

export interface KopierPeriodeResponse {
  menyperiodeid: number
  ukenr: number
  fradato: string
  tildato: string
  kopierte_menyer: number
}

export interface BulkMenyerRequest {
  periode_id: number
  meny_ids: number[]
}

export interface BulkMenyerResponse {
  message: string
  antall: number
}

export interface TilgjengeligMeny {
  menyid: number
  beskrivelse: string
  menygruppe: number
  menygruppe_beskrivelse: string
}
