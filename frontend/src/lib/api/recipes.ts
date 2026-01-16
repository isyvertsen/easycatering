import { apiClient } from '@/lib/api-client'
import { Recipe, RecipeIngredient } from '@/types/models'

export interface RecipeListParams {
  skip?: number
  limit?: number
  gruppeid?: number
  search?: string
}

export interface RecipeListResponse {
  items: Recipe[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface RecipeValidationWarning {
  ingredient: string
  amount_per_portion: number
  unit: string
  reason: string
  severity: 'high' | 'medium' | 'low'
}

export interface RecipeValidationResult {
  is_valid: boolean
  warnings: RecipeValidationWarning[]
  summary: string
}

export const recipesApi = {
  list: async (params?: RecipeListParams): Promise<RecipeListResponse> => {
    const queryParams = new URLSearchParams()
    
    const skip = params?.skip || 0
    const limit = params?.limit || 20
    
    queryParams.append('skip', skip.toString())
    queryParams.append('limit', limit.toString())
    
    if (params?.gruppeid) {
      queryParams.append('gruppeid', params.gruppeid.toString())
    }
    
    if (params?.search) {
      queryParams.append('search', params.search)
    }
    
    const response = await apiClient.get(`/v1/oppskrifter/?${queryParams}`)
    return response.data
  },

  get: async (id: number): Promise<Recipe> => {
    const response = await apiClient.get(`/v1/oppskrifter/${id}`)
    return response.data
  },

  create: async (data: Omit<Recipe, 'kalkylekode'>): Promise<Recipe> => {
    const response = await apiClient.post('/v1/oppskrifter/', data)
    return response.data
  },

  update: async (id: number, data: Partial<Recipe>): Promise<Recipe> => {
    const response = await apiClient.put(`/v1/oppskrifter/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/oppskrifter/${id}`)
  },

  // Get recipe ingredients
  getIngredients: async (recipeId: number): Promise<RecipeIngredient[]> => {
    // Ingredients are included in the main recipe endpoint
    const response = await apiClient.get<Recipe>(`/v1/oppskrifter/${recipeId}`)
    return response.data.detaljer || []
  },

  // Add ingredient to recipe
  addIngredient: async (recipeId: number, ingredient: Omit<RecipeIngredient, 'tblkalkyledetaljerid' | 'kalkylekode'>): Promise<RecipeIngredient> => {
    const response = await apiClient.post(`/v1/oppskrifter/${recipeId}/detaljer`, ingredient)
    return response.data
  },

  // Update ingredient
  updateIngredient: async (recipeId: number, ingredientId: number, data: Partial<RecipeIngredient>): Promise<RecipeIngredient> => {
    const response = await apiClient.put(`/v1/oppskrifter/${recipeId}/detaljer/${ingredientId}`, data)
    return response.data
  },

  // Delete ingredient
  deleteIngredient: async (recipeId: number, ingredientId: number): Promise<void> => {
    await apiClient.delete(`/v1/oppskrifter/${recipeId}/detaljer/${ingredientId}`)
  },

  // Calculate recipe quantities for a given number of portions
  calculateRecipe: async (recipeId: number, antallporsjoner: number): Promise<any> => {
    const response = await apiClient.post(`/v1/oppskrifter/${recipeId}/kalkuler`, {
      antallporsjoner
    })
    return response.data
  },

  // Download recipe report as PDF
  downloadRecipeReport: async (recipeId: number, antallporsjoner?: number): Promise<Blob> => {
    const params = new URLSearchParams()
    if (antallporsjoner) {
      params.append('antallporsjoner', antallporsjoner.toString())
    }

    const response = await apiClient.get(`/v1/oppskrifter/${recipeId}/rapport-pdf?${params}`, {
      responseType: 'blob'
    })

    return response.data
  },

  // Validate recipe with AI before PDF generation
  validateRecipe: async (recipeId: number, antallporsjoner?: number): Promise<RecipeValidationResult> => {
    const response = await apiClient.post(`/v1/oppskrifter/${recipeId}/validate`,
      antallporsjoner ? { antallporsjoner } : {}
    )
    return response.data
  }
}