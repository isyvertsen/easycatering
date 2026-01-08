'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { menyProduktApi, ProduktSearchParams } from '@/lib/api/meny-produkt'
import { Produkt } from '@/lib/api/produkter'
import { toast } from '@/hooks/use-toast'
import { periodeViewKeys } from './usePeriodeView'

/**
 * Hook to search for products (for swap dropdown)
 */
export function useProduktSearch(params?: ProduktSearchParams) {
  return useQuery<Produkt[]>({
    queryKey: ['produkter', 'search', params],
    queryFn: () => menyProduktApi.searchProdukter(params),
    enabled: true,
  })
}

/**
 * Hook to swap a product in a menu
 */
export function useSwapProdukt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      menyId,
      oldProduktId,
      newProduktId
    }: {
      menyId: number
      oldProduktId: number
      newProduktId: number
    }) => menyProduktApi.swapProdukt(menyId, oldProduktId, newProduktId),
    onSuccess: (data) => {
      // Invalidate periode view to refresh the product list
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.all })
      toast({
        title: 'Produkt byttet',
        description: `Byttet til ${data.new_produkt_navn}`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke bytte produkt',
        variant: 'destructive',
      })
    },
  })
}
