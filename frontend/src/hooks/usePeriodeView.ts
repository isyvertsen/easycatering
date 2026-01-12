'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  periodeViewApi,
  PeriodeViewListParams,
  OpprettPeriodeUkeRequest,
  SistePeriodeResponse,
  NestePeriodeForslagResponse
} from '@/lib/api/periode-view'
import {
  PeriodeView,
  PeriodeViewListResponse,
  KopierPeriodeRequest,
  TilgjengeligMeny
} from '@/types/periode-view'
import { toast } from '@/hooks/use-toast'

// Query key factory for consistency
export const periodeViewKeys = {
  all: ['periode-view'] as const,
  lists: () => [...periodeViewKeys.all, 'list'] as const,
  list: (params?: PeriodeViewListParams) => [...periodeViewKeys.lists(), params] as const,
  view: (id: number) => [...periodeViewKeys.all, 'view', id] as const,
  tilgjengelige: (id: number) => [...periodeViewKeys.all, 'tilgjengelige', id] as const,
}

/**
 * Hook to fetch paginated list of periods with hierarchy
 */
export function usePeriodeViewList(params?: PeriodeViewListParams) {
  return useQuery<PeriodeViewListResponse>({
    queryKey: periodeViewKeys.list(params),
    queryFn: () => periodeViewApi.list(params),
  })
}

/**
 * Hook to fetch hierarchical period view
 */
export function usePeriodeView(id: number | undefined) {
  return useQuery<PeriodeView>({
    queryKey: periodeViewKeys.view(id!),
    queryFn: () => periodeViewApi.getView(id!),
    enabled: !!id,
  })
}

/**
 * Hook to get available menus for adding to period
 */
export function useTilgjengeligeMenyer(periodeId: number | undefined, menygruppeId?: number) {
  return useQuery<TilgjengeligMeny[]>({
    queryKey: [...periodeViewKeys.tilgjengelige(periodeId!), menygruppeId],
    queryFn: () => periodeViewApi.getTilgjengeligeMenyer(periodeId!, menygruppeId),
    enabled: !!periodeId,
  })
}

/**
 * Hook to copy a period
 */
export function useKopierPeriode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: KopierPeriodeRequest) => periodeViewApi.kopierPeriode(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.all })
      queryClient.invalidateQueries({ queryKey: ['perioder'] })
      toast({
        title: 'Periode kopiert',
        description: `Ny periode for uke ${data.ukenr} ble opprettet med ${data.kopierte_menyer} menyer`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke kopiere perioden',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to add menus to period
 */
export function useTilordneMenyer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ periodeId, menyIds }: { periodeId: number; menyIds: number[] }) =>
      periodeViewApi.tilordneMenyer(periodeId, menyIds),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.view(variables.periodeId) })
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.tilgjengelige(variables.periodeId) })
      toast({
        title: 'Menyer tilordnet',
        description: `${result.antall} menyer ble lagt til perioden`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke tilordne menyer',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to remove menus from period
 */
export function useFjernMenyer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ periodeId, menyIds }: { periodeId: number; menyIds: number[] }) =>
      periodeViewApi.fjernMenyer(periodeId, menyIds),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.view(variables.periodeId) })
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.tilgjengelige(variables.periodeId) })
      toast({
        title: 'Menyer fjernet',
        description: `${result.antall} menyer ble fjernet fra perioden`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke fjerne menyer',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to create a new menu in a period
 */
export function useOpprettMenyIPeriode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      periodeId,
      menyData
    }: {
      periodeId: number
      menyData: { beskrivelse: string; menygruppe: number }
    }) => periodeViewApi.opprettMenyIPeriode(periodeId, menyData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.view(variables.periodeId) })
      toast({
        title: 'Meny opprettet',
        description: 'Ny meny ble opprettet og lagt til perioden',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette meny',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to create a new period by year and week number
 * Backend automatically calculates Monday-Sunday dates
 */
export function useOpprettPeriodeUke() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OpprettPeriodeUkeRequest) => periodeViewApi.opprettPeriodeUke(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: periodeViewKeys.all })
      queryClient.invalidateQueries({ queryKey: ['perioder'] })
      queryClient.invalidateQueries({ queryKey: ['periode-forslag'] })
      toast({
        title: 'Periode opprettet',
        description: `Uke ${data.ukenr} ble opprettet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette periode. Sjekk at uken ikke allerede finnes.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to get the most recent period
 */
export function useSistePeriode() {
  return useQuery<SistePeriodeResponse>({
    queryKey: ['perioder', 'siste'],
    queryFn: () => periodeViewApi.getSistePeriode(),
  })
}

/**
 * Hook to get suggestion for next period
 * Returns the next available week after the last period
 */
export function useNestePeriodeForslag() {
  return useQuery<NestePeriodeForslagResponse>({
    queryKey: ['periode-forslag', 'neste'],
    queryFn: () => periodeViewApi.getNestePeriodeForslag(),
  })
}
