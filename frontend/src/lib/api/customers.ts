import { Customer } from '@/types/models'
import { createCrudApi, BaseListParams, BaseListResponse } from './base'

export interface CustomerListParams extends BaseListParams {
  aktiv?: boolean
  search?: string
  kundegruppe?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}

export type CustomerListResponse = BaseListResponse<Customer>

// Lag base API med factory
const baseApi = createCrudApi<Customer, Omit<Customer, 'kundeid'>, CustomerListParams>({
  endpoint: '/v1/kunder'
})

// Utvid med custom list funksjon
export const customersApi = {
  ...baseApi,
  list: async (params?: CustomerListParams): Promise<CustomerListResponse> => {
    // Backend supports 'search' directly now, no need to map to 'sok'
    return baseApi.list(params)
  }
}
