import { apiClient } from '@/lib/api-client'

/**
 * System Settings API Client
 *
 * Administrer systeminnstillinger (kun admin)
 */

export interface SystemSetting {
  key: string
  value: unknown
  description?: string
  updated_at?: string
  updated_by?: number
}

export interface SystemSettingsListResponse {
  items: SystemSetting[]
  total: number
}

export interface WebshopCategoryOrderResponse {
  category_ids: number[]
}

export interface WebshopCategoryOrderUpdate {
  category_ids: number[]
}

export interface FeatureFlags {
  ai_recipe_validation: boolean
  ai_dish_name_generator: boolean
  ai_label_generator: boolean
  ai_chatbot: boolean
}

export const systemSettingsApi = {
  /**
   * Hent alle systeminnstillinger (kun admin)
   *
   * Backend endpoint: GET /api/v1/system-settings/
   */
  getAll: async (): Promise<SystemSettingsListResponse> => {
    const response = await apiClient.get('/v1/system-settings/')
    return response.data
  },

  /**
   * Hent webshop kategori-rekkefølge
   *
   * Backend endpoint: GET /api/v1/system-settings/webshop-category-order
   */
  getWebshopCategoryOrder: async (): Promise<WebshopCategoryOrderResponse> => {
    const response = await apiClient.get('/v1/system-settings/webshop-category-order')
    return response.data
  },

  /**
   * Oppdater webshop kategori-rekkefølge (kun admin)
   *
   * Backend endpoint: PUT /api/v1/system-settings/webshop-category-order
   */
  updateWebshopCategoryOrder: async (categoryIds: number[]): Promise<WebshopCategoryOrderResponse> => {
    const response = await apiClient.put('/v1/system-settings/webshop-category-order', {
      category_ids: categoryIds
    })
    return response.data
  },

  /**
   * Hent AI feature flags status
   *
   * Backend endpoint: GET /api/v1/system-settings/feature-flags
   */
  getFeatureFlags: async (): Promise<FeatureFlags> => {
    const response = await apiClient.get('/v1/system-settings/feature-flags')
    return response.data
  }
}
