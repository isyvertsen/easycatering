import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api-client'
import { Product } from '@/types/models'

interface ProductsParams {
  skip?: number
  limit?: number
  sok?: string
  aktiv?: boolean
  kategori?: number
  rett_komponent?: boolean
}

// API response type for paginated products
interface ProdukterListResponse {
  items: Product[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// API functions
async function fetchProducts(params: ProductsParams): Promise<Product[]> {
  const searchParams = new URLSearchParams()

  if (params.skip !== undefined) searchParams.append('skip', params.skip.toString())
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString())
  if (params.sok) searchParams.append('sok', params.sok)
  if (params.aktiv !== undefined) searchParams.append('aktiv', params.aktiv.toString())
  if (params.kategori) searchParams.append('kategori', params.kategori.toString())
  if (params.rett_komponent !== undefined) searchParams.append('rett_komponent', params.rett_komponent.toString())

  const response = await apiClient.get<ProdukterListResponse>(`/v1/produkter/?${searchParams.toString()}`)
  return response.data.items  // Extract items array from paginated response
}

async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/v1/produkter/${id}/`)
}

/**
 * Hook for fetching and managing products
 */
export function useProducts(params: ProductsParams) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState(params.aktiv ?? true)
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(params.kategori)

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    staleTime: 30000, // 30 seconds
  })

  return {
    data,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    categoryFilter,
    setCategoryFilter,
  }
}

/**
 * Hook for deleting a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: 'Suksess',
        description: 'Produktet ble slettet',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke slette produktet',
        variant: 'destructive',
      })
    },
  })
}
