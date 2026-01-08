import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Periode, PeriodeWithMenus, perioderApi, PeriodeCreateData, PeriodeListParams } from '@/lib/api/perioder'
import { createEntityCrudHooks } from './useEntityCrud'
import { toast } from '@/hooks/use-toast'

// Lag type-safe hooks med konsistent error handling og toast-meldinger
const hooks = createEntityCrudHooks<Periode, PeriodeCreateData, PeriodeListParams>({
  entityName: 'perioder',
  displayName: {
    singular: 'Periode',
    plural: 'Perioder'
  },
  api: perioderApi,
  getId: (periode) => periode.menyperiodeid,
  getDisplayName: (periode) => periode.ukenr ? `Uke ${periode.ukenr}` : `Periode ${periode.menyperiodeid}`
})

// Eksporter standard CRUD hooks
export const usePerioderList = hooks.useList
export const usePeriode = hooks.useGet
export const useCreatePeriode = hooks.useCreate
export const useUpdatePeriode = hooks.useUpdate
export const useDeletePeriode = hooks.useDelete

// Bulk delete hook
export function useBulkDeletePerioder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => perioderApi.bulkDelete(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['perioder'] })
      toast({
        title: 'Slettet',
        description: `${ids.length} perioder ble slettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette perioder',
        variant: 'destructive',
      })
    },
  })
}

// Ekstra hooks for perioder
export function useActivePerioder() {
  return useQuery<PeriodeWithMenus[]>({
    queryKey: ['perioder', 'active'],
    queryFn: () => perioderApi.getActive(),
  })
}

export function usePeriodeWithMenus(id: number | undefined) {
  return useQuery<PeriodeWithMenus>({
    queryKey: ['perioder', id, 'menus'],
    queryFn: () => perioderApi.getWithMenus(id!),
    enabled: !!id,
  })
}
