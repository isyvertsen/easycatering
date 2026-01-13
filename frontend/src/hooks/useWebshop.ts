import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  webshopApi,
  WebshopProductListParams,
  WebshopOrderCreateData,
  WebshopMyOrdersParams,
  WebshopApprovalListParams
} from '@/lib/api/webshop'
import { useToast } from '@/hooks/use-toast'

/**
 * React Query hooks for Webshop
 */

// ============================================================================
// TILGANGSKONTROLL
// ============================================================================

/**
 * Sjekk webshop-tilgang for innlogget bruker
 */
export function useWebshopAccess() {
  return useQuery({
    queryKey: ['webshop', 'access'],
    queryFn: () => webshopApi.checkAccess(),
    staleTime: 5 * 60 * 1000, // 5 minutter
    retry: false,
  })
}

/**
 * Hent standard leveringsdato basert på kundens leveringsdag
 */
export function useDefaultDeliveryDate() {
  return useQuery({
    queryKey: ['webshop', 'default-delivery-date'],
    queryFn: () => webshopApi.getDefaultDeliveryDate(),
    staleTime: 5 * 60 * 1000, // 5 minutter
  })
}

// ============================================================================
// PRODUKTER
// ============================================================================

/**
 * Hent webshop-produkter med filtrering og paginering
 */
export function useWebshopProducts(params?: WebshopProductListParams) {
  return useQuery({
    queryKey: ['webshop', 'products', params],
    queryFn: () => webshopApi.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutter
  })
}

/**
 * Hent enkelt webshop-produkt
 */
export function useWebshopProduct(id: number | null) {
  return useQuery({
    queryKey: ['webshop', 'product', id],
    queryFn: () => webshopApi.getProduct(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// ORDRE
// ============================================================================

/**
 * Opprett ny webshop-ordre
 */
export function useCreateWebshopOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: WebshopOrderCreateData) => webshopApi.createOrder(data),
    onSuccess: (data) => {
      // Invalidate my orders query
      queryClient.invalidateQueries({ queryKey: ['webshop', 'my-orders'] })

      toast({
        title: 'Ordre opprettet',
        description: data.message || 'Din ordre er mottatt og venter på godkjenning.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved opprettelse av ordre',
        description: error.response?.data?.detail || 'Kunne ikke opprette ordre',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hent mine webshop-ordrer
 */
export function useMyWebshopOrders(params?: WebshopMyOrdersParams) {
  return useQuery({
    queryKey: ['webshop', 'my-orders', params],
    queryFn: () => webshopApi.getMyOrders(params),
    staleTime: 1 * 60 * 1000, // 1 minutt
  })
}

/**
 * Hent enkelt ordre
 */
export function useWebshopOrder(id: number | null) {
  return useQuery({
    queryKey: ['webshop', 'order', id],
    queryFn: () => webshopApi.getOrder(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000,
  })
}

/**
 * Hent ordrelinjer for en ordre
 */
export function useWebshopOrderLines(orderId: number | null) {
  return useQuery({
    queryKey: ['webshop', 'order', orderId, 'lines'],
    queryFn: () => webshopApi.getOrderLines(orderId!),
    enabled: !!orderId,
    staleTime: 1 * 60 * 1000,
  })
}

/**
 * Hent ordre via e-post token (ingen autentisering påkrevd)
 */
export function useWebshopOrderByToken(token: string | null) {
  return useQuery({
    queryKey: ['webshop', 'order-by-token', token],
    queryFn: () => webshopApi.getOrderByToken(token!),
    enabled: !!token,
    staleTime: 30 * 1000, // 30 sekunder
    retry: false, // Ikke retry hvis token er ugyldig
  })
}

// ============================================================================
// ADMIN GODKJENNING
// ============================================================================

/**
 * Hent ordrer som venter på godkjenning (kun admin)
 */
export function useWebshopOrdersForApproval(params?: WebshopApprovalListParams) {
  return useQuery({
    queryKey: ['webshop', 'orders-for-approval', params],
    queryFn: () => webshopApi.getOrdersForApproval(params),
    staleTime: 30 * 1000, // 30 sekunder
  })
}

/**
 * Godkjenn/endre status på enkelt ordre
 */
export function useApproveWebshopOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, statusId }: { id: number; statusId: number }) =>
      webshopApi.approveOrder(id, statusId),
    onSuccess: (data, variables) => {
      // Invalidate approval list
      queryClient.invalidateQueries({ queryKey: ['webshop', 'orders-for-approval'] })
      // Invalidate specific order
      queryClient.invalidateQueries({ queryKey: ['webshop', 'order', variables.id] })

      const statusText =
        variables.statusId === 1
          ? 'satt til Ny'
          : variables.statusId === 2
            ? 'satt til Under behandling'
            : variables.statusId === 3
              ? 'godkjent'
              : 'oppdatert'

      toast({
        title: 'Status oppdatert',
        description: `Ordre ${statusText}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved oppdatering',
        description: error.response?.data?.detail || 'Kunne ikke oppdatere ordre',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Batch-godkjenning av flere ordrer
 */
export function useBatchApproveWebshopOrders() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ orderIds, statusId }: { orderIds: number[]; statusId: number }) =>
      webshopApi.batchApproveOrders(orderIds, statusId),
    onSuccess: (data, variables) => {
      // Invalidate approval list
      queryClient.invalidateQueries({ queryKey: ['webshop', 'orders-for-approval'] })

      const statusText =
        variables.statusId === 1
          ? 'satt til Ny'
          : variables.statusId === 2
            ? 'satt til Under behandling'
            : variables.statusId === 3
              ? 'godkjent'
              : 'oppdatert'

      toast({
        title: 'Ordrer oppdatert',
        description: `${data.updated_count} ordrer ${statusText}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved batch-oppdatering',
        description: error.response?.data?.detail || 'Kunne ikke oppdatere ordrer',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Reopen an order for editing (sets status back to 10)
 */
export function useReopenWebshopOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => webshopApi.reopenOrder(id),
    onSuccess: (data, variables) => {
      // Invalidate order query
      queryClient.invalidateQueries({ queryKey: ['webshop', 'order', variables] })
      // Invalidate my orders list
      queryClient.invalidateQueries({ queryKey: ['webshop', 'my-orders'] })

      toast({
        title: 'Ordre gjenåpnet',
        description: 'Du kan nå redigere ordren',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved gjenåpning',
        description: error.response?.data?.detail || 'Kunne ikke gjenåpne ordre',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Cancel own order before approval (sets status to 99)
 */
export function useCancelMyWebshopOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: number) => webshopApi.cancelMyOrder(id),
    onSuccess: (data, variables) => {
      // Invalidate order query
      queryClient.invalidateQueries({ queryKey: ['webshop', 'order', variables] })
      // Invalidate my orders list
      queryClient.invalidateQueries({ queryKey: ['webshop', 'my-orders'] })

      toast({
        title: 'Ordre kansellert',
        description: 'Ordren er kansellert',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil ved kansellering',
        description: error.response?.data?.detail || 'Kunne ikke kansellere ordre',
        variant: 'destructive',
      })
    },
  })
}
