import { apiClient } from '@/lib/api-client'
import { Bruker, BrukerCreate, BrukerUpdate } from '@/types/models'
import { BaseListParams, BaseListResponse, createCrudApi } from './base'

export interface BrukerListParams extends BaseListParams {
  rolle?: string
  is_active?: boolean
}

const baseBrukereApi = createCrudApi<Bruker, BrukerCreate, BrukerListParams>({
  endpoint: '/v1/brukere'
})

export const brukereApi = {
  ...baseBrukereApi,

  /**
   * Get user by employee ID
   */
  getByAnsattId: async (ansattid: number): Promise<Bruker> => {
    const response = await apiClient.get(`/v1/brukere/ansatt/${ansattid}`)
    return response.data
  },

  /**
   * Update user with proper typing
   */
  update: async (id: string | number, data: BrukerUpdate): Promise<Bruker> => {
    const response = await apiClient.put(`/v1/brukere/${id}`, data)
    return response.data
  },

  /**
   * Activate a deactivated user
   */
  activate: async (id: string | number): Promise<void> => {
    await apiClient.post(`/v1/brukere/${id}/activate`)
  },
}

export type { BaseListResponse as BrukerListResponse }
