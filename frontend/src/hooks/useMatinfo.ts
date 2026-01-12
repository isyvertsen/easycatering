import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matinfoApi, MatinfoListParams, MatinfoProduct } from '@/lib/api/matinfo'
import { toast } from '@/hooks/use-toast'

// List products hook
export function useMatinfoProducts(params?: MatinfoListParams) {
  return useQuery({
    queryKey: ['matinfo-products', params],
    queryFn: () => matinfoApi.list(params),
  })
}

// Get single product hook
export function useMatinfoProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['matinfo-product', id],
    queryFn: () => matinfoApi.get(id!),
    enabled: !!id,
  })
}

// Get product by GTIN hook
export function useMatinfoProductByGtin(gtin: string | undefined) {
  return useQuery({
    queryKey: ['matinfo-product-gtin', gtin],
    queryFn: () => matinfoApi.getByGtin(gtin!),
    enabled: !!gtin,
  })
}

// Search products hook
export function useMatinfoSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['matinfo-search', query],
    queryFn: () => matinfoApi.search(query),
    enabled: enabled && query.length > 0,
  })
}

// Get linked LKC product hook
export function useLinkedProduct(gtin: string | undefined) {
  return useQuery({
    queryKey: ['matinfo-linked', gtin],
    queryFn: () => matinfoApi.getLinkedProduct(gtin!),
    enabled: !!gtin,
  })
}

// Sync hooks
export function useUpdatedGtins(daysBack = 7) {
  return useQuery({
    queryKey: ['matinfo-updated-gtins', daysBack],
    queryFn: () => matinfoApi.sync.getUpdatedGtins(daysBack),
  })
}

export function useNewProducts(daysBack = 30) {
  return useQuery({
    queryKey: ['matinfo-new-products', daysBack],
    queryFn: () => matinfoApi.sync.getNewProducts(daysBack),
  })
}

// Mutations
export function useSyncProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (daysBack: number = 7) => matinfoApi.sync.syncProducts(daysBack),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      queryClient.invalidateQueries({ queryKey: ['matinfo-updated-gtins'] })
      queryClient.invalidateQueries({ queryKey: ['matinfo-new-products'] })
      toast({
        title: 'Synkronisering fullført',
        description: `${data.synced} produkter synkronisert, ${data.failed} feilet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke synkronisere produkter',
        variant: 'destructive',
      })
    },
  })
}

export function useSyncSingleProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (gtin: string) => matinfoApi.sync.syncProduct(gtin),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      queryClient.invalidateQueries({ queryKey: ['matinfo-product-gtin', data.gtin] })
      toast({
        title: 'Produkt synkronisert',
        description: data.message,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke synkronisere produkt',
        variant: 'destructive',
      })
    },
  })
}

export function useSearchByName() {
  return useMutation({
    mutationFn: ({ name, limit = 10 }: { name: string; limit?: number }) =>
      matinfoApi.sync.searchByName(name, limit),
  })
}

export function useCreateMatinfoProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<MatinfoProduct>) => matinfoApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      toast({
        title: 'Produkt opprettet',
        description: 'Matinfo-produkt ble opprettet',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette produkt',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateMatinfoProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MatinfoProduct> }) =>
      matinfoApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      queryClient.invalidateQueries({ queryKey: ['matinfo-product', id] })
      toast({
        title: 'Produkt oppdatert',
        description: 'Matinfo-produkt ble oppdatert',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere produkt',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteMatinfoProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => matinfoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      toast({
        title: 'Produkt slettet',
        description: 'Matinfo-produkt ble slettet',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette produkt',
        variant: 'destructive',
      })
    },
  })
}

export function useVendorImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<MatinfoProduct>) => matinfoApi.vendorImport(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      toast({
        title: result.operation === 'created' ? 'Produkt opprettet' : 'Produkt oppdatert',
        description: result.message,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke importere produkt',
        variant: 'destructive',
      })
    },
  })
}

export function useVendorImportBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (products: Partial<MatinfoProduct>[]) => matinfoApi.vendorImportBatch(products),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-products'] })
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      toast({
        title: 'Import fullført',
        description: `${successful} produkter importert, ${failed} feilet`,
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke importere produkter',
        variant: 'destructive',
      })
    },
  })
}

// Allergen mutations
export function useUpdateAllergen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      code,
      data,
    }: {
      productId: string
      code: string
      data: { level: string; name: string }
    }) => matinfoApi.allergens.update(productId, code, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-product', productId] })
      toast({
        title: 'Allergen oppdatert',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere allergen',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteAllergen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, code }: { productId: string; code: string }) =>
      matinfoApi.allergens.delete(productId, code),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-product', productId] })
      toast({
        title: 'Allergen slettet',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette allergen',
        variant: 'destructive',
      })
    },
  })
}

// Nutrient mutations
export function useUpdateNutrient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      code,
      data,
    }: {
      productId: string
      code: string
      data: { measurement?: number; measurementPrecision?: string; measurementType?: string; name?: string }
    }) => matinfoApi.nutrients.update(productId, code, data),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-product', productId] })
      toast({
        title: 'Næringsstoff oppdatert',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke oppdatere næringsstoff',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteNutrient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, code }: { productId: string; code: string }) =>
      matinfoApi.nutrients.delete(productId, code),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['matinfo-product', productId] })
      toast({
        title: 'Næringsstoff slettet',
      })
    },
    onError: () => {
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette næringsstoff',
        variant: 'destructive',
      })
    },
  })
}
