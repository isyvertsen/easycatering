import { useQuery } from '@tanstack/react-query'
import {
  bestillingSkjemaApi,
  KundeForBestilling,
  PeriodeMedMenyer,
  BestillingSkjemaResponse,
  BestillingSkjemaParams,
} from '@/lib/api/bestilling-skjema'

/**
 * Hook for å hente kunder for bestillingsskjema
 */
export function useBestillingKunder(params?: {
  kundegruppe_id?: number
  menygruppe_id?: number
}) {
  return useQuery<KundeForBestilling[]>({
    queryKey: ['bestilling-skjema', 'kunder', params],
    queryFn: () => bestillingSkjemaApi.getKunder(params),
    enabled: params?.menygruppe_id !== undefined || params === undefined,
  })
}

/**
 * Hook for å hente perioder med menyer for bestillingsskjema
 */
export function useBestillingPerioder(params?: {
  menygruppe_id?: number
  fra_periode_id?: number
  til_periode_id?: number
}) {
  return useQuery<PeriodeMedMenyer[]>({
    queryKey: ['bestilling-skjema', 'perioder', params],
    queryFn: () => bestillingSkjemaApi.getPerioder(params),
  })
}

/**
 * Hook for å hente komplett bestillingsskjema (kunder + perioder)
 */
export function useBestillingSkjema(params?: BestillingSkjemaParams) {
  return useQuery<BestillingSkjemaResponse>({
    queryKey: ['bestilling-skjema', 'komplett', params],
    queryFn: () => bestillingSkjemaApi.getKomplett(params),
  })
}
