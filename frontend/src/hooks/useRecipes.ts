import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { recipesApi, RecipeListParams, RecipeListResponse } from '@/lib/api/recipes'
import { Recipe, RecipeIngredient } from '@/types/models'
import { toast } from '@/hooks/use-toast'
import { getCrudErrorMessage, logError } from '@/lib/error-utils'

export function useRecipesList(
  params?: RecipeListParams,
  options?: UseQueryOptions<RecipeListResponse>
) {
  return useQuery<RecipeListResponse>({
    queryKey: ['recipes', 'list', params],
    queryFn: () => recipesApi.list(params),
    ...options
  })
}

export function useRecipe(
  id: number,
  options?: UseQueryOptions<Recipe>
) {
  return useQuery<Recipe>({
    queryKey: ['recipes', id],
    queryFn: () => recipesApi.get(id),
    enabled: !!id,
    ...options
  })
}

export function useCreateRecipe(
  options?: UseMutationOptions<Recipe, Error, Omit<Recipe, 'kalkylekode'>>
) {
  const queryClient = useQueryClient()
  
  return useMutation<Recipe, Error, Omit<Recipe, 'kalkylekode'>>({
    mutationFn: recipesApi.create,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast({
        title: "Oppskrift opprettet",
        description: `Oppskriften "${data.kalkylenavn}" ble opprettet`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to create recipe')
      const errorMessage = getCrudErrorMessage('create', 'recipe', error)
      toast({
        title: "Feil ved opprettelse av oppskrift",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useUpdateRecipe(
  options?: UseMutationOptions<Recipe, Error, { id: number; data: Partial<Recipe> }>
) {
  const queryClient = useQueryClient()
  
  return useMutation<Recipe, Error, { id: number; data: Partial<Recipe> }>({
    mutationFn: ({ id, data }) => recipesApi.update(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes', variables.id] })
      toast({
        title: "Oppskrift oppdatert",
        description: `Oppskriften "${data.kalkylenavn}" ble oppdatert`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to update recipe')
      const errorMessage = getCrudErrorMessage('update', 'recipe', error)
      toast({
        title: "Feil ved oppdatering av oppskrift",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useDeleteRecipe(
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, number>({
    mutationFn: recipesApi.delete,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast({
        title: "Oppskrift slettet",
        description: "Oppskriften ble slettet",
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to delete recipe')
      const errorMessage = getCrudErrorMessage('delete', 'recipe', error)
      toast({
        title: "Feil ved sletting av oppskrift",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useRecipeIngredients(
  recipeId: number,
  options?: UseQueryOptions<RecipeIngredient[]>
) {
  return useQuery<RecipeIngredient[]>({
    queryKey: ['recipes', recipeId, 'ingredients'],
    queryFn: () => recipesApi.getIngredients(recipeId),
    enabled: !!recipeId,
    ...options
  })
}