import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kundegruppeApi, Kundegruppe, KundegruppeCreate, KundegruppeUpdate, KundegruppeListParams, KundegruppeListResponse } from '@/lib/api/kundegruppe'
import { toast } from '@/hooks/use-toast'

export function useKundegrupper(params?: KundegruppeListParams) {
  return useQuery<KundegruppeListResponse>({
    queryKey: ['kundegrupper', params],
    queryFn: () => kundegruppeApi.list(params),
  })
}

export function useKundegruppe(id: number) {
  return useQuery<Kundegruppe>({
    queryKey: ['kundegruppe', id],
    queryFn: () => kundegruppeApi.get(id),
    enabled: !!id,
  })
}

export function useCreateKundegruppe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: KundegruppeCreate) => kundegruppeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kundegrupper'] })
      toast({
        title: 'Opprettet',
        description: 'Kundegruppe ble opprettet',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette kundegruppe',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateKundegruppe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: KundegruppeUpdate }) =>
      kundegruppeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kundegrupper'] })
      toast({
        title: 'Oppdatert',
        description: 'Kundegruppe ble oppdatert',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere kundegruppe',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteKundegruppe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => kundegruppeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kundegrupper'] })
      toast({
        title: 'Slettet',
        description: 'Kundegruppe ble slettet',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette kundegruppe',
        variant: 'destructive',
      })
    },
  })
}

export function useBulkDeleteKundegrupper() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => kundegruppeApi.bulkDelete(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['kundegrupper'] })
      toast({
        title: 'Slettet',
        description: `${ids.length} kundegrupper ble slettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette kundegrupper',
        variant: 'destructive',
      })
    },
  })
}
