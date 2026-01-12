import { apiClient } from '@/lib/api-client'
import { createCrudApi, BaseListParams, BaseListResponse } from './base'
import { Menu } from '@/types/models'

export interface Periode {
  id: number  // Alias for menyperiodeid to satisfy CrudItem constraint
  menyperiodeid: number
  ukenr: number | null
  fradato: string | null
  tildato: string | null
}

export interface PeriodeWithMenus extends Periode {
  menus: Menu[]
}

export interface PeriodeListParams extends BaseListParams {
  page?: number
  page_size?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type PeriodeListResponse = BaseListResponse<Periode>

// CreateData type
export type PeriodeCreateData = {
  ukenr?: number | null
  fradato?: string | null
  tildato?: string | null
}

// Bruk generisk CRUD factory
export const perioderApi = {
  ...createCrudApi<Periode, PeriodeCreateData, PeriodeListParams>({
    endpoint: '/v1/periode'
  }),

  // Ekstra metoder spesifikke for perioder
  async getActive(): Promise<PeriodeWithMenus[]> {
    const response = await apiClient.get<PeriodeWithMenus[]>('/v1/periode/active')
    return response.data
  },

  async getWithMenus(id: number): Promise<PeriodeWithMenus> {
    const response = await apiClient.get<PeriodeWithMenus>(`/v1/periode/${id}`)
    return response.data
  },

  async bulkDelete(ids: number[]): Promise<{ message: string }> {
    const response = await apiClient.post('/v1/periode/bulk-delete', ids)
    return response.data
  }
}
