import { apiClient } from '@/lib/api-client'

export interface ProductSearchResult {
  id?: string
  gtin: string
  name: string
  producer: string
  brand?: string
  ingredients?: string
  linked_product?: {
    produktid: number
    produktnavn: string
    pris: number
    lagermengde: number
  }
  allergens?: Array<{
    code: string
    name: string
    level: number
  }>
  nutrients?: Array<{
    code: string
    name: string
    measurement: number
    type: string
  }>
  relevance_reason?: any[]
}

export interface SearchResponse {
  success: boolean
  source: 'database' | 'llm' | 'hybrid'
  query: string
  total: number
  items: ProductSearchResult[]
  error?: string
  llm_response?: string
  sources_used?: string[]
}

export interface HybridSearchRequest {
  query: string
  use_llm?: boolean
  limit?: number
  filters?: {
    brand?: string
    has_allergens?: boolean
  }
}

export interface LinkedProductResponse {
  produkter: {
    produktid: number
    produktnavn: string
    ean_kode: string
    pris: number
    lagermengde: number
    visningsnavn?: string
    leverandorsproduktnr?: string
    pakningstype?: string
    pakningsstorrelse?: string
  }
  details?: any
}

export const productSearchApi = {
  // Search products using database or LLM
  search: async (
    query: string,
    source: 'database' | 'llm' = 'database',
    limit: number = 20,
    offset: number = 0,
    includeDetails: boolean = true
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      q: query,
      source,
      limit: limit.toString(),
      offset: offset.toString(),
      include_details: includeDetails.toString()
    })
    
    const response = await apiClient.get(`/v1/products/search?${params}`)
    return response.data
  },

  // Hybrid search combining database and LLM
  hybridSearch: async (request: HybridSearchRequest): Promise<SearchResponse> => {
    const response = await apiClient.post('/v1/products/search/hybrid', request)
    return response.data
  },

  // Get linked product from tblprodukter by GTIN
  getLinkedProduct: async (gtin: string): Promise<LinkedProductResponse> => {
    const response = await apiClient.get(`/v1/products/gtin/${gtin}/linked`)
    return response.data
  },

  // Export products for RAG system
  exportForRAG: async (): Promise<{
    success: boolean
    message: string
    export_path?: string
    files_created: number
    total_products: number
    timestamp?: string
  }> => {
    const response = await apiClient.post('/v1/products/export')
    return response.data
  },

  // Get export status
  getExportStatus: async (): Promise<{
    exports_available: boolean
    total_exports: number
    latest_export?: {
      timestamp: string
      path: string
      total_products: number
      files_created: number
    }
    exports: Array<{
      timestamp: string
      path: string
      total_products: number
      files_created: number
    }>
  }> => {
    const response = await apiClient.get('/v1/products/export/status')
    return response.data
  }
}