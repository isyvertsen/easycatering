import { apiClient } from '@/lib/api-client'

export interface Produkt {
  id: number  // Alias for produktid to satisfy CrudItem constraint
  produktid: number
  produktnavn: string
  leverandorsproduktnr: string | null
  antalleht: number | null
  pakningstype: string | null
  pakningsstorrelse: string | null
  pris: number | null
  paknpris: number | null
  levrandorid: number | null
  kategoriid: number | null
  lagermengde: number | null
  bestillingsgrense: number | null
  bestillingsmengde: number | null
  ean_kode: string | null
  utgatt: boolean | null
  oppdatert: string | null
  webshop: boolean | null
  rett_komponent: boolean | null
  mvaverdi: number | null
  lagerid: number | null
  utregningsfaktor: number | null
  utregnetpris: number | null
  visningsnavn: string | null
  visningsnavn2: string | null
}

export interface ProduktListParams {
  skip?: number
  limit?: number
  aktiv?: boolean
  kategori?: number
  sok?: string
  has_gtin?: boolean  // Filter for GTIN-status: true=has GTIN, false=missing GTIN
  sort_by?: string    // Sort by field (produktid, produktnavn, pris, ean_kode)
  sort_order?: 'asc' | 'desc'  // Sort order
  include_stats?: boolean  // Include GTIN statistics (avoids N+1 queries for stats)
}

export interface ProduktStats {
  total: number
  with_gtin: number
  without_gtin: number
}

export interface ProduktListResponse {
  items: Produkt[]
  total: number
  page: number
  page_size: number
  total_pages: number
  stats?: ProduktStats  // Optional stats when include_stats=true
}

export interface MatinfoAllergenInfo {
  code: string
  name: string
  level: string  // FREE_FROM, CONTAINS, MAY_CONTAIN
}

export interface MatinfoNutrientInfo {
  code: string
  name: string
  measurement: number | null
  measurement_precision: string | null
  measurement_type: string | null
}

export interface MatinfoSearchResult {
  id: number
  gtin: string
  name: string
  brand: string | null
  ingredients: string | null
  similarity_score: number | null
  allergens: MatinfoAllergenInfo[]
  nutrients: MatinfoNutrientInfo[]
}

export interface GtinUpdateResponse {
  produktid: number
  produktnavn: string
  old_gtin: string | null
  new_gtin: string
  matinfo_match: {
    found: boolean
    product_name: string | null
    brand: string | null
  } | null
  message: string
}

export interface BulkGtinUpdate {
  produktid: number
  gtin: string
}

export interface BulkGtinUpdateResponse {
  total: number
  success: number
  failed: number
  matinfo_matches: number
  details: Array<{
    produktid: number
    produktnavn?: string
    status: 'success' | 'error'
    old_gtin?: string | null
    new_gtin?: string
    matinfo_match?: boolean
    message?: string
  }>
}

export type ProduktCreateData = {
  produktnavn: string
  leverandorsproduktnr?: string | null
  antalleht?: number | null
  pakningstype?: string | null
  pakningsstorrelse?: string | null
  pris?: number | null
  paknpris?: number | null
  levrandorid?: number | null
  kategoriid?: number | null
  lagermengde?: number | null
  bestillingsgrense?: number | null
  bestillingsmengde?: number | null
  ean_kode?: string | null
  utgatt?: boolean | null
  webshop?: boolean | null
  mvaverdi?: number | null
  lagerid?: number | null
  utregningsfaktor?: number | null
  utregnetpris?: number | null
  visningsnavn?: string | null
  visningsnavn2?: string | null
  rett_komponent?: boolean | null
}

export const produkterApi = {
  /**
   * List produkter with pagination and filtering
   */
  async list(params?: ProduktListParams): Promise<Produkt[]> {
    const response = await this.listWithMeta(params)
    return response.items || []
  },

  /**
   * List produkter with pagination and filtering, returning full response with metadata
   */
  async listWithMeta(params?: ProduktListParams): Promise<ProduktListResponse> {
    const queryParams = new URLSearchParams()

    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params?.aktiv !== undefined) queryParams.append('aktiv', params.aktiv.toString())
    if (params?.kategori !== undefined) queryParams.append('kategori', params.kategori.toString())
    if (params?.sok) queryParams.append('sok', params.sok)
    if (params?.has_gtin !== undefined) queryParams.append('has_gtin', params.has_gtin.toString())
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order)
    if (params?.include_stats) queryParams.append('include_stats', 'true')

    const response = await apiClient.get<ProduktListResponse>(`/v1/produkter/?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Get a single produkt by ID
   */
  async get(id: number): Promise<Produkt> {
    const response = await apiClient.get<Produkt>(`/v1/produkter/${id}`)
    return response.data
  },

  /**
   * Create a new produkt
   */
  async create(data: ProduktCreateData): Promise<Produkt> {
    const response = await apiClient.post<Produkt>('/v1/produkter/', data)
    return response.data
  },

  /**
   * Update produkt
   */
  async update(id: number, data: Partial<Produkt>): Promise<Produkt> {
    const response = await apiClient.put<Produkt>(`/v1/produkter/${id}`, data)
    return response.data
  },

  /**
   * Delete produkt
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/v1/produkter/${id}`)
  },

  /**
   * Search Matinfo products with fuzzy matching
   */
  async searchMatinfo(query: string, limit: number = 20): Promise<MatinfoSearchResult[]> {
    const response = await apiClient.get<MatinfoSearchResult[]>(
      `/v1/produkter/matinfo/search?query=${encodeURIComponent(query)}&limit=${limit}`
    )
    return response.data
  },

  /**
   * Get Matinfo suggestions for a produkt based on its name
   */
  async getMatinfoSuggestions(produktId: number, limit: number = 10): Promise<MatinfoSearchResult[]> {
    const response = await apiClient.get<MatinfoSearchResult[]>(
      `/v1/produkter/${produktId}/matinfo-suggestions?limit=${limit}`
    )
    return response.data
  },

  /**
   * Update GTIN for a single produkt
   */
  async updateGtin(produktId: number, gtin: string): Promise<GtinUpdateResponse> {
    const response = await apiClient.patch<GtinUpdateResponse>(
      `/v1/produkter/${produktId}/gtin`,
      { gtin }
    )
    return response.data
  },

  /**
   * Bulk update GTIN for multiple produkter
   */
  async bulkUpdateGtin(updates: BulkGtinUpdate[]): Promise<BulkGtinUpdateResponse> {
    const response = await apiClient.post<BulkGtinUpdateResponse>(
      `/v1/produkter/bulk-update-gtin`,
      { updates }
    )
    return response.data
  },
}
