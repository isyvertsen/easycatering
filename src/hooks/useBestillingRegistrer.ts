import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  bestillingRegistrerApi,
  OpprettOrdreRequest,
  OpprettOrdreResponse,
  GenererLenkeRequest,
  GenererLenkeResponse,
  KundeMenyResponse,
  KundeBestillingRequest,
  KundeBestillingResponse,
} from '@/lib/api/bestilling-registrer'

/**
 * Hook for å opprette ordre (intern bruk)
 */
export function useOpprettOrdre() {
  const queryClient = useQueryClient()

  return useMutation<OpprettOrdreResponse, Error, OpprettOrdreRequest>({
    mutationFn: (request) => bestillingRegistrerApi.opprettOrdre(request),
    onSuccess: () => {
      // Invalidate ordrer queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['ordrer'] })
    },
  })
}

/**
 * Hook for å generere kundelenke
 */
export function useGenererKundelenke() {
  const queryClient = useQueryClient()

  return useMutation<GenererLenkeResponse, Error, GenererLenkeRequest>({
    mutationFn: (request) => bestillingRegistrerApi.genererLenke(request),
    onSuccess: () => {
      // Invalidate tokens query to refresh list
      queryClient.invalidateQueries({ queryKey: ['bestilling-tokens'] })
    },
  })
}

/**
 * Hook for å liste aktive tokens
 */
export function useAktiveTokens(kundeid?: number) {
  return useQuery<GenererLenkeResponse[]>({
    queryKey: ['bestilling-tokens', kundeid],
    queryFn: () => bestillingRegistrerApi.listTokens(kundeid),
  })
}

/**
 * Hook for å hente kundemeny via token (PUBLIC)
 */
export function useKundeMeny(token: string | null) {
  return useQuery<KundeMenyResponse>({
    queryKey: ['kunde-meny', token],
    queryFn: () => bestillingRegistrerApi.getKundeMeny(token!),
    enabled: !!token,
    retry: false,
  })
}

/**
 * Hook for å sende inn kundebestilling (PUBLIC)
 */
export function useSubmitKundeBestilling(token: string) {
  return useMutation<KundeBestillingResponse, Error, KundeBestillingRequest>({
    mutationFn: (request) => bestillingRegistrerApi.submitKundeBestilling(token, request),
  })
}
