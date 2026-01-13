import { Leverandor } from '@/types/models'
import { createCrudApi, BaseListParams, BaseListResponse } from './base'
import { apiClient } from '@/lib/api-client'

export interface LeverandorListParams extends BaseListParams {
  aktiv?: boolean
  search?: string
}

export type LeverandorListResponse = BaseListResponse<Leverandor>

// CreateData type - omit id and leverandorid since they are server-generated
export type LeverandorCreateData = Omit<Leverandor, 'id' | 'leverandorid'>

// Bruk generisk CRUD factory
export const leverandorerApi = {
  ...createCrudApi<Leverandor, LeverandorCreateData, LeverandorListParams>({
    endpoint: '/v1/leverandorer'
  }),

  async bulkDelete(ids: number[]): Promise<{ message: string }> {
    const response = await apiClient.post('/v1/leverandorer/bulk-delete', ids)
    return response.data
  }
}
