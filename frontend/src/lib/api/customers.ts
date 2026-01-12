import { Customer } from '@/types/models'
import { createCrudApi, BaseListParams, BaseListResponse } from './base'

export interface CustomerListParams extends BaseListParams {
  aktiv?: boolean
  search?: string
}

export type CustomerListResponse = BaseListResponse<Customer>

// Lag base API med factory
const baseApi = createCrudApi<Customer, Omit<Customer, 'kundeid'>, CustomerListParams>({
  endpoint: '/v1/kunder'
})

// Utvid med custom list funksjon for å mappe 'search' -> 'sok'
export const customersApi = {
  ...baseApi,
  list: async (params?: CustomerListParams): Promise<CustomerListResponse> => {
    // Mapper 'search' til 'sok' for backend
    const mappedParams = params ? {
      ...params,
      sok: params.search,
      search: undefined
    } : undefined

    return baseApi.list(mappedParams as any)
  }
}
