import { apiClient } from '@/lib/api-client'

export interface ActivityLog {
  id: number
  user_id: number | null
  user_email: string | null
  user_name: string | null
  action: string
  resource_type: string
  resource_id: string | null
  http_method: string | null
  endpoint: string | null
  ip_address: string | null
  response_status: number | null
  response_time_ms: number | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface ActivityLogStats {
  total_requests: number
  total_errors: number
  error_rate: number
  avg_response_time_ms: number
  requests_by_action: Record<string, number>
  requests_by_resource: Record<string, number>
  requests_by_user: Array<{
    user_id: number
    email: string
    name: string
    count: number
  }>
  requests_over_time: Array<{
    period: string
    count: number
  }>
}

export interface ActivityLogListResponse {
  items: ActivityLog[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ActivityLogListParams {
  page?: number
  page_size?: number
  user_id?: number
  action?: string
  resource_type?: string
  response_status?: number
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export const activityLogsApi = {
  list: async (params?: ActivityLogListParams): Promise<ActivityLogListResponse> => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/activity-logs/?${queryString}` : '/v1/activity-logs/'
    const response = await apiClient.get(url)
    return response.data
  },

  getStats: async (dateFrom?: string, dateTo?: string): Promise<ActivityLogStats> => {
    const params = new URLSearchParams()
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    const queryString = params.toString()
    const url = queryString ? `/v1/activity-logs/stats?${queryString}` : '/v1/activity-logs/stats'
    const response = await apiClient.get(url)
    return response.data
  },

  getActions: async (): Promise<string[]> => {
    const response = await apiClient.get('/v1/activity-logs/actions')
    return response.data
  },

  getResourceTypes: async (): Promise<string[]> => {
    const response = await apiClient.get('/v1/activity-logs/resource-types')
    return response.data
  },

  exportCsv: async (params?: ActivityLogListParams): Promise<void> => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString())
        }
      })
    }
    const queryString = queryParams.toString()
    const url = queryString ? `/v1/activity-logs/export?${queryString}` : '/v1/activity-logs/export'

    const response = await apiClient.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `aktivitetslogg-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(downloadUrl)
  },

  cleanupOldLogs: async (daysToKeep: number = 90): Promise<{ message: string }> => {
    const response = await apiClient.post(`/v1/activity-logs/cleanup?days_to_keep=${daysToKeep}`)
    return response.data
  },
}
