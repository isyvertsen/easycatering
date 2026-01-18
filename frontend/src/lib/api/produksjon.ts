import { apiClient } from '@/lib/api-client'

// ============================================================================
// Types for Production Template
// ============================================================================

export interface TemplateDetalj {
  template_detaljid?: number
  template_id?: number
  produktid?: number
  kalkyleid?: number
  standard_antall?: number
  maks_antall?: number
  paakrevd?: boolean
  linje_nummer?: number
  // Joined data
  produkt?: {
    produktid: number
    produktnavn: string
    enhet?: string
  }
  kalkyle?: {
    kalkylekode: number
    kalkylenavn: string
  }
}

export interface ProduksjonsTemplate {
  id: number  // Alias for template_id (for compatibility with generic components)
  template_id: number
  template_navn: string
  beskrivelse?: string
  kundegruppe?: number
  gyldig_fra?: string
  gyldig_til?: string
  aktiv?: boolean
  opprettet_dato?: string
  opprettet_av?: number
  detaljer?: TemplateDetalj[]
}

export interface TemplateCreateInput {
  template_navn: string
  beskrivelse?: string
  kundegruppe?: number
  gyldig_fra?: string
  gyldig_til?: string
  aktiv?: boolean
  detaljer?: Omit<TemplateDetalj, 'template_detaljid' | 'template_id'>[]
}

export type TemplateUpdateInput = Partial<TemplateCreateInput>

export interface TemplateListParams {
  page?: number
  page_size?: number
  aktiv?: boolean
  search?: string
}

export interface TemplateListResponse {
  items: ProduksjonsTemplate[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// Types for Production Order
// ============================================================================

export interface ProduksjonsDetalj {
  produksjonskode: number
  produktid: number
  produktnavn?: string
  leverandorsproduktnr?: string
  pris?: number
  porsjonsmengde?: number
  enh?: string
  totmeng?: number
  kostpris?: number
  visningsenhet?: string
  dag?: number
  antallporsjoner?: number
  kalkyleid?: number
  kommentar?: string
  linje_nummer?: number
  // Joined data
  produkt?: {
    produktid: number
    produktnavn: string
    enhet?: string
  }
  kalkyle?: {
    kalkylekode: number
    kalkylenavn: string
  }
}

export interface Produksjon {
  id: number  // Alias for produksjonkode (for compatibility with generic components)
  produksjonkode: number
  kundeid: number
  ansattid: number
  informasjon?: string
  refporsjon?: string
  antallporsjoner?: number
  leveringsdato?: string
  merknad?: string
  created?: string
  template_id?: number
  periodeid?: number
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'transferred' | 'produced'
  opprettet_av?: number
  oppdatert_dato?: string
  innsendt_dato?: string
  godkjent_dato?: string
  godkjent_av?: number
  ordre_id?: number
  overfort_dato?: string
  overfort_av?: number
  detaljer?: ProduksjonsDetalj[]
  // Joined data
  kunde?: {
    kundeid: number
    kundenavn: string
  }
  template?: ProduksjonsTemplate
}

export interface ProduksjonsListParams {
  page?: number
  page_size?: number
  status?: string
  kundeid?: number
  template_id?: number
}

export interface ProduksjonsListResponse {
  items: Produksjon[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DistributeTemplateRequest {
  template_id: number
  kunde_ids?: number[]
}

export interface ApproveRequest {
  produksjonskode_list: number[]
  godkjent_av: number
}

export interface TransferToOrderRequest {
  produksjonskode: number
  leveringsdato?: string
}

// ============================================================================
// Template API
// ============================================================================

export const templateApi = {
  list: async (params?: TemplateListParams): Promise<TemplateListResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.aktiv !== undefined) queryParams.append('aktiv', params.aktiv.toString())
    if (params?.search) queryParams.append('search', params.search)

    const response = await apiClient.get(`/v1/produksjon/templates?${queryParams}`)
    return response.data
  },

  get: async (id: number): Promise<ProduksjonsTemplate> => {
    const response = await apiClient.get(`/v1/produksjon/templates/${id}`)
    return response.data
  },

  create: async (data: TemplateCreateInput): Promise<ProduksjonsTemplate> => {
    const response = await apiClient.post('/v1/produksjon/templates', data)
    return response.data
  },

  update: async (id: number, data: TemplateUpdateInput): Promise<ProduksjonsTemplate> => {
    const response = await apiClient.put(`/v1/produksjon/templates/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/produksjon/templates/${id}`)
  },

  distribute: async (templateId: number, kundeIds?: number[]): Promise<{ message: string; created_count: number }> => {
    const response = await apiClient.post(`/v1/produksjon/templates/${templateId}/distribute`, {
      template_id: templateId,
      kunde_ids: kundeIds,
    })
    return response.data
  },
}

// ============================================================================
// Production Order API
// ============================================================================

export const produksjonApi = {
  list: async (params?: ProduksjonsListParams): Promise<ProduksjonsListResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.kundeid) queryParams.append('kundeid', params.kundeid.toString())
    if (params?.template_id) queryParams.append('template_id', params.template_id.toString())

    const response = await apiClient.get(`/v1/produksjon/orders?${queryParams}`)
    return response.data
  },

  get: async (id: number): Promise<Produksjon> => {
    const response = await apiClient.get(`/v1/produksjon/orders/${id}`)
    return response.data
  },

  submit: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/v1/produksjon/orders/${id}/submit`)
    return response.data
  },

  approve: async (request: ApproveRequest): Promise<{ message: string; approved_count: number }> => {
    const response = await apiClient.post('/v1/produksjon/orders/approve', request)
    return response.data
  },

  reject: async (id: number, reason?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/v1/produksjon/orders/${id}/reject`, { reason })
    return response.data
  },

  transferToOrder: async (id: number, leveringsdato?: string): Promise<{ message: string; ordreid: number }> => {
    const response = await apiClient.post(`/v1/produksjon/orders/${id}/transfer-to-order`, {
      produksjonskode: id,
      leveringsdato,
    })
    return response.data
  },

  updateDetails: async (id: number, detaljer: Partial<ProduksjonsDetalj>[]): Promise<Produksjon> => {
    const response = await apiClient.put(`/v1/produksjon/orders/${id}/details`, { detaljer })
    return response.data
  },
}
