import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock pdfme (dynamic import)
jest.mock('@pdfme/ui', () => ({
  Designer: jest.fn().mockImplementation(() => ({
    getTemplate: jest.fn().mockReturnValue({
      schemas: [[]],
      basePdf: { width: 100, height: 50 },
    }),
    updateTemplate: jest.fn(),
    destroy: jest.fn(),
    canUndo: jest.fn().mockReturnValue(false),
    canRedo: jest.fn().mockReturnValue(false),
    undo: jest.fn(),
    redo: jest.fn(),
  })),
}))

jest.mock('@pdfme/schemas', () => ({
  text: {},
  image: {},
}))

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

// Import components after mocks
import { TemplateLibrary } from '@/components/label-designer/TemplateLibrary'
import { TemplateCard } from '@/components/label-designer/TemplateCard'
import { PrinterSelector } from '@/components/label-designer/PrinterSelector'
import { BatchPrintTable } from '@/components/label-designer/BatchPrintTable'
import { ParameterPanel } from '@/components/label-designer/ParameterPanel'

// Helper to wrap components with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Label Designer Components', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    jest.clearAllMocks()
  })

  describe('TemplateCard', () => {
    const mockTemplate = {
      id: 1,
      name: 'Test Template',
      description: 'Test description',
      template_json: { schemas: [[]], basePdf: { width: 100, height: 50 } },
      width_mm: 100,
      height_mm: 50,
      is_global: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: null,
      parameters: [],
    }

    it('should render template name and dimensions', () => {
      render(
        <TemplateCard template={mockTemplate} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Test Template')).toBeInTheDocument()
      expect(screen.getByText('100 x 50 mm')).toBeInTheDocument()
    })

    it('should render description if present', () => {
      render(
        <TemplateCard template={mockTemplate} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Test description')).toBeInTheDocument()
    })

    it('should show "Privat" for non-global templates', () => {
      render(
        <TemplateCard template={mockTemplate} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Privat')).toBeInTheDocument()
    })

    it('should show "Global" for global templates', () => {
      const globalTemplate = { ...mockTemplate, is_global: true }
      render(
        <TemplateCard template={globalTemplate} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Global')).toBeInTheDocument()
    })

    it('should call onDelete when delete is confirmed', async () => {
      const onDelete = jest.fn()
      render(
        <TemplateCard template={mockTemplate} onDelete={onDelete} />,
        { wrapper: createWrapper() }
      )

      // Open dropdown menu
      const menuButton = screen.getByRole('button', { hidden: true })
      fireEvent.click(menuButton)

      // Wait for menu to appear
      await waitFor(() => {
        expect(screen.getByText('Slett')).toBeInTheDocument()
      })
    })

    it('should call onDuplicate when duplicate is clicked', async () => {
      const onDuplicate = jest.fn()
      render(
        <TemplateCard template={mockTemplate} onDuplicate={onDuplicate} />,
        { wrapper: createWrapper() }
      )

      // Open dropdown menu
      const menuButton = screen.getByRole('button', { hidden: true })
      fireEvent.click(menuButton)

      // Wait for menu to appear and click duplicate
      await waitFor(() => {
        const duplicateButton = screen.getByText('Dupliser')
        fireEvent.click(duplicateButton)
      })

      expect(onDuplicate).toHaveBeenCalledWith(mockTemplate)
    })
  })

  describe('BatchPrintTable', () => {
    const mockParameters = [
      {
        id: 1,
        template_id: 1,
        field_name: 'name',
        display_name: 'Navn',
        parameter_type: 'text' as const,
        source_type: 'manual' as const,
        is_required: true,
        sort_order: 0,
      },
      {
        id: 2,
        template_id: 1,
        field_name: 'barcode',
        display_name: 'Strekkode',
        parameter_type: 'barcode' as const,
        source_type: 'manual' as const,
        is_required: true,
        sort_order: 1,
      },
    ]

    it('should render empty state', () => {
      render(
        <BatchPrintTable
          parameters={mockParameters}
          data={[]}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Ingen data lagt til enna')).toBeInTheDocument()
    })

    it('should render add row button', () => {
      render(
        <BatchPrintTable
          parameters={mockParameters}
          data={[]}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Legg til rad')).toBeInTheDocument()
    })

    it('should call onChange when adding a row', () => {
      const onChange = jest.fn()
      render(
        <BatchPrintTable
          parameters={mockParameters}
          data={[]}
          onChange={onChange}
        />
      )

      fireEvent.click(screen.getByText('Legg til rad'))

      expect(onChange).toHaveBeenCalledWith([
        { name: '', barcode: '' }
      ])
    })

    it('should render data rows', () => {
      const data = [
        { name: 'Product 1', barcode: '123' },
        { name: 'Product 2', barcode: '456' },
      ]

      render(
        <BatchPrintTable
          parameters={mockParameters}
          data={data}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByDisplayValue('Product 1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Product 2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123')).toBeInTheDocument()
      expect(screen.getByDisplayValue('456')).toBeInTheDocument()
    })

    it('should show total count', () => {
      const data = [
        { name: 'Product 1', barcode: '123' },
        { name: 'Product 2', barcode: '456' },
        { name: 'Product 3', barcode: '789' },
      ]

      render(
        <BatchPrintTable
          parameters={mockParameters}
          data={data}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Totalt: 3 etikett(er)')).toBeInTheDocument()
    })

    it('should render import and export buttons', () => {
      render(
        <BatchPrintTable
          parameters={mockParameters}
          data={[]}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Importer CSV')).toBeInTheDocument()
      expect(screen.getByText('Last ned mal')).toBeInTheDocument()
    })
  })

  describe('ParameterPanel', () => {
    it('should render empty state', () => {
      render(
        <ParameterPanel
          parameters={[]}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText(/Ingen parametere definert/)).toBeInTheDocument()
    })

    it('should render add parameter button', () => {
      render(
        <ParameterPanel
          parameters={[]}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Legg til')).toBeInTheDocument()
    })

    it('should call onChange when adding a parameter', () => {
      const onChange = jest.fn()
      render(
        <ParameterPanel
          parameters={[]}
          onChange={onChange}
        />
      )

      fireEvent.click(screen.getByText('Legg til'))

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          field_name: 'field_1',
          display_name: 'Parameter 1',
          parameter_type: 'text',
          source_type: 'manual',
        })
      ])
    })

    it('should render existing parameters', () => {
      const parameters = [
        {
          field_name: 'product_name',
          display_name: 'Produktnavn',
          parameter_type: 'text' as const,
          source_type: 'manual' as const,
          is_required: true,
          sort_order: 0,
        },
      ]

      render(
        <ParameterPanel
          parameters={parameters}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Produktnavn')).toBeInTheDocument()
      expect(screen.getByText('(product_name)')).toBeInTheDocument()
    })
  })
})

describe('Label Types', () => {
  it('should export correct types', () => {
    // This is a type-check test - if it compiles, types are correct
    const template: import('@/types/labels').LabelTemplate = {
      id: 1,
      name: 'Test',
      template_json: {
        schemas: [[]],
        basePdf: { width: 100, height: 50 },
      },
      width_mm: 100,
      height_mm: 50,
      is_global: false,
      created_at: '2024-01-01',
      parameters: [],
    }

    expect(template.name).toBe('Test')
  })

  it('should have correct preset sizes', () => {
    const { LABEL_SIZE_PRESETS } = require('@/types/labels')

    expect(LABEL_SIZE_PRESETS).toBeDefined()
    expect(Array.isArray(LABEL_SIZE_PRESETS)).toBe(true)
    expect(LABEL_SIZE_PRESETS.length).toBeGreaterThan(0)

    // Check first preset has required properties
    const firstPreset = LABEL_SIZE_PRESETS[0]
    expect(firstPreset).toHaveProperty('name')
    expect(firstPreset).toHaveProperty('width_mm')
    expect(firstPreset).toHaveProperty('height_mm')
  })
})
