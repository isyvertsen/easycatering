import { apiClient } from '@/lib/api-client'
import { Order, OrderLine } from '@/types/models'

export interface OrderListParams {
  skip?: number
  limit?: number
  search?: string
  kunde_id?: number
  fra_dato?: string
  til_dato?: string
  kundegruppe_ids?: number[]
  sort_by?: 'leveringsdato' | 'ordredato'
  sort_order?: 'asc' | 'desc'
}

export interface OrderListResponse {
  items: Order[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface OrderCreateData {
  kundeid: number
  ordredato?: string
  leveringsdato?: string
  informasjon?: string
  betalingsmate?: number
  ordrestatusid?: number
}

export interface OrderLineCreateData {
  produktid: number
  levdato?: string
  pris?: number
  antall?: number
  rabatt?: number
  ident?: string
}

export const ordersApi = {
  // List orders with filters
  list: async (params?: OrderListParams): Promise<OrderListResponse> => {
    const queryParams = new URLSearchParams()

    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.kunde_id) queryParams.append('kunde_id', params.kunde_id.toString())
    if (params?.fra_dato) queryParams.append('fra_dato', params.fra_dato)
    if (params?.til_dato) queryParams.append('til_dato', params.til_dato)
    if (params?.kundegruppe_ids?.length) {
      params.kundegruppe_ids.forEach(id => queryParams.append('kundegruppe_ids', id.toString()))
    }
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order)

    const response = await apiClient.get(`/v1/ordrer/?${queryParams}`)
    return response.data
  },

  // Get single order
  get: async (id: number): Promise<Order> => {
    const response = await apiClient.get(`/v1/ordrer/${id}`)
    return response.data
  },

  // Create new order
  create: async (data: OrderCreateData): Promise<Order> => {
    const response = await apiClient.post('/v1/ordrer/', data)
    return response.data
  },

  // Update order
  update: async (id: number, data: Partial<OrderCreateData>): Promise<Order> => {
    const response = await apiClient.put(`/v1/ordrer/${id}`, data)
    return response.data
  },

  // Cancel order (delete endpoint sets cancellation date)
  cancel: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/ordrer/${id}`)
  },

  // Get order details/lines
  getOrderLines: async (orderId: number): Promise<OrderLine[]> => {
    const response = await apiClient.get(`/v1/ordrer/${orderId}/detaljer`)
    return response.data
  },

  // Add order line
  addOrderLine: async (orderId: number, data: OrderLineCreateData): Promise<OrderLine> => {
    const response = await apiClient.post(`/v1/ordrer/${orderId}/detaljer`, data)
    return response.data
  },

  // Update order line
  updateOrderLine: async (orderId: number, lineId: number, data: Partial<OrderLineCreateData>): Promise<OrderLine> => {
    const response = await apiClient.put(`/v1/ordrer/${orderId}/detaljer/${lineId}`, data)
    return response.data
  },

  // Delete order line
  deleteOrderLine: async (orderId: number, lineId: number): Promise<void> => {
    await apiClient.delete(`/v1/ordrer/${orderId}/detaljer/${lineId}`)
  },

  // Duplicate order
  duplicate: async (id: number): Promise<Order> => {
    const response = await apiClient.post(`/v1/ordrer/${id}/duplicate`)
    return response.data
  },

  // Update order status
  updateStatus: async (id: number, statusId: number): Promise<{ message: string }> => {
    const response = await apiClient.put(`/v1/ordrer/${id}/status?status_id=${statusId}`)
    return response.data
  },

  // Batch update status for multiple orders
  batchUpdateStatus: async (orderIds: number[], statusId: number): Promise<{ message: string; updated_count: number }> => {
    const params = new URLSearchParams()
    orderIds.forEach(id => params.append('ordre_ids', id.toString()))
    params.append('status_id', statusId.toString())
    const response = await apiClient.post(`/v1/ordrer/batch/status?${params}`)
    return response.data
  }
}