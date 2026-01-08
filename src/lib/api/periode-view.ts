import { apiClient } from '@/lib/api-client'
import {
  PeriodeView,
  PeriodeViewListResponse,
  KopierPeriodeRequest,
  KopierPeriodeResponse,
  BulkMenyerRequest,
  BulkMenyerResponse,
  TilgjengeligMeny
} from '@/types/periode-view'

export interface PeriodeViewListParams {
  page?: number
  page_size?: number
  fra_dato?: string
  til_dato?: string
}

export interface OpprettPeriodeUkeRequest {
  aar: number
  ukenr: number
}

export interface OpprettPeriodeUkeResponse {
  menyperiodeid: number
  ukenr: number
  fradato: string
  tildato: string
}

export interface SistePeriodeResponse {
  menyperiodeid: number
  ukenr: number
  fradato: string
  tildato: string
}

export interface NestePeriodeForslagResponse {
  aar: number
  ukenr: number
  fradato: string
  tildato: string
  siste_periode: {
    menyperiodeid: number
    ukenr: number
    tildato: string
  } | null
}

export const periodeViewApi = {
  /**
   * Get paginated list of periods with complete hierarchy
   */
  async list(params?: PeriodeViewListParams): Promise<PeriodeViewListResponse> {
    const response = await apiClient.get<PeriodeViewListResponse>('/v1/periode-view/', { params })
    return response.data
  },

  /**
   * Get hierarchical view of a single period with all menu groups, menus, and products
   */
  async getView(id: number): Promise<PeriodeView> {
    const response = await apiClient.get<PeriodeView>(`/v1/periode-view/${id}`)
    return response.data
  },

  /**
   * Get available menus that can be added to a period (not already assigned)
   */
  async getTilgjengeligeMenyer(periodeId: number, menygruppeId?: number): Promise<TilgjengeligMeny[]> {
    const params = menygruppeId ? { menygruppe_id: menygruppeId } : undefined
    const response = await apiClient.get<TilgjengeligMeny[]>(
      `/v1/periode-view/${periodeId}/tilgjengelige-menyer`,
      { params }
    )
    return response.data
  },

  /**
   * Copy a period to create a new one with the same menus
   */
  async kopierPeriode(data: KopierPeriodeRequest): Promise<KopierPeriodeResponse> {
    const response = await apiClient.post<KopierPeriodeResponse>('/v1/periode-view/kopier', data)
    return response.data
  },

  /**
   * Bulk add menus to a period
   */
  async tilordneMenyer(periodeId: number, menyIds: number[]): Promise<BulkMenyerResponse> {
    const data: BulkMenyerRequest = { periode_id: periodeId, meny_ids: menyIds }
    const response = await apiClient.post<BulkMenyerResponse>(
      `/v1/periode-view/${periodeId}/bulk-tilordne`,
      data
    )
    return response.data
  },

  /**
   * Bulk remove menus from a period
   */
  async fjernMenyer(periodeId: number, menyIds: number[]): Promise<BulkMenyerResponse> {
    const data: BulkMenyerRequest = { periode_id: periodeId, meny_ids: menyIds }
    const response = await apiClient.delete<BulkMenyerResponse>(
      `/v1/periode-view/${periodeId}/bulk-fjern`,
      { data }
    )
    return response.data
  },

  /**
   * Create a new menu directly in a period
   */
  async opprettMenyIPeriode(periodeId: number, menyData: { beskrivelse: string; menygruppe: number }): Promise<{ menyid: number }> {
    const response = await apiClient.post<{ menyid: number }>(
      `/v1/periode-view/${periodeId}/menyer`,
      menyData
    )
    return response.data
  },

  /**
   * Create a new period by year and week number
   * Backend automatically calculates Monday-Sunday dates
   */
  async opprettPeriodeUke(data: OpprettPeriodeUkeRequest): Promise<OpprettPeriodeUkeResponse> {
    const response = await apiClient.post<OpprettPeriodeUkeResponse>(
      '/v1/periode/opprett-uke',
      data
    )
    return response.data
  },

  /**
   * Get the most recent period
   */
  async getSistePeriode(): Promise<SistePeriodeResponse> {
    const response = await apiClient.get<SistePeriodeResponse>('/v1/periode/siste')
    return response.data
  },

  /**
   * Get suggestion for the next period (next available week after last period)
   */
  async getNestePeriodeForslag(): Promise<NestePeriodeForslagResponse> {
    const response = await apiClient.get<NestePeriodeForslagResponse>('/v1/periode/neste-forslag')
    return response.data
  }
}
