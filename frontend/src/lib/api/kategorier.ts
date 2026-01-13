import { apiClient } from '@/lib/api-client'
import { createCrudApi, BaseListParams, BaseListResponse } from './base'

export interface Kategori {
  id: number  // Alias for kategoriid to satisfy CrudItem constraint
  kategoriid: number
  kategori: string
  beskrivelse: string | null
}

export interface KategoriListParams extends BaseListParams {
  page?: number
  page_size?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type KategoriListResponse = BaseListResponse<Kategori>

// CreateData type
export type KategoriCreateData = {
  kategori: string
  beskrivelse?: string | null
}

// Bruk generisk CRUD factory
export const kategorierApi = createCrudApi<Kategori, KategoriCreateData, KategoriListParams>({
  endpoint: '/v1/kategorier'
})
