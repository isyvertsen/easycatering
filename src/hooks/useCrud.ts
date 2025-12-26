import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { crudApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { getCrudErrorMessage, getErrorMessage, logError } from '@/lib/error-utils'

export interface CrudItem {
  id: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface CrudListResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CrudListParams {
  page?: number
  page_size?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

export function useCrudList<T extends CrudItem>(
  tableName: string,
  params?: CrudListParams,
  options?: UseQueryOptions<CrudListResponse<T>>
) {
  return useQuery<CrudListResponse<T>>({
    queryKey: ['crud', tableName, 'list', params],
    queryFn: () => crudApi.list<T>(tableName, params),
    ...options
  })
}

export function useCrudGet<T extends CrudItem>(
  tableName: string,
  id: number | string | undefined,
  options?: UseQueryOptions<T>
) {
  return useQuery<T>({
    queryKey: ['crud', tableName, 'get', id],
    queryFn: () => crudApi.get<T>(tableName, Number(id)),
    enabled: !!id,
    ...options
  })
}

export function useCrudCreate<T extends CrudItem>(
  tableName: string,
  options?: UseMutationOptions<T, Error, Partial<T>>
) {
  const queryClient = useQueryClient()
  
  return useMutation<T, Error, Partial<T>>({
    mutationFn: (data) => crudApi.create<T>(tableName, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['crud', tableName, 'list'] })
      toast({
        title: "Opprettet",
        description: "Elementet ble opprettet",
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, `Failed to create ${tableName}`)
      const errorMessage = getCrudErrorMessage('create', tableName as any, error)
      toast({
        title: "Feil ved opprettelse",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useCrudUpdate<T extends CrudItem>(
  tableName: string,
  options?: UseMutationOptions<T, Error, T>
) {
  const queryClient = useQueryClient()
  
  return useMutation<T, Error, T>({
    mutationFn: (data) => crudApi.update<T>(tableName, data.id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['crud', tableName, 'list'] })
      queryClient.invalidateQueries({ queryKey: ['crud', tableName, 'get', data.id] })
      toast({
        title: "Oppdatert",
        description: "Elementet ble oppdatert",
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, `Failed to update ${tableName}`)
      const errorMessage = getCrudErrorMessage('update', tableName as any, error)
      toast({
        title: "Feil ved oppdatering",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useCrudDelete<T extends CrudItem>(
  tableName: string,
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, number>({
    mutationFn: (id) => crudApi.delete(tableName, id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['crud', tableName, 'list'] })
      toast({
        title: "Slettet",
        description: "Elementet ble slettet",
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, `Failed to delete ${tableName}`)
      const errorMessage = getCrudErrorMessage('delete', tableName as any, error)
      toast({
        title: "Feil ved sletting",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useCrudSchema(tableName: string) {
  return useQuery({
    queryKey: ['crud', tableName, 'schema'],
    queryFn: () => crudApi.getSchema(tableName),
    staleTime: Infinity // Schema doesn't change often
  })
}