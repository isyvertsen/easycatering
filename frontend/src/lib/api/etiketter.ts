import { apiClient } from '@/lib/api-client'

export interface EtikettProdukt {
  produktid: number
  produktnavn: string | null
  pris: number | null
  antall: number | null
}

export interface EtikettOrdre {
  ordreid: number
  leveringsdato: string | null
  ansattid: number | null
  produkter: EtikettProdukt[]
}

export interface EtikettKunde {
  kundeid: number
  kundenavn: string | null
  leveringsdag: number | null
  adresse: string | null
  postnr: string | null
  sted: string | null
  rute: number | null
  sjaforparute: number | null
  diett: boolean | null
  menyinfo: string | null
  menygruppeid: number | null
  menygruppe_beskrivelse: string | null
  sone: string | null
  ordrer: EtikettOrdre[]
}

export interface EtikettResponse {
  fra_dato: string
  til_dato: string
  kunder: EtikettKunde[]
  total_kunder: number
  total_ordrer: number
}

export interface EtikettParams {
  fra_dato: string
  til_dato: string
  sone_id?: number
  rute?: number
  ordrestatus?: number
}

export const etiketterApi = {
  getEtiketter: async (params: EtikettParams): Promise<EtikettResponse> => {
    const queryParams = new URLSearchParams()
    queryParams.append('fra_dato', params.fra_dato)
    queryParams.append('til_dato', params.til_dato)
    if (params.sone_id) queryParams.append('sone_id', params.sone_id.toString())
    if (params.rute) queryParams.append('rute', params.rute.toString())
    if (params.ordrestatus) queryParams.append('ordrestatus', params.ordrestatus.toString())

    const response = await apiClient.get(`/v1/etiketter/?${queryParams.toString()}`)
    return response.data
  }
}
