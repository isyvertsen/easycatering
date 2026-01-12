import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntityCrudHooks } from './useEntityCrud'
import {
  CombinedDish,
  CombinedDishCreate,
  CombinedDishListParams,
  combinedDishesApi
} from '@/lib/api/combined-dishes'
import { toast } from '@/hooks/use-toast'

/**
 * CRUD hooks for kombinerte retter (combined dishes)
 */
export const {
  useList: useCombinedDishesList,
  useGet: useCombinedDish,
  useCreate: useCreateCombinedDish,
  useUpdate: useUpdateCombinedDish,
  useDelete: useDeleteCombinedDish
} = createEntityCrudHooks<CombinedDish, CombinedDishCreate, CombinedDishListParams>({
  entityName: 'combined-dishes',
  displayName: {
    singular: 'Kombinert rett',
    plural: 'Kombinerte retter'
  },
  api: combinedDishesApi,
  getId: (dish) => dish.id,
  getDisplayName: (dish) => dish.name
})

// Bulk delete hook
export function useBulkDeleteCombinedDishes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => combinedDishesApi.delete(id)))
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['combined-dishes'] })
      toast({
        title: 'Slettet',
        description: `${ids.length} retter ble slettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette retter',
        variant: 'destructive',
      })
    },
  })
}
