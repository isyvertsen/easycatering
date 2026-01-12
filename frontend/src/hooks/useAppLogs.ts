/**
 * React Query hooks for application logs
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppLogs,
  getAppLog,
  getAppLogStats,
  getLogLevels,
  getLoggerNames,
  getExceptionTypes,
  exportAppLogs,
  cleanupOldLogs,
  AppLogListParams,
} from '@/lib/api/app-logs'
import { toast } from '@/hooks/use-toast'

const QUERY_KEYS = {
  appLogs: 'app-logs',
  appLogStats: 'app-log-stats',
  logLevels: 'log-levels',
  loggerNames: 'logger-names',
  exceptionTypes: 'exception-types',
}

/**
 * Hook to fetch paginated application logs
 */
export function useAppLogsList(params: AppLogListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.appLogs, params],
    queryFn: () => getAppLogs(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

/**
 * Hook to fetch a single application log
 */
export function useAppLog(id: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.appLogs, id],
    queryFn: () => getAppLog(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch application log statistics
 */
export function useAppLogStats(days: number = 7) {
  return useQuery({
    queryKey: [QUERY_KEYS.appLogStats, days],
    queryFn: () => getAppLogStats(days),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

/**
 * Hook to fetch all log levels
 */
export function useLogLevels() {
  return useQuery({
    queryKey: [QUERY_KEYS.logLevels],
    queryFn: getLogLevels,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch all logger names
 */
export function useLoggerNames() {
  return useQuery({
    queryKey: [QUERY_KEYS.loggerNames],
    queryFn: getLoggerNames,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch all exception types
 */
export function useExceptionTypes() {
  return useQuery({
    queryKey: [QUERY_KEYS.exceptionTypes],
    queryFn: getExceptionTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to export application logs
 */
export function useExportAppLogs() {
  return useMutation({
    mutationFn: async (params: AppLogListParams) => {
      const blob = await exportAppLogs(params)
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `app_logs_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })
}

/**
 * Hook to cleanup old logs
 */
export function useCleanupOldLogs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cleanupOldLogs,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.appLogs] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.appLogStats] })
      toast({
        title: 'Logger slettet',
        description: data.message,
      })
    },
    onError: () => {
      toast({
        title: 'Sletting feilet',
        description: 'Kunne ikke slette gamle logger',
        variant: 'destructive',
      })
    },
  })
}
