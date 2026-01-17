import { apiClient } from '@/lib/api-client'

// Types
export interface Marking {
  code: string
  name: string
}

export interface Nutrient {
  code: string
  measurement: number
  measurementPrecision: string
  measurementType: string
  name: string
}

export interface Allergen {
  code: string
  level: 'FREE_FROM' | 'CROSS_CONTAMINATION' | 'MAY_CONTAIN' | 'CONTAINS'
  name: string
}

export interface MatinfoProduct {
  id: string
  gtin: string
  name: string
  itemNumber?: number
  epdNumber?: number
  producerName?: string
  providerName?: string
  brandName?: string
  ingredientStatement?: string
  productUrl?: string
  markings: Marking[]
  images: string[]
  packageSize?: string
  nutrients: Nutrient[]
  allergens: Allergen[]
}

export interface MatinfoProductListResponse {
  total: number
  items: MatinfoProduct[]
  page: number
  size: number
}

export interface MatinfoListParams {
  page?: number
  size?: number
  search?: string
}

export interface SyncResponse {
  message: string
  total: number
  synced: number
  failed: number
}

export interface GTINListResponse {
  count: number
  gtins: string[]
  since_date: string
}

export interface ProductMatch {
  gtin: string
  name: string
  brandname?: string
  producername?: string
  packagesize?: string
  similarity: number
  matched_variation: string
}

export interface ProductSearchResponse {
  success: boolean
  query: string
  total_matches: number
  matches: ProductMatch[]
  message?: string
}

export interface VendorImportResponse {
  success: boolean
  message: string
  product_id?: string
  gtin: string
  operation: string
}

export interface LinkedProductResponse {
  produkter: {
    produktid: number
    produktnavn: string
    ean_kode: string
    pris?: number
    lagermengde?: number
    visningsnavn?: string
    leverandorsproduktnr?: string
    pakningstype?: string
    pakningsstorrelse?: string
  }
  details?: MatinfoProduct
}

// API functions
export const matinfoApi = {
  // List products with pagination and search
  list: async (params?: MatinfoListParams): Promise<MatinfoProductListResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.size) queryParams.append('size', params.size.toString())
    if (params?.search) queryParams.append('search', params.search)

    const response = await apiClient.get(`/v1/products?${queryParams}`)
    return response.data
  },

  // Get single product by ID
  get: async (id: string): Promise<MatinfoProduct> => {
    const response = await apiClient.get(`/v1/products/${id}`)
    return response.data
  },

  // Get product by GTIN
  getByGtin: async (gtin: string): Promise<MatinfoProduct> => {
    const response = await apiClient.get(`/v1/products/gtin/${gtin}`)
    return response.data
  },

  // Create product
  create: async (data: Partial<MatinfoProduct>): Promise<MatinfoProduct> => {
    const response = await apiClient.post('/v1/products', data)
    return response.data
  },

  // Update product
  update: async (id: string, data: Partial<MatinfoProduct>): Promise<MatinfoProduct> => {
    const response = await apiClient.put(`/v1/products/${id}`, data)
    return response.data
  },

  // Delete product
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/v1/products/${id}`)
  },

  // Search products
  search: async (query: string, limit = 20): Promise<MatinfoProduct[]> => {
    const response = await apiClient.get(`/v1/products/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data.items || []
  },

  // Get linked LKC product by GTIN
  getLinkedProduct: async (gtin: string): Promise<LinkedProductResponse> => {
    const response = await apiClient.get(`/v1/products/gtin/${gtin}/linked`)
    return response.data
  },

  // Sync operations
  sync: {
    // Sync products from Matinfo.no
    syncProducts: async (daysBack = 7): Promise<SyncResponse> => {
      const response = await apiClient.post(`/v1/matinfo/sync/products?days_back=${daysBack}`)
      return response.data
    },

    // Sync single product by GTIN
    syncProduct: async (gtin: string): Promise<{ message: string; gtin: string }> => {
      const response = await apiClient.post(`/v1/matinfo/sync/product/${gtin}`)
      return response.data
    },

    // Get list of updated GTINs
    getUpdatedGtins: async (daysBack = 7): Promise<GTINListResponse> => {
      const response = await apiClient.get(`/v1/matinfo/sync/updated-gtins?days_back=${daysBack}`)
      return response.data
    },

    // Get new products (in Matinfo but not in our DB)
    getNewProducts: async (daysBack = 30): Promise<GTINListResponse> => {
      const response = await apiClient.get(`/v1/matinfo/sync/new-products?days_back=${daysBack}`)
      return response.data
    },

    // Search by name using AI variations
    searchByName: async (name: string, limit = 10): Promise<ProductSearchResponse> => {
      const response = await apiClient.post(`/v1/matinfo/search/name?name=${encodeURIComponent(name)}&limit=${limit}`)
      return response.data
    },
  },

  // Vendor import
  vendorImport: async (data: Partial<MatinfoProduct>): Promise<VendorImportResponse> => {
    const response = await apiClient.post('/v1/products/vendor-import', data)
    return response.data
  },

  // Batch vendor import
  vendorImportBatch: async (products: Partial<MatinfoProduct>[]): Promise<VendorImportResponse[]> => {
    const response = await apiClient.post('/v1/products/vendor-import/batch', products)
    return response.data
  },

  // Allergen operations
  allergens: {
    update: async (productId: string, code: string, data: { level: string; name: string }): Promise<Allergen> => {
      const response = await apiClient.put(`/v1/products/${productId}/allergens/${code}`, data)
      return response.data
    },
    delete: async (productId: string, code: string): Promise<void> => {
      await apiClient.delete(`/v1/products/${productId}/allergens/${code}`)
    },
  },

  // Nutrient operations
  nutrients: {
    update: async (productId: string, code: string, data: Partial<Nutrient>): Promise<Nutrient> => {
      const response = await apiClient.put(`/v1/products/${productId}/nutrients/${code}`, data)
      return response.data
    },
    delete: async (productId: string, code: string): Promise<void> => {
      await apiClient.delete(`/v1/products/${productId}/nutrients/${code}`)
    },
  },
}
