import { apiClient } from '@/lib/api-client'

// --- Types ---

export interface OrdrelinjeBestilling {
  produktid: number
  antall: number
}

export interface PeriodeBestilling {
  periodeid: number
  linjer: OrdrelinjeBestilling[]
}

export interface OpprettOrdreRequest {
  kundeid: number
  perioder: PeriodeBestilling[]
}

export interface OpprettOrdreResponse {
  ordre_ids: number[]
  antall_ordrer: number
  melding: string
}

export interface GenererLenkeRequest {
  kundeid: number
  expires_days?: number
}

export interface GenererLenkeResponse {
  token: string
  link: string
  expires_at: string
  kundeid: number
  kundenavn: string | null
  email_sent: boolean
  email_address: string | null
}

export interface ProduktForKunde {
  produktid: number
  produktnavn: string | null
  visningsnavn: string | null
  pris: number | null
}

export interface PeriodeForKunde {
  periodeid: number
  ukenr: number | null
  fradato: string | null
  tildato: string | null
  produkter: ProduktForKunde[]
}

export interface KundeMenyResponse {
  kundeid: number
  kundenavn: string | null
  menygruppe_navn: string | null
  perioder: PeriodeForKunde[]
  token_expires_at: string
}

export interface KundeBestillingRequest {
  perioder: PeriodeBestilling[]
}

export interface KundeBestillingResponse {
  success: boolean
  ordre_ids: number[]
  melding: string
}

// --- API Client ---

export const bestillingRegistrerApi = {
  /**
   * Opprett ordre for en kunde (intern bruk)
   */
  async opprettOrdre(request: OpprettOrdreRequest): Promise<OpprettOrdreResponse> {
    const response = await apiClient.post<OpprettOrdreResponse>(
      '/v1/bestilling-registrer/ordre',
      request
    )
    return response.data
  },

  /**
   * Generer kundelenke for selvbetjening
   */
  async genererLenke(request: GenererLenkeRequest): Promise<GenererLenkeResponse> {
    const response = await apiClient.post<GenererLenkeResponse>(
      '/v1/bestilling-registrer/send-link',
      request
    )
    return response.data
  },

  /**
   * List aktive tokens
   */
  async listTokens(kundeid?: number): Promise<GenererLenkeResponse[]> {
    const queryParams = new URLSearchParams()
    if (kundeid !== undefined) {
      queryParams.append('kundeid', kundeid.toString())
    }
    const response = await apiClient.get<GenererLenkeResponse[]>(
      `/v1/bestilling-registrer/tokens?${queryParams.toString()}`
    )
    return response.data
  },

  /**
   * Hent kundemeny via token (PUBLIC - via proxy)
   */
  async getKundeMeny(token: string): Promise<KundeMenyResponse> {
    // Use Next.js API route as proxy (handles HTTPS/internal backend)
    const response = await fetch(
      `/api/bestilling/kunde/meny?token=${encodeURIComponent(token)}`
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Ukjent feil' }))
      throw new Error(error.detail || 'Feil ved henting av meny')
    }
    return response.json()
  },

  /**
   * Send inn kundebestilling via token (PUBLIC - via proxy)
   */
  async submitKundeBestilling(
    token: string,
    request: KundeBestillingRequest
  ): Promise<KundeBestillingResponse> {
    // Use Next.js API route as proxy (handles HTTPS/internal backend)
    const response = await fetch(
      `/api/bestilling/kunde/submit?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Ukjent feil' }))
      throw new Error(error.detail || 'Feil ved innsending av bestilling')
    }
    return response.json()
  },
}
