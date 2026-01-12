import { useQuery, useMutation } from '@tanstack/react-query'
import { activityLogsApi, ActivityLogListParams } from '@/lib/api/activity-logs'
import { toast } from '@/hooks/use-toast'

export function useActivityLogsList(params?: ActivityLogListParams) {
  return useQuery({
    queryKey: ['activity-logs', 'list', params],
    queryFn: () => activityLogsApi.list(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export function useActivityLogsStats(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['activity-logs', 'stats', dateFrom, dateTo],
    queryFn: () => activityLogsApi.getStats(dateFrom, dateTo),
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useActivityLogActions() {
  return useQuery({
    queryKey: ['activity-logs', 'actions'],
    queryFn: () => activityLogsApi.getActions(),
    staleTime: Infinity,
  })
}

export function useActivityLogResourceTypes() {
  return useQuery({
    queryKey: ['activity-logs', 'resource-types'],
    queryFn: () => activityLogsApi.getResourceTypes(),
    staleTime: 60000,
  })
}

export function useExportActivityLogs() {
  return useMutation({
    mutationFn: (params?: ActivityLogListParams) => activityLogsApi.exportCsv(params),
    onSuccess: () => {
      toast({
        title: 'Eksport fullfort',
        description: 'Aktivitetsloggen er lastet ned som CSV',
      })
    },
    onError: () => {
      toast({
        title: 'Eksport feilet',
        description: 'Kunne ikke eksportere aktivitetsloggen',
        variant: 'destructive',
      })
    },
  })
}
