import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { getCrudErrorMessage, logError } from '@/lib/error-utils'
import { BaseListParams, BaseListResponse } from '@/lib/api/base'

/**
 * Konfigurasjon for entity CRUD hooks
 */
export interface EntityCrudConfig<T, TCreate, TListParams> {
  /** Navn på entity (for query keys og meldinger) */
  entityName: string
  /** Norsk navn for visning i toast-meldinger */
  displayName: {
    singular: string
    plural: string
  }
  /** API klient med CRUD metoder */
  api: {
    list: (params?: TListParams) => Promise<BaseListResponse<T>>
    get: (id: number | string) => Promise<T>
    create: (data: TCreate) => Promise<T>
    update: (id: number | string, data: Partial<TCreate>) => Promise<T>
    delete: (id: number | string) => Promise<void>
  }
  /** Funksjon for å hente ID fra entity */
  getId: (item: T) => number | string
  /** Funksjon for å hente visningsnavn fra entity */
  getDisplayName?: (item: T) => string
}

/**
 * Factory for å lage type-safe CRUD hooks for en entity
 * Reduserer duplikatkode og gir konsistent error handling
 */
export function createEntityCrudHooks<T, TCreate = Omit<T, 'id'>, TListParams extends BaseListParams = BaseListParams>(
  config: EntityCrudConfig<T, TCreate, TListParams>
) {
  const { entityName, displayName, api, getId, getDisplayName } = config

  /**
   * Hook for å liste entities med pagination og filtre
   */
  function useList(
    params?: TListParams,
    options?: UseQueryOptions<BaseListResponse<T>>
  ) {
    return useQuery<BaseListResponse<T>>({
      queryKey: [entityName, 'list', params],
      queryFn: () => api.list(params),
      ...options
    })
  }

  /**
   * Hook for å hente enkelt entity
   */
  function useGet(
    id: number | string | undefined,
    options?: UseQueryOptions<T>
  ) {
    return useQuery<T>({
      queryKey: [entityName, id],
      queryFn: () => api.get(id!),
      enabled: !!id,
      ...options
    })
  }

  /**
   * Hook for å opprette ny entity
   */
  function useCreate(
    options?: UseMutationOptions<T, Error, TCreate>
  ) {
    const queryClient = useQueryClient()

    return useMutation<T, Error, TCreate>({
      mutationFn: api.create,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [entityName] })

        const itemName = getDisplayName?.(data) || displayName.singular
        toast({
          title: `${displayName.singular} opprettet`,
          description: `${itemName} ble opprettet`,
          variant: "default",
        })

        options?.onSuccess?.(data, variables, context)
      },
      onError: (error, variables, context) => {
        logError(error, `Failed to create ${entityName}`)
        const errorMessage = getCrudErrorMessage('create', entityName as any, error)
        toast({
          title: `Feil ved opprettelse av ${displayName.singular.toLowerCase()}`,
          description: errorMessage,
          variant: "destructive",
        })
        options?.onError?.(error, variables, context)
      },
      ...options
    })
  }

  /**
   * Hook for å oppdatere entity
   */
  function useUpdate(
    options?: UseMutationOptions<T, Error, { id: number | string; data: Partial<TCreate> }>
  ) {
    const queryClient = useQueryClient()

    return useMutation<T, Error, { id: number | string; data: Partial<TCreate> }>({
      mutationFn: ({ id, data }) => api.update(id, data),
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [entityName] })
        queryClient.invalidateQueries({ queryKey: [entityName, variables.id] })

        const itemName = getDisplayName?.(data) || displayName.singular
        toast({
          title: `${displayName.singular} oppdatert`,
          description: `${itemName} ble oppdatert`,
          variant: "default",
        })

        options?.onSuccess?.(data, variables, context)
      },
      onError: (error, variables, context) => {
        logError(error, `Failed to update ${entityName}`)
        const errorMessage = getCrudErrorMessage('update', entityName as any, error)
        toast({
          title: `Feil ved oppdatering av ${displayName.singular.toLowerCase()}`,
          description: errorMessage,
          variant: "destructive",
        })
        options?.onError?.(error, variables, context)
      },
      ...options
    })
  }

  /**
   * Hook for å slette entity
   */
  function useDelete(
    options?: UseMutationOptions<void, Error, number | string>
  ) {
    const queryClient = useQueryClient()

    return useMutation<void, Error, number | string>({
      mutationFn: api.delete,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [entityName] })
        toast({
          title: `${displayName.singular} slettet`,
          description: `${displayName.singular} ble slettet`,
          variant: "default",
        })
        options?.onSuccess?.(data, variables, context)
      },
      onError: (error, variables, context) => {
        logError(error, `Failed to delete ${entityName}`)
        const errorMessage = getCrudErrorMessage('delete', entityName as any, error)
        toast({
          title: `Feil ved sletting av ${displayName.singular.toLowerCase()}`,
          description: errorMessage,
          variant: "destructive",
        })
        options?.onError?.(error, variables, context)
      },
      ...options
    })
  }

  return {
    useList,
    useGet,
    useCreate,
    useUpdate,
    useDelete
  }
}
