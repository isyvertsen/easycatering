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

export interface UserKundegruppeFilterResponse {
  gruppe_ids: number[]
}

export interface WebshopOnlyRoleResponse {
  role: string | null
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
  },

  /**
   * Hent kundegruppe-filter for bruker-tilknytning
   *
   * Backend endpoint: GET /api/v1/system-settings/user-kundegruppe-filter
   */
  getUserKundegruppeFilter: async (): Promise<UserKundegruppeFilterResponse> => {
    const response = await apiClient.get('/v1/system-settings/user-kundegruppe-filter')
    return response.data
  },

  /**
   * Oppdater kundegruppe-filter for bruker-tilknytning (kun admin)
   *
   * Backend endpoint: PUT /api/v1/system-settings/user-kundegruppe-filter
   */
  updateUserKundegruppeFilter: async (gruppeIds: number[]): Promise<UserKundegruppeFilterResponse> => {
    const response = await apiClient.put('/v1/system-settings/user-kundegruppe-filter', {
      gruppe_ids: gruppeIds
    })
    return response.data
  },

  /**
   * Hent rollen som kun har tilgang til webshop
   *
   * Backend endpoint: GET /api/v1/system-settings/webshop-only-role
   */
  getWebshopOnlyRole: async (): Promise<WebshopOnlyRoleResponse> => {
    const response = await apiClient.get('/v1/system-settings/webshop-only-role')
    return response.data
  },

  /**
   * Oppdater rollen som kun har tilgang til webshop (kun admin)
   *
   * Backend endpoint: PUT /api/v1/system-settings/webshop-only-role
   */
  updateWebshopOnlyRole: async (role: string | null): Promise<WebshopOnlyRoleResponse> => {
    const response = await apiClient.put('/v1/system-settings/webshop-only-role', {
      role: role
    })
    return response.data
  }
}
