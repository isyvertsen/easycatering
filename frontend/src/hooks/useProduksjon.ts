import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import {
  templateApi,
  produksjonApi,
  TemplateListParams,
  TemplateListResponse,
  ProduksjonsTemplate,
  TemplateCreateInput,
  TemplateUpdateInput,
  ProduksjonsListParams,
  ProduksjonsListResponse,
  Produksjon,
  ApproveRequest,
} from '@/lib/api/produksjon'
import { toast } from '@/hooks/use-toast'
import { getCrudErrorMessage, logError } from '@/lib/error-utils'

// ============================================================================
// Template Hooks
// ============================================================================

export function useTemplatesList(
  params?: TemplateListParams,
  options?: UseQueryOptions<TemplateListResponse>
) {
  return useQuery<TemplateListResponse>({
    queryKey: ['produksjon-templates', 'list', params],
    queryFn: () => templateApi.list(params),
    ...options
  })
}

export function useTemplate(
  id: number,
  options?: UseQueryOptions<ProduksjonsTemplate>
) {
  return useQuery<ProduksjonsTemplate>({
    queryKey: ['produksjon-templates', id],
    queryFn: () => templateApi.get(id),
    enabled: !!id,
    ...options
  })
}

export function useCreateTemplate(
  options?: UseMutationOptions<ProduksjonsTemplate, Error, TemplateCreateInput>
) {
  const queryClient = useQueryClient()

  return useMutation<ProduksjonsTemplate, Error, TemplateCreateInput>({
    mutationFn: templateApi.create,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-templates'] })
      toast({
        title: "Template opprettet",
        description: `Produksjonstemplate "${data.template_navn}" ble opprettet`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to create template')
      const errorMessage = getCrudErrorMessage('create', 'template', error)
      toast({
        title: "Feil ved opprettelse",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useUpdateTemplate(
  options?: UseMutationOptions<ProduksjonsTemplate, Error, { id: number; data: TemplateUpdateInput }>
) {
  const queryClient = useQueryClient()

  return useMutation<ProduksjonsTemplate, Error, { id: number; data: TemplateUpdateInput }>({
    mutationFn: ({ id, data }) => templateApi.update(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-templates'] })
      queryClient.invalidateQueries({ queryKey: ['produksjon-templates', variables.id] })
      toast({
        title: "Template oppdatert",
        description: `Produksjonstemplate "${data.template_namn}" ble oppdatert`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to update template')
      const errorMessage = getCrudErrorMessage('update', 'template', error)
      toast({
        title: "Feil ved oppdatering",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useDeleteTemplate(
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number>({
    mutationFn: templateApi.delete,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-templates'] })
      toast({
        title: "Template slettet",
        description: "Produksjonstemplaten ble slettet",
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to delete template')
      const errorMessage = getCrudErrorMessage('delete', 'template', error)
      toast({
        title: "Feil ved sletting",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useDistributeTemplate(
  options?: UseMutationOptions<{ message: string; created_count: number }, Error, { templateId: number; kundeIds?: number[] }>
) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string; created_count: number }, Error, { templateId: number; kundeIds?: number[] }>({
    mutationFn: ({ templateId, kundeIds }) => templateApi.distribute(templateId, kundeIds),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-orders'] })
      toast({
        title: "Template distribuert",
        description: `Template distribuert til ${data.created_count} kunder`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to distribute template')
      toast({
        title: "Feil ved distribusjon",
        description: "Kunne ikke distribuere template",
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

// ============================================================================
// Production Order Hooks
// ============================================================================

export function useProduksjonsList(
  params?: ProduksjonsListParams,
  options?: UseQueryOptions<ProduksjonsListResponse>
) {
  return useQuery<ProduksjonsListResponse>({
    queryKey: ['produksjon-orders', 'list', params],
    queryFn: () => produksjonApi.list(params),
    ...options
  })
}

export function useProduksjon(
  id: number,
  options?: UseQueryOptions<Produksjon>
) {
  return useQuery<Produksjon>({
    queryKey: ['produksjon-orders', id],
    queryFn: () => produksjonApi.get(id),
    enabled: !!id,
    ...options
  })
}

export function useSubmitProduksjon(
  options?: UseMutationOptions<{ message: string }, Error, number>
) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, Error, number>({
    mutationFn: produksjonApi.submit,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-orders'] })
      toast({
        title: "Bestilling sendt",
        description: "Produksjonsbestillingen er sendt inn for godkjenning",
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to submit production order')
      toast({
        title: "Feil ved innsending",
        description: "Kunne ikke sende inn bestilling",
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useApproveProduksjon(
  options?: UseMutationOptions<{ message: string; approved_count: number }, Error, ApproveRequest>
) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string; approved_count: number }, Error, ApproveRequest>({
    mutationFn: produksjonApi.approve,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-orders'] })
      toast({
        title: "Godkjent",
        description: `${data.approved_count} produksjonsordre(r) ble godkjent`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to approve production orders')
      toast({
        title: "Feil ved godkjenning",
        description: "Kunne ikke godkjenne bestillinger",
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}

export function useTransferToOrder(
  options?: UseMutationOptions<{ message: string; ordreid: number }, Error, { id: number; leveringsdato?: string }>
) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string; ordreid: number }, Error, { id: number; leveringsdato?: string }>({
    mutationFn: ({ id, leveringsdato }) => produksjonApi.transferToOrder(id, leveringsdato),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['produksjon-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast({
        title: "Overført til ordre",
        description: `Produksjonsordre overført til ordre #${data.ordreid}`,
        variant: "default",
      })
      options?.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      logError(error, 'Failed to transfer to order')
      toast({
        title: "Feil ved overføring",
        description: "Kunne ikke overføre til ordre",
        variant: "destructive",
      })
      options?.onError?.(error, variables, context)
    },
    ...options
  })
}
