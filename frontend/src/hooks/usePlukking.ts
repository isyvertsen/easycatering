/**
 * React Query hooks for picking workflow
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPlukkingList,
  getPlukkingStats,
  getKundegrupperForPlukking,
  updateOrdrestatus,
  markerPakkseddelSkrevet,
  bulkUpdateOrdrestatus,
  PlukkingListParams,
} from '@/lib/api/plukking'

const PLUKKING_KEYS = {
  all: ['plukking'] as const,
  lists: () => [...PLUKKING_KEYS.all, 'list'] as const,
  list: (params: PlukkingListParams) => [...PLUKKING_KEYS.lists(), params] as const,
  stats: (params?: Partial<PlukkingListParams>) => [...PLUKKING_KEYS.all, 'stats', params] as const,
  kundegrupper: () => [...PLUKKING_KEYS.all, 'kundegrupper'] as const,
}

/**
 * Hook to get picking list with filters
 */
export function usePlukkingList(params: PlukkingListParams = {}) {
  return useQuery({
    queryKey: PLUKKING_KEYS.list(params),
    queryFn: () => getPlukkingList(params),
  })
}

/**
 * Hook to get picking statistics
 */
export function usePlukkingStats(params: Partial<PlukkingListParams> = {}) {
  return useQuery({
    queryKey: PLUKKING_KEYS.stats(params),
    queryFn: () => getPlukkingStats(params),
  })
}

/**
 * Hook to get customer groups for filtering
 */
export function useKundegrupperForPlukking() {
  return useQuery({
    queryKey: PLUKKING_KEYS.kundegrupper(),
    queryFn: getKundegrupperForPlukking,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to update order status
 */
export function useUpdateOrdrestatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ordreId, ordrestatusid }: { ordreId: number; ordrestatusid: number }) =>
      updateOrdrestatus(ordreId, ordrestatusid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLUKKING_KEYS.all })
    },
  })
}

/**
 * Hook to mark packing slip as printed
 */
export function useMarkerPakkseddelSkrevet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ordreId: number) => markerPakkseddelSkrevet(ordreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLUKKING_KEYS.all })
    },
  })
}

/**
 * Hook for bulk status update
 */
export function useBulkUpdateOrdrestatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ordreIds, ordrestatusid }: { ordreIds: number[]; ordrestatusid: number }) =>
      bulkUpdateOrdrestatus(ordreIds, ordrestatusid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLUKKING_KEYS.all })
    },
  })
}
