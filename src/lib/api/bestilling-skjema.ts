import { apiClient } from '@/lib/api-client'

export interface KundeForBestilling {
  kundeid: number
  kundenavn: string | null
  avdeling: string | null
  telefonnummer: string | null
  adresse: string | null
  postnr: string | null
  sted: string | null
  velgsone: number | null
  leveringsdag: number | null
  e_post: string | null
  kundegruppe: number | null
  menygruppeid: number | null
  menygruppe_navn: string | null
  bestillerselv: boolean | null
  rute: number | null
  ansattid: number | null
}

export interface ProduktIBestilling {
  produktid: number
  produktnavn: string | null
  pris: number | null
  pakningstype: string | null
  visningsnavn: string | null
}

export interface MenyIBestilling {
  menyid: number
  beskrivelse: string | null
  produkter: ProduktIBestilling[]
}

export interface PeriodeMedMenyer {
  menyperiodeid: number
  ukenr: number | null
  fradato: string | null
  tildato: string | null
  menyer: MenyIBestilling[]
}

export interface BestillingSkjemaResponse {
  kunder: KundeForBestilling[]
  perioder: PeriodeMedMenyer[]
}

export interface BestillingSkjemaParams {
  kundegruppe_id?: number
  menygruppe_id?: number
  fra_periode_id?: number
  til_periode_id?: number
}

export const bestillingSkjemaApi = {
  /**
   * Hent kunder som matcher bestillingsskjema-kriterier
   */
  async getKunder(params?: {
    kundegruppe_id?: number
    menygruppe_id?: number
  }): Promise<KundeForBestilling[]> {
    const queryParams = new URLSearchParams()
    if (params?.kundegruppe_id !== undefined) {
      queryParams.append('kundegruppe_id', params.kundegruppe_id.toString())
    }
    if (params?.menygruppe_id !== undefined) {
      queryParams.append('menygruppe_id', params.menygruppe_id.toString())
    }
    const response = await apiClient.get<KundeForBestilling[]>(
      `/v1/bestilling-skjema/kunder?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Hent perioder med menyer og produkter
   */
  async getPerioder(params?: {
    menygruppe_id?: number
    fra_periode_id?: number
    til_periode_id?: number
  }): Promise<PeriodeMedMenyer[]> {
    const queryParams = new URLSearchParams()
    if (params?.menygruppe_id !== undefined) {
      queryParams.append('menygruppe_id', params.menygruppe_id.toString())
    }
    if (params?.fra_periode_id !== undefined) {
      queryParams.append('fra_periode_id', params.fra_periode_id.toString())
    }
    if (params?.til_periode_id !== undefined) {
      queryParams.append('til_periode_id', params.til_periode_id.toString())
    }
    const response = await apiClient.get<PeriodeMedMenyer[]>(
      `/v1/bestilling-skjema/perioder?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Hent komplett bestillingsskjema (kunder + perioder) i ett kall
   */
  async getKomplett(params?: BestillingSkjemaParams): Promise<BestillingSkjemaResponse> {
    const queryParams = new URLSearchParams()
    if (params?.kundegruppe_id !== undefined) {
      queryParams.append('kundegruppe_id', params.kundegruppe_id.toString())
    }
    if (params?.menygruppe_id !== undefined) {
      queryParams.append('menygruppe_id', params.menygruppe_id.toString())
    }
    if (params?.fra_periode_id !== undefined) {
      queryParams.append('fra_periode_id', params.fra_periode_id.toString())
    }
    if (params?.til_periode_id !== undefined) {
      queryParams.append('til_periode_id', params.til_periode_id.toString())
    }
    const response = await apiClient.get<BestillingSkjemaResponse>(
      `/v1/bestilling-skjema/komplett?${queryParams.toString()}`
    )
    return response.data
  },
}
