import { apiClient } from '@/lib/api-client'

export interface Kundegruppe {
  id: number  // Alias for gruppeid to satisfy CrudItem constraint
  gruppeid: number
  gruppe: string
  webshop: boolean
  autofaktura: boolean
}

export interface KundegruppeCreate {
  gruppe: string
  webshop: boolean
  autofaktura: boolean
}

export interface KundegruppeUpdate {
  gruppe?: string
  webshop?: boolean
  autofaktura?: boolean
}

export interface KundegruppeListParams {
  page?: number
  page_size?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface KundegruppeListResponse {
  items: Kundegruppe[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const kundegruppeApi = {
  list: async (params?: KundegruppeListParams): Promise<KundegruppeListResponse> => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/kunde-gruppe/?${queryString}` : '/v1/kunde-gruppe/'
    const response = await apiClient.get(url)

    // Add id alias for each item
    const data = response.data
    if (data.items) {
      data.items = data.items.map((item: Omit<Kundegruppe, 'id'>) => ({
        ...item,
        id: item.gruppeid
      }))
    }
    return data
  },

  get: async (id: number): Promise<Kundegruppe> => {
    const response = await apiClient.get(`/v1/kunde-gruppe/${id}`)
    return { ...response.data, id: response.data.gruppeid }
  },

  create: async (data: KundegruppeCreate): Promise<Kundegruppe> => {
    const response = await apiClient.post('/v1/kunde-gruppe/', data)
    return { ...response.data, id: response.data.gruppeid }
  },

  update: async (id: number, data: KundegruppeUpdate): Promise<Kundegruppe> => {
    const response = await apiClient.put(`/v1/kunde-gruppe/${id}`, data)
    return { ...response.data, id: response.data.gruppeid }
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/kunde-gruppe/${id}`)
  },

  bulkDelete: async (ids: number[]): Promise<{ message: string }> => {
    const response = await apiClient.post('/v1/kunde-gruppe/bulk-delete', ids)
    return response.data
  }
}
