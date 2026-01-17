import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemSettingsApi } from '@/lib/api/system-settings'
import { useToast } from '@/hooks/use-toast'

/**
 * React Query hooks for System Settings
 */

/**
 * Hent alle systeminnstillinger (kun admin)
 */
export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemSettingsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutter
  })
}

/**
 * Hent webshop kategori-rekkefølge
 */
export function useWebshopCategoryOrder() {
  return useQuery({
    queryKey: ['system-settings', 'webshop-category-order'],
    queryFn: () => systemSettingsApi.getWebshopCategoryOrder(),
    staleTime: 5 * 60 * 1000, // 5 minutter
  })
}

/**
 * Oppdater webshop kategori-rekkefølge
 */
export function useUpdateWebshopCategoryOrder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (categoryIds: number[]) => systemSettingsApi.updateWebshopCategoryOrder(categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'webshop-category-order'] })
      toast({
        title: 'Lagret',
        description: 'Kategori-rekkefølgen er oppdatert',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.response?.data?.detail || 'Kunne ikke lagre kategori-rekkefølge',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hent kundegruppe-filter for bruker-tilknytning
 */
export function useUserKundegruppeFilter() {
  return useQuery({
    queryKey: ['system-settings', 'user-kundegruppe-filter'],
    queryFn: () => systemSettingsApi.getUserKundegruppeFilter(),
    staleTime: 5 * 60 * 1000, // 5 minutter
  })
}

/**
 * Oppdater kundegruppe-filter for bruker-tilknytning
 */
export function useUpdateUserKundegruppeFilter() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (gruppeIds: number[]) => systemSettingsApi.updateUserKundegruppeFilter(gruppeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'user-kundegruppe-filter'] })
      toast({
        title: 'Lagret',
        description: 'Kundegruppe-filteret er oppdatert',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.response?.data?.detail || 'Kunne ikke lagre kundegruppe-filter',
        variant: 'destructive',
      })
    },
  })
}
