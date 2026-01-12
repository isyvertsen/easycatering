import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Leverandor } from '@/types/models'
import { leverandorerApi, LeverandorCreateData, LeverandorListParams } from '@/lib/api/leverandorer'
import { createEntityCrudHooks } from './useEntityCrud'
import { toast } from '@/hooks/use-toast'

// Lag type-safe hooks med konsistent error handling og toast-meldinger
const hooks = createEntityCrudHooks<Leverandor, LeverandorCreateData, LeverandorListParams>({
  entityName: 'leverandorer',
  displayName: {
    singular: 'Leverandør',
    plural: 'Leverandører'
  },
  api: leverandorerApi,
  getId: (leverandor) => leverandor.leverandorid,
  getDisplayName: (leverandor) => leverandor.leverandornavn || 'Leverandør'
})

// Eksporter hooks med forventede navn
export const useLeverandorerList = hooks.useList
export const useLeverandor = hooks.useGet
export const useCreateLeverandor = hooks.useCreate
export const useUpdateLeverandor = hooks.useUpdate
export const useDeleteLeverandor = hooks.useDelete

// Bulk delete hook
export function useBulkDeleteLeverandorer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => leverandorerApi.bulkDelete(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['leverandorer'] })
      toast({
        title: 'Deaktivert',
        description: `${ids.length} leverandører ble deaktivert`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke deaktivere leverandører',
        variant: 'destructive',
      })
    },
  })
}
