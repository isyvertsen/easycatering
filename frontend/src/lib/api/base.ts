import { apiClient } from '@/lib/api-client'

export interface BaseListParams {
  page?: number
  page_size?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  [key: string]: any
}

export interface BaseListResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CrudApiConfig {
  endpoint: string
  idField?: string
}

/**
 * Generisk CRUD API factory
 * Reduserer duplikatkode for standard CRUD-operasjoner
 */
export function createCrudApi<T, TCreate = Omit<T, 'id'>, TListParams = BaseListParams>(
  config: CrudApiConfig
) {
  const { endpoint, idField = 'id' } = config

  return {
    /**
     * List items with pagination and filters
     */
    list: async (params?: TListParams): Promise<BaseListResponse<T>> => {
      const queryParams = new URLSearchParams()

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              // Handle arrays (e.g., kundegruppe_ids)
              value.forEach(v => queryParams.append(key, v.toString()))
            } else {
              queryParams.append(key, value.toString())
            }
          }
        })
      }

      const queryString = queryParams.toString()
      const url = queryString ? `${endpoint}/?${queryString}` : `${endpoint}/`
      const response = await apiClient.get(url)

      // If backend returns array directly, wrap in pagination structure
      if (Array.isArray(response.data)) {
        const items = response.data as T[]
        return {
          items,
          total: items.length,
          page: 1,
          page_size: items.length,
          total_pages: 1
        }
      }

      return response.data
    },

    /**
     * Get single item by ID
     */
    get: async (id: number | string): Promise<T> => {
      const response = await apiClient.get(`${endpoint}/${id}`)
      return response.data
    },

    /**
     * Create new item
     */
    create: async (data: TCreate): Promise<T> => {
      const response = await apiClient.post(`${endpoint}/`, data)
      return response.data
    },

    /**
     * Update existing item
     */
    update: async (id: number | string, data: Partial<TCreate>): Promise<T> => {
      const response = await apiClient.put(`${endpoint}/${id}`, data)
      return response.data
    },

    /**
     * Delete item
     */
    delete: async (id: number | string): Promise<void> => {
      await apiClient.delete(`${endpoint}/${id}`)
    }
  }
}

/**
 * Utility for building query parameters
 * Kan brukes for mer komplekse queries
 */
export function buildQueryParams(params: Record<string, any>): URLSearchParams {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v.toString()))
      } else if (typeof value === 'boolean') {
        queryParams.append(key, value.toString())
      } else {
        queryParams.append(key, value.toString())
      }
    }
  })

  return queryParams
}
