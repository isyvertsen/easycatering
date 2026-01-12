import { apiClient } from '@/lib/api-client'
import { Produkt } from './produkter'

export interface SwapProduktResponse {
  message: string
  meny_id: number
  old_produkt_id: number
  new_produkt_id: number
  new_produkt_navn: string
}

export interface ProduktSearchParams {
  sok?: string
  limit?: number
  kategori?: number
  leverandorIds?: string  // Comma-separated list of leverandor IDs
}

/**
 * Get leverandor IDs from environment variable
 * Returns undefined if not configured
 */
export function getMenySwapLeverandorIds(): string | undefined {
  const ids = process.env.NEXT_PUBLIC_MENY_SWAP_LEVERANDOR_IDS
  return ids && ids.trim() ? ids.trim() : undefined
}

export const menyProduktApi = {
  /**
   * Swap a product in a menu with another product
   */
  async swapProdukt(
    menyId: number,
    oldProduktId: number,
    newProduktId: number
  ): Promise<SwapProduktResponse> {
    const response = await apiClient.put<SwapProduktResponse>(
      `/v1/meny-produkt/swap?meny_id=${menyId}&old_produkt_id=${oldProduktId}&new_produkt_id=${newProduktId}`
    )
    return response.data
  },

  /**
   * Search for products (for the swap dropdown)
   * Automatically applies leverandor filter from env if configured
   */
  async searchProdukter(params?: ProduktSearchParams): Promise<Produkt[]> {
    const queryParams = new URLSearchParams()

    if (params?.sok) queryParams.append('sok', params.sok)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.kategori) queryParams.append('kategori', params.kategori.toString())

    // Apply leverandor filter from params or environment
    const leverandorIds = params?.leverandorIds || getMenySwapLeverandorIds()
    if (leverandorIds) {
      queryParams.append('leverandor_ids', leverandorIds)
    }

    // Only get active products
    queryParams.append('aktiv', 'true')

    const response = await apiClient.get<{ items: Produkt[] }>(
      `/v1/produkter/?${queryParams.toString()}`
    )
    return response.data.items || []
  }
}
