/**
 * React Query hooks for Label Templates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { labelTemplatesApi, labelsApi, LabelTemplateListParams } from '@/lib/api/label-templates'
import { toast } from '@/hooks/use-toast'
import { getCrudErrorMessage, logError } from '@/lib/error-utils'
import type {
  LabelTemplate,
  LabelTemplateCreate,
  LabelTemplateUpdate,
  TemplateShareCreate,
  PrintHistoryCreate,
  PreviewLabelRequest,
  GenerateLabelRequest,
  BatchGenerateRequest,
} from '@/types/labels'

// ============ Template Queries ============

export function useLabelTemplates(params?: LabelTemplateListParams) {
  return useQuery({
    queryKey: ['label-templates', 'list', params],
    queryFn: () => labelTemplatesApi.list(params),
  })
}

export function useLabelTemplate(id: number) {
  return useQuery({
    queryKey: ['label-templates', id],
    queryFn: () => labelTemplatesApi.get(id),
    enabled: !!id && id > 0,
  })
}

// ============ Template Mutations ============

export function useCreateLabelTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LabelTemplateCreate) => labelTemplatesApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] })
      toast({
        title: 'Mal opprettet',
        description: `Malen "${data.name}" ble opprettet`,
      })
    },
    onError: (error) => {
      logError(error, 'Failed to create label template')
      toast({
        title: 'Feil ved opprettelse',
        description: getCrudErrorMessage('create', 'label template', error),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateLabelTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LabelTemplateUpdate }) =>
      labelTemplatesApi.update(id, data),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] })
      queryClient.invalidateQueries({ queryKey: ['label-templates', id] })
      toast({
        title: 'Mal oppdatert',
        description: `Malen "${data.name}" ble oppdatert`,
      })
    },
    onError: (error) => {
      logError(error, 'Failed to update label template')
      toast({
        title: 'Feil ved oppdatering',
        description: getCrudErrorMessage('update', 'label template', error),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteLabelTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => labelTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] })
      toast({
        title: 'Mal slettet',
        description: 'Malen ble slettet',
      })
    },
    onError: (error) => {
      logError(error, 'Failed to delete label template')
      toast({
        title: 'Feil ved sletting',
        description: getCrudErrorMessage('delete', 'label template', error),
        variant: 'destructive',
      })
    },
  })
}

// ============ Sharing ============

export function useShareTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: number
      data: TemplateShareCreate
    }) => labelTemplatesApi.share(templateId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['label-templates', templateId] })
      toast({
        title: 'Mal delt',
        description: 'Malen ble delt med brukeren',
      })
    },
    onError: (error) => {
      logError(error, 'Failed to share template')
      toast({
        title: 'Feil ved deling',
        description: 'Kunne ikke dele malen',
        variant: 'destructive',
      })
    },
  })
}

export function useRemoveShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, userId }: { templateId: number; userId: number }) =>
      labelTemplatesApi.removeShare(templateId, userId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['label-templates', templateId] })
      toast({
        title: 'Deling fjernet',
        description: 'Delingen ble fjernet',
      })
    },
    onError: (error) => {
      logError(error, 'Failed to remove share')
      toast({
        title: 'Feil ved fjerning av deling',
        description: 'Kunne ikke fjerne delingen',
        variant: 'destructive',
      })
    },
  })
}

// ============ Print History ============

export function usePrintHistory(templateId?: number) {
  return useQuery({
    queryKey: ['print-history', templateId],
    queryFn: () => labelTemplatesApi.getPrintHistory(templateId),
  })
}

export function useLogPrint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PrintHistoryCreate) => labelTemplatesApi.logPrint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-history'] })
    },
  })
}

// ============ Data Sources ============

export function useDataSourceTables() {
  return useQuery({
    queryKey: ['data-sources', 'tables'],
    queryFn: () => labelTemplatesApi.getTables(),
  })
}

export function useDataSourceColumns(table: string) {
  return useQuery({
    queryKey: ['data-sources', 'columns', table],
    queryFn: () => labelTemplatesApi.getColumns(table),
    enabled: !!table,
  })
}

export function useDataSourceSearch(table: string, column: string, search: string) {
  return useQuery({
    queryKey: ['data-sources', 'data', table, column, search],
    queryFn: () => labelTemplatesApi.searchData(table, column, search),
    enabled: !!table && !!column,
  })
}

// ============ PDF Generation ============

export function usePreviewLabel() {
  return useMutation({
    mutationFn: (data: PreviewLabelRequest) => labelsApi.preview(data),
    onError: (error) => {
      logError(error, 'Failed to generate preview')
      toast({
        title: 'Feil ved forhåndsvisning',
        description: 'Kunne ikke generere forhåndsvisning',
        variant: 'destructive',
      })
    },
  })
}

export function useGenerateLabel() {
  return useMutation({
    mutationFn: (data: GenerateLabelRequest) => labelsApi.generate(data),
    onError: (error) => {
      logError(error, 'Failed to generate PDF')
      toast({
        title: 'Feil ved PDF-generering',
        description: 'Kunne ikke generere PDF',
        variant: 'destructive',
      })
    },
  })
}

export function useGenerateBatchLabels() {
  return useMutation({
    mutationFn: (data: BatchGenerateRequest) => labelsApi.batch(data),
    onError: (error) => {
      logError(error, 'Failed to generate batch PDF')
      toast({
        title: 'Feil ved batch-generering',
        description: 'Kunne ikke generere batch PDF',
        variant: 'destructive',
      })
    },
  })
}
