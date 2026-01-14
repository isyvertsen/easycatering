/**
 * Picking workflow API client
 */
import { apiClient } from '@/lib/api-client'

// Ordrestatus IDs from tblordrestatus
export const ORDRESTATUS_PLUKKLISTE = 25  // Klar til plukking
export const ORDRESTATUS_PLUKKET = 30     // Plukket

export interface OrdreForPlukking {
  ordreid: number
  kundenavn?: string
  kundeid?: number
  kundegruppe_navn?: string
  kundegruppe_id?: number
  leveringsdato?: string
  ordredato?: string
  plukket_dato?: string
  plukket_av_navn?: string
  pakkseddel_skrevet?: string
  antall_produkter: number
  ordrestatusid?: number
  ordrestatus_navn?: string
}

export interface PlukkingListResponse {
  items: OrdreForPlukking[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface PlukkingStats {
  total_ordrer: number
  klar_til_plukking: number
  plukket: number
}

export interface Kundegruppe {
  gruppeid: number
  gruppe: string
}

export interface PlukkingListParams {
  page?: number
  page_size?: number
  kundegruppe_id?: number
  ordrestatusid?: number
  leveringsdato_fra?: string
  leveringsdato_til?: string
  include_cancelled?: boolean
}

/**
 * Get list of orders for picking
 */
export async function getPlukkingList(params: PlukkingListParams = {}): Promise<PlukkingListResponse> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const response = await apiClient.get<PlukkingListResponse>(
    `/v1/plukking/?${searchParams.toString()}`
  )
  return response.data
}

/**
 * Get picking statistics
 */
export async function getPlukkingStats(params: Partial<PlukkingListParams> = {}): Promise<PlukkingStats> {
  const searchParams = new URLSearchParams()

  if (params.kundegruppe_id) searchParams.append('kundegruppe_id', String(params.kundegruppe_id))
  if (params.leveringsdato_fra) searchParams.append('leveringsdato_fra', params.leveringsdato_fra)
  if (params.leveringsdato_til) searchParams.append('leveringsdato_til', params.leveringsdato_til)

  const response = await apiClient.get<PlukkingStats>(
    `/v1/plukking/stats?${searchParams.toString()}`
  )
  return response.data
}

/**
 * Get customer groups for filtering
 */
export async function getKundegrupperForPlukking(): Promise<Kundegruppe[]> {
  const response = await apiClient.get<Kundegruppe[]>('/v1/plukking/kundegrupper')
  return response.data
}

/**
 * Update order status for an order
 */
export async function updateOrdrestatus(
  ordreId: number,
  ordrestatusid: number
): Promise<{ ordreid: number; ordrestatusid: number; ordrestatus_navn?: string; message: string }> {
  const response = await apiClient.put(`/v1/plukking/${ordreId}/status`, {
    ordrestatusid,
  })
  return response.data
}

/**
 * Mark packing slip as printed
 */
export async function markerPakkseddelSkrevet(
  ordreId: number
): Promise<{ message: string; tidspunkt: string }> {
  const response = await apiClient.post(`/v1/plukking/${ordreId}/marker-pakkseddel`)
  return response.data
}

/**
 * Bulk update order status
 */
export async function bulkUpdateOrdrestatus(
  ordreIds: number[],
  ordrestatusid: number
): Promise<{ message: string; updated_count: number }> {
  const response = await apiClient.post(`/v1/plukking/bulk-update-status?ordrestatusid=${ordrestatusid}`, ordreIds)
  return response.data
}

// Pick registration types
export interface PickDetailLine {
  produktid: number
  unik: number
  produktnavn?: string
  antall: number
  plukket_antall?: number
  enhet?: string
}

export interface PickDetailsResponse {
  ordreid: number
  kundenavn?: string
  leveringsdato?: string
  plukkstatus?: string
  lines: PickDetailLine[]
}

export interface PickedLineInput {
  produktid: number
  unik: number
  plukket_antall: number
}

/**
 * Get order details for pick registration
 */
export async function getPickDetails(ordreId: number): Promise<PickDetailsResponse> {
  const response = await apiClient.get<PickDetailsResponse>(`/v1/plukking/${ordreId}/plukkdetaljer`)
  return response.data
}

/**
 * Register picked quantities for an order
 */
export async function registerPickQuantities(
  ordreId: number,
  lines: PickedLineInput[]
): Promise<{ message: string; updated_count: number; ordreid: number; plukkstatus: string }> {
  const response = await apiClient.post(`/v1/plukking/${ordreId}/registrer-plukk`, { lines })
  return response.data
}

// AI Scan types
export interface ScannedLine {
  produktid: number
  unik: number
  plukket_antall: number
}

export interface ScanPickListResponse {
  success: boolean
  lines: ScannedLine[]
  confidence: number
  notes: string
  error?: string
}

/**
 * Scan a pick list image using AI Vision
 */
export async function scanPickList(
  ordreId: number,
  imageBase64: string
): Promise<ScanPickListResponse> {
  const response = await apiClient.post<ScanPickListResponse>(
    `/v1/plukking/${ordreId}/scan-plukkliste`,
    { image_base64: imageBase64 }
  )
  return response.data
}
