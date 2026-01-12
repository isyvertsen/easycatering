import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Kategori, kategorierApi, KategoriCreateData, KategoriListParams } from '@/lib/api/kategorier'
import { createEntityCrudHooks } from './useEntityCrud'
import { toast } from '@/hooks/use-toast'

// Lag type-safe hooks med konsistent error handling og toast-meldinger
const hooks = createEntityCrudHooks<Kategori, KategoriCreateData, KategoriListParams>({
  entityName: 'kategorier',
  displayName: {
    singular: 'Kategori',
    plural: 'Kategorier'
  },
  api: kategorierApi,
  getId: (kategori) => kategori.kategoriid,
  getDisplayName: (kategori) => kategori.kategori || 'Kategori'
})

// Eksporter hooks med forventede navn
export const useKategorierList = hooks.useList
export const useKategori = hooks.useGet
export const useCreateKategori = hooks.useCreate
export const useUpdateKategori = hooks.useUpdate
export const useDeleteKategori = hooks.useDelete

// Bulk delete hook
export function useBulkDeleteKategorier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => kategorierApi.delete(id)))
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['kategorier'] })
      toast({
        title: 'Slettet',
        description: `${ids.length} kategorier ble slettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette kategorier',
        variant: 'destructive',
      })
    },
  })
}
