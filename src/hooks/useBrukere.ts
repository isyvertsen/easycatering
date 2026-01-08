import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { Bruker, BrukerCreate, BrukerUpdate } from '@/types/models'
import { brukereApi, BrukerListParams } from '@/lib/api/brukere'
import { createEntityCrudHooks } from './useEntityCrud'

const hooks = createEntityCrudHooks<Bruker, BrukerCreate, BrukerListParams>({
  entityName: 'brukere',
  displayName: {
    singular: 'Bruker',
    plural: 'Brukere'
  },
  api: brukereApi,
  getId: (bruker) => bruker.id,
  getDisplayName: (bruker) => bruker.full_name || bruker.email
})

export const useBrukereList = hooks.useList
export const useBruker = hooks.useGet
export const useCreateBruker = hooks.useCreate
export const useUpdateBruker = hooks.useUpdate
export const useDeleteBruker = hooks.useDelete

/**
 * Hook for å aktivere en deaktivert bruker
 */
export function useActivateBruker() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string | number>({
    mutationFn: brukereApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brukere'] })
      toast({
        title: 'Bruker aktivert',
        description: 'Brukeren er nå aktiv og kan logge inn',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: 'Feil ved aktivering',
        description: error.message || 'Kunne ikke aktivere brukeren',
        variant: 'destructive',
      })
    },
  })
}

