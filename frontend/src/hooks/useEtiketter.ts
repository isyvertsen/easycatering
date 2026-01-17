import { useQuery } from '@tanstack/react-query'
import { etiketterApi, EtikettParams } from '@/lib/api/etiketter'

export function useEtiketter(params: EtikettParams | null) {
  return useQuery({
    queryKey: ['etiketter', params],
    queryFn: () => params ? etiketterApi.getEtiketter(params) : null,
    enabled: !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
