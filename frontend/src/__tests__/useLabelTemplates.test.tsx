import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

import { apiClient } from '@/lib/api-client'
import {
  useLabelTemplates,
  useLabelTemplate,
  useCreateLabelTemplate,
  useUpdateLabelTemplate,
  useDeleteLabelTemplate,
  usePreviewLabel,
  useDataSourceTables,
  useDataSourceColumns,
} from '@/hooks/useLabelTemplates'

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useLabelTemplates hooks', () => {
  const mockTemplates = [
    {
      id: 1,
      name: 'Template 1',
      description: 'Description 1',
      template_json: { schemas: [[]], basePdf: { width: 100, height: 50 } },
      width_mm: 100,
      height_mm: 50,
      is_global: false,
      created_at: '2024-01-01T00:00:00Z',
      parameters: [],
    },
    {
      id: 2,
      name: 'Template 2',
      description: 'Description 2',
      template_json: { schemas: [[]], basePdf: { width: 100, height: 100 } },
      width_mm: 100,
      height_mm: 100,
      is_global: true,
      created_at: '2024-01-02T00:00:00Z',
      parameters: [],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useLabelTemplates', () => {
    it('should fetch label templates list', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockTemplates })

      const { result } = renderHook(() => useLabelTemplates(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.get).toHaveBeenCalledWith('/v1/label-templates/?')
      expect(result.current.data).toEqual(mockTemplates)
    })

    it('should handle fetch error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useLabelTemplates(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useLabelTemplate', () => {
    it('should fetch single template by id', async () => {
      const template = mockTemplates[0]
      ;(apiClient.get as jest.Mock).mockResolvedValue({ data: template })

      const { result } = renderHook(() => useLabelTemplate(1), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.get).toHaveBeenCalledWith('/v1/label-templates/1')
      expect(result.current.data).toEqual(template)
    })

    it('should not fetch when id is 0 or undefined', async () => {
      const { result } = renderHook(() => useLabelTemplate(0), {
        wrapper: createWrapper(),
      })

      // Should be idle/disabled
      expect(result.current.isFetching).toBe(false)
      expect(apiClient.get).not.toHaveBeenCalled()
    })
  })

  describe('useCreateLabelTemplate', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        name: 'New Template',
        template_json: { schemas: [[]], basePdf: { width: 100, height: 50 } },
        width_mm: 100,
        height_mm: 50,
        is_global: false,
        parameters: [],
      }

      const createdTemplate = { id: 3, ...newTemplate, created_at: '2024-01-03T00:00:00Z' }
      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: createdTemplate })

      const { result } = renderHook(() => useCreateLabelTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newTemplate)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.post).toHaveBeenCalledWith('/v1/label-templates/', newTemplate)
      expect(result.current.data).toEqual(createdTemplate)
    })
  })

  describe('useUpdateLabelTemplate', () => {
    it('should update an existing template', async () => {
      const updateData = { name: 'Updated Name' }
      const updatedTemplate = { ...mockTemplates[0], name: 'Updated Name' }
      ;(apiClient.put as jest.Mock).mockResolvedValue({ data: updatedTemplate })

      const { result } = renderHook(() => useUpdateLabelTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 1, data: updateData })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.put).toHaveBeenCalledWith('/v1/label-templates/1', updateData)
      expect(result.current.data).toEqual(updatedTemplate)
    })
  })

  describe('useDeleteLabelTemplate', () => {
    it('should delete a template', async () => {
      ;(apiClient.delete as jest.Mock).mockResolvedValue({})

      const { result } = renderHook(() => useDeleteLabelTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(1)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/label-templates/1')
    })
  })

  describe('usePreviewLabel', () => {
    it('should generate preview', async () => {
      const previewRequest = {
        template_json: { schemas: [[]], basePdf: { width: 100, height: 50 } },
        inputs: { title: 'Test' },
        width_mm: 100,
        height_mm: 50,
      }

      const previewResponse = {
        preview: 'base64encodedpdf',
        content_type: 'application/pdf',
      }

      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: previewResponse })

      const { result } = renderHook(() => usePreviewLabel(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(previewRequest)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.post).toHaveBeenCalledWith('/v1/labels/preview', previewRequest)
      expect(result.current.data).toEqual(previewResponse)
    })
  })

  describe('useDataSourceTables', () => {
    it('should fetch available tables', async () => {
      const tables = ['tblprodukter', 'tblkunder', 'tblordrer']
      ;(apiClient.get as jest.Mock).mockResolvedValue({ data: tables })

      const { result } = renderHook(() => useDataSourceTables(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.get).toHaveBeenCalledWith('/v1/label-templates/sources/tables')
      expect(result.current.data).toEqual(tables)
    })
  })

  describe('useDataSourceColumns', () => {
    it('should fetch columns for a table', async () => {
      const columns = [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'varchar' },
        { name: 'price', type: 'decimal' },
      ]
      ;(apiClient.get as jest.Mock).mockResolvedValue({ data: columns })

      const { result } = renderHook(() => useDataSourceColumns('tblprodukter'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(apiClient.get).toHaveBeenCalledWith(
        '/v1/label-templates/sources/columns?table=tblprodukter'
      )
      expect(result.current.data).toEqual(columns)
    })

    it('should not fetch when table is empty', async () => {
      const { result } = renderHook(() => useDataSourceColumns(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(apiClient.get).not.toHaveBeenCalled()
    })
  })
})
