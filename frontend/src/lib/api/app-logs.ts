/**
 * Application logs API client
 */
import { apiClient } from '@/lib/api-client'

export interface AppLog {
  id: number
  level: string
  logger_name?: string
  message: string
  exception_type?: string
  exception_message?: string
  traceback?: string
  module?: string
  function_name?: string
  line_number?: number
  path?: string
  request_id?: string
  user_id?: number
  user_email?: string
  ip_address?: string
  endpoint?: string
  http_method?: string
  extra?: Record<string, unknown>
  created_at: string
}

export interface AppLogListResponse {
  items: AppLog[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AppLogStats {
  total_logs: number
  error_count: number
  warning_count: number
  info_count: number
  debug_count: number
  logs_by_level: Record<string, number>
  logs_by_logger: Record<string, number>
  top_exceptions: Array<{
    exception_type: string
    exception_message?: string
    count: number
    last_occurrence?: string
  }>
  logs_over_time: Array<{
    period: string
    count: number
  }>
}

export interface AppLogListParams {
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  level?: string
  logger_name?: string
  exception_type?: string
  date_from?: string
  date_to?: string
  search?: string
}

/**
 * Get paginated application logs
 */
export async function getAppLogs(params: AppLogListParams = {}): Promise<AppLogListResponse> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const response = await apiClient.get<AppLogListResponse>(
    `/v1/app-logs/?${searchParams.toString()}`
  )
  return response.data
}

/**
 * Get a single application log by ID
 */
export async function getAppLog(id: number): Promise<AppLog> {
  const response = await apiClient.get<AppLog>(`/v1/app-logs/${id}`)
  return response.data
}

/**
 * Get application log statistics
 */
export async function getAppLogStats(days: number = 7): Promise<AppLogStats> {
  const response = await apiClient.get<AppLogStats>(`/v1/app-logs/stats?days=${days}`)
  return response.data
}

/**
 * Get all log levels
 */
export async function getLogLevels(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/v1/app-logs/levels')
  return response.data
}

/**
 * Get all logger names
 */
export async function getLoggerNames(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/v1/app-logs/loggers')
  return response.data
}

/**
 * Get all exception types
 */
export async function getExceptionTypes(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/v1/app-logs/exception-types')
  return response.data
}

/**
 * Export application logs as CSV
 */
export async function exportAppLogs(params: AppLogListParams = {}): Promise<Blob> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const response = await apiClient.get(`/v1/app-logs/export?${searchParams.toString()}`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Cleanup old logs
 */
export async function cleanupOldLogs(days: number = 90): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    `/v1/app-logs/cleanup?days=${days}`
  )
  return response.data
}
