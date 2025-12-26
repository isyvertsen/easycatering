/**
 * API client for Label Templates
 */
import { apiClient } from '@/lib/api-client'
import type {
  LabelTemplate,
  LabelTemplateCreate,
  LabelTemplateUpdate,
  TemplateShare,
  TemplateShareCreate,
  PrintHistoryItem,
  PrintHistoryCreate,
  PreviewLabelRequest,
  PreviewLabelResponse,
  GenerateLabelRequest,
  BatchGenerateRequest,
  TableColumn,
  DataSourceResult,
  PdfmeTemplate,
} from '@/types/labels'

export interface LabelTemplateListParams {
  skip?: number
  limit?: number
  include_global?: boolean
  search?: string
}

export const labelTemplatesApi = {
  // ============ Templates ============

  /**
   * Get all label templates accessible to the current user
   */
  list: async (params?: LabelTemplateListParams): Promise<LabelTemplate[]> => {
    const queryParams = new URLSearchParams()

    if (params?.skip !== undefined) {
      queryParams.append('skip', params.skip.toString())
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString())
    }
    if (params?.include_global !== undefined) {
      queryParams.append('include_global', params.include_global.toString())
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }

    const response = await apiClient.get(`/v1/label-templates/?${queryParams}`)
    return response.data
  },

  /**
   * Get a single template by ID
   */
  get: async (id: number): Promise<LabelTemplate> => {
    const response = await apiClient.get(`/v1/label-templates/${id}`)
    return response.data
  },

  /**
   * Create a new template
   */
  create: async (data: LabelTemplateCreate): Promise<LabelTemplate> => {
    const response = await apiClient.post('/v1/label-templates/', data)
    return response.data
  },

  /**
   * Update a template
   */
  update: async (id: number, data: LabelTemplateUpdate): Promise<LabelTemplate> => {
    const response = await apiClient.put(`/v1/label-templates/${id}`, data)
    return response.data
  },

  /**
   * Delete a template
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/label-templates/${id}`)
  },

  // ============ Sharing ============

  /**
   * Share a template with another user
   */
  share: async (templateId: number, data: TemplateShareCreate): Promise<TemplateShare> => {
    const response = await apiClient.post(`/v1/label-templates/${templateId}/share`, data)
    return response.data
  },

  /**
   * Get all shares for a template
   */
  getShares: async (templateId: number): Promise<TemplateShare[]> => {
    const response = await apiClient.get(`/v1/label-templates/${templateId}/shares`)
    return response.data
  },

  /**
   * Remove a share
   */
  removeShare: async (templateId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/v1/label-templates/${templateId}/shares/${userId}`)
  },

  // ============ Print History ============

  /**
   * Log a print event
   */
  logPrint: async (data: PrintHistoryCreate): Promise<PrintHistoryItem> => {
    const response = await apiClient.post('/v1/label-templates/print-history', data)
    return response.data
  },

  /**
   * Get print history
   */
  getPrintHistory: async (templateId?: number): Promise<PrintHistoryItem[]> => {
    const params = templateId ? `?template_id=${templateId}` : ''
    const response = await apiClient.get(`/v1/label-templates/print-history/${params}`)
    return response.data
  },

  // ============ Data Sources ============

  /**
   * Get available tables for data binding
   */
  getTables: async (): Promise<string[]> => {
    const response = await apiClient.get('/v1/label-templates/sources/tables')
    return response.data
  },

  /**
   * Get columns for a table
   */
  getColumns: async (table: string): Promise<TableColumn[]> => {
    const response = await apiClient.get(`/v1/label-templates/sources/columns?table=${table}`)
    return response.data
  },

  /**
   * Search data in a source table
   */
  searchData: async (
    table: string,
    column: string,
    search: string = ''
  ): Promise<DataSourceResult[]> => {
    const params = new URLSearchParams({ table, column, search })
    const response = await apiClient.get(`/v1/label-templates/sources/data?${params}`)
    return response.data
  },
}

export const labelsApi = {
  // ============ PDF Generation ============

  /**
   * Generate a preview of a label (returns base64 PDF)
   */
  preview: async (data: PreviewLabelRequest): Promise<PreviewLabelResponse> => {
    const response = await apiClient.post('/v1/labels/preview', data)
    return response.data
  },

  /**
   * Generate a PDF for printing (returns blob)
   */
  generate: async (data: GenerateLabelRequest): Promise<Blob> => {
    const response = await apiClient.post('/v1/labels/generate', data, {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Generate batch labels (returns blob)
   */
  batch: async (data: BatchGenerateRequest): Promise<Blob> => {
    const response = await apiClient.post('/v1/labels/batch', data, {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Preview a saved template with test data
   */
  previewTemplate: async (
    templateId: number,
    testInputs: Record<string, unknown>
  ): Promise<PreviewLabelResponse> => {
    const response = await apiClient.post(
      `/v1/labels/preview-template?template_id=${templateId}`,
      testInputs
    )
    return response.data
  },
}
