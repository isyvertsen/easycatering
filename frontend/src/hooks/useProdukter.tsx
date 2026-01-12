import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import {
  produkterApi,
  Produkt,
  ProduktListParams,
  ProduktCreateData,
  MatinfoSearchResult,
  GtinUpdateResponse,
  BulkGtinUpdate,
  BulkGtinUpdateResponse,
} from '@/lib/api/produkter'
import { toast } from '@/hooks/use-toast'

/**
 * Hook for å hente liste over produkter
 */
export function useProdukterList(
  params?: ProduktListParams,
  options?: UseQueryOptions<Produkt[]>
) {
  return useQuery<Produkt[]>({
    queryKey: ['produkter', 'list', params],
    queryFn: () => produkterApi.list(params),
    ...options,
  })
}

/**
 * Hook for å hente ett produkt
 */
export function useProdukt(
  id: number,
  options?: UseQueryOptions<Produkt>
) {
  return useQuery<Produkt>({
    queryKey: ['produkter', id],
    queryFn: () => produkterApi.get(id),
    enabled: !!id,
    ...options,
  })
}

/**
 * Hook for å opprette nytt produkt
 */
export function useCreateProdukt(
  options?: UseMutationOptions<Produkt, Error, ProduktCreateData>
) {
  const queryClient = useQueryClient()

  return useMutation<Produkt, Error, ProduktCreateData>({
    mutationFn: (data) => produkterApi.create(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produkter'] })
      toast({
        title: 'Produkt opprettet',
        description: `"${data.produktnavn}" ble opprettet`,
      })
      options?.onSuccess?.(data, variables, undefined)
    },
    onError: (error, variables, context) => {
      toast({
        title: 'Feil ved opprettelse',
        description: error.message,
        variant: 'destructive',
      })
      options?.onError?.(error, variables, context)
    },
  })
}

/**
 * Hook for å oppdatere produkt
 */
export function useUpdateProdukt(
  options?: UseMutationOptions<Produkt, Error, { id: number; data: Partial<Produkt> }>
) {
  const queryClient = useQueryClient()

  return useMutation<Produkt, Error, { id: number; data: Partial<Produkt> }>({
    mutationFn: ({ id, data }) => produkterApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produkter'] })
      toast({
        title: 'Produkt oppdatert',
        description: `"${data.produktnavn}" ble oppdatert`,
      })
      options?.onSuccess?.(data, variables, undefined)
    },
    onError: (error, variables, context) => {
      toast({
        title: 'Feil ved oppdatering',
        description: error.message,
        variant: 'destructive',
      })
      options?.onError?.(error, variables, context)
    },
  })
}

/**
 * Hook for fuzzy-søk i Matinfo
 */
export function useMatinfoSearch(
  query: string,
  limit: number = 20,
  options?: UseQueryOptions<MatinfoSearchResult[]>
) {
  return useQuery<MatinfoSearchResult[]>({
    queryKey: ['matinfo', 'search', query, limit],
    queryFn: () => produkterApi.searchMatinfo(query, limit),
    enabled: query.length >= 2,
    ...options,
  })
}

/**
 * Hook for å hente Matinfo-forslag for et produkt
 */
export function useMatinfoSuggestions(
  produktId: number,
  limit: number = 10,
  options?: UseQueryOptions<MatinfoSearchResult[]>
) {
  return useQuery<MatinfoSearchResult[]>({
    queryKey: ['matinfo', 'suggestions', produktId, limit],
    queryFn: () => produkterApi.getMatinfoSuggestions(produktId, limit),
    enabled: !!produktId,
    ...options,
  })
}

/**
 * Hook for å oppdatere GTIN
 */
export function useUpdateGtin(
  options?: UseMutationOptions<GtinUpdateResponse, Error, { produktId: number; gtin: string }>
) {
  const queryClient = useQueryClient()

  return useMutation<GtinUpdateResponse, Error, { produktId: number; gtin: string }>({
    mutationFn: ({ produktId, gtin }) => produkterApi.updateGtin(produktId, gtin),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produkter'] })

      toast({
        title: 'GTIN oppdatert!',
        description: `Ny GTIN: ${data.new_gtin}${data.matinfo_match?.found ? ' ✓ Matinfo-match funnet' : ''}`,
      })

      options?.onSuccess?.(data, variables, undefined)
    },
    onError: (error, variables, context) => {
      toast({
        title: 'Feil ved oppdatering av GTIN',
        description: error.message,
        variant: 'destructive',
      })
      options?.onError?.(error, variables, context)
    },
  })
}

/**
 * Hook for masse-oppdatering av GTIN
 */
export function useBulkUpdateGtin(
  options?: UseMutationOptions<BulkGtinUpdateResponse, Error, BulkGtinUpdate[]>
) {
  const queryClient = useQueryClient()

  return useMutation<BulkGtinUpdateResponse, Error, BulkGtinUpdate[]>({
    mutationFn: (updates) => produkterApi.bulkUpdateGtin(updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produkter'] })

      const message = `Oppdatert: ${data.success} av ${data.total} produkter${data.failed > 0 ? `. Feilet: ${data.failed}` : ''}${data.matinfo_matches > 0 ? `. Matinfo-match: ${data.matinfo_matches}` : ''}`

      toast({
        title: 'Masse-oppdatering fullført',
        description: message,
        variant: data.failed > 0 ? 'destructive' : 'default',
      })

      options?.onSuccess?.(data, variables, undefined)
    },
    onError: (error, variables, context) => {
      toast({
        title: 'Feil ved masse-oppdatering',
        description: error.message,
        variant: 'destructive',
      })
      options?.onError?.(error, variables, context)
    },
  })
}

/**
 * Hook for sletting av ett produkt
 */
export function useDeleteProdukt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => produkterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produkter'] })
      toast({
        title: 'Produkt slettet',
        description: 'Produktet ble slettet',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Feil ved sletting',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook for masse-sletting av produkter
 */
export function useBulkDeleteProdukter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => produkterApi.delete(id)))
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['produkter'] })
      toast({
        title: 'Produkter slettet',
        description: `${ids.length} produkter ble slettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette produkter',
        variant: 'destructive',
      })
    },
  })
}
