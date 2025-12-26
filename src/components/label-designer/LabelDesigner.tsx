'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Save, Undo, Redo, PanelLeftClose, PanelLeft } from 'lucide-react'
import type { LabelDesignerProps } from '@/types/labels'
import { LABEL_SIZE_PRESETS } from '@/types/labels'
import { VariablesSidebar } from './VariablesSidebar'
import type { LabelVariable } from '@/config/label-variables'

/**
 * Create a basePdf object with custom dimensions (in mm)
 */
function createBasePdf(widthMm: number, heightMm: number) {
  return {
    width: widthMm,
    height: heightMm,
    padding: [0, 0, 0, 0] as [number, number, number, number],
  }
}

/**
 * LabelDesigner - Visual label designer using pdfme
 *
 * This component wraps the pdfme Designer to provide a visual
 * drag-and-drop interface for creating label templates.
 */
export function LabelDesigner({
  initialTemplate,
  initialName = '',
  width = 100,
  height = 50,
  onSave,
  isSaving = false,
}: LabelDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const designerRef = useRef<any>(null)
  const [name, setName] = useState(initialName)
  const [size, setSize] = useState({ width, height })
  const [isLoaded, setIsLoaded] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; callback: (() => void) | null }>({
    show: false,
    callback: null,
  })

  // Initialize pdfme designer
  useEffect(() => {
    let mounted = true

    const initDesigner = async () => {
      if (!containerRef.current || designerRef.current) return

      try {
        // Dynamic import of pdfme
        const { Designer } = await import('@pdfme/ui')
        const pdfmeSchemas = await import('@pdfme/schemas')

        if (!mounted || !containerRef.current) return

        // pdfme v4 template structure with custom page size
        const template = initialTemplate || {
          basePdf: createBasePdf(width, height),
          schemas: [{}],
        }

        // If initialTemplate exists but uses BLANK_PDF, replace with custom size
        if (initialTemplate && typeof initialTemplate.basePdf === 'string') {
          template.basePdf = createBasePdf(width, height)
        }

        // Configure plugins - basic elements first, then shapes, then barcodes
        const plugins = {
          // Basic elements
          Text: pdfmeSchemas.text,
          Image: pdfmeSchemas.image,
          // Shapes (lines, rectangles/boxes)
          Line: pdfmeSchemas.line,
          Rectangle: pdfmeSchemas.rectangle,
          // Barcode types
          qrcode: pdfmeSchemas.barcodes.qrcode,
          code128: pdfmeSchemas.barcodes.code128,
          ean13: pdfmeSchemas.barcodes.ean13,
          ean8: pdfmeSchemas.barcodes.ean8,
          upca: pdfmeSchemas.barcodes.upca,
          upce: pdfmeSchemas.barcodes.upce,
          code39: pdfmeSchemas.barcodes.code39,
          itf14: pdfmeSchemas.barcodes.itf14,
          japanpost: pdfmeSchemas.barcodes.japanpost,
          nw7: pdfmeSchemas.barcodes.nw7,
          gs1datamatrix: pdfmeSchemas.barcodes.gs1datamatrix,
        }

        // Create designer instance
        designerRef.current = new Designer({
          domContainer: containerRef.current,
          template: template as any,
          plugins,
        })

        setIsLoaded(true)
      } catch (error) {
        console.error('Failed to initialize pdfme designer:', error)
      }
    }

    initDesigner()

    return () => {
      mounted = false
      if (designerRef.current) {
        try {
          designerRef.current.destroy()
        } catch (e) {
          // Ignore cleanup errors
        }
        designerRef.current = null
      }
    }
  }, [width, height])

  // Update template size when size changes
  const handleSizeChange = useCallback(
    (newSize: string) => {
      const preset = LABEL_SIZE_PRESETS.find((p) => `${p.width_mm}x${p.height_mm}` === newSize)
      if (preset && designerRef.current) {
        setSize({ width: preset.width_mm, height: preset.height_mm })

        // Update the pdfme designer template with new page dimensions
        try {
          const currentTemplate = designerRef.current.getTemplate()
          const updatedTemplate = {
            ...currentTemplate,
            basePdf: createBasePdf(preset.width_mm, preset.height_mm),
          }
          designerRef.current.updateTemplate(updatedTemplate)
        } catch (error) {
          console.error('Failed to update template size:', error)
        }
      }
    },
    []
  )

  // Handle save
  const handleSave = useCallback(() => {
    if (!designerRef.current || !name.trim()) return

    try {
      const pdfmeTemplate = designerRef.current.getTemplate()
      onSave({
        name: name.trim(),
        template: pdfmeTemplate,
        width: size.width,
        height: size.height,
      })
    } catch (error) {
      console.error('Failed to get template:', error)
    }
  }, [name, size, onSave])

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    if (designerRef.current?.canUndo?.()) {
      designerRef.current.undo()
    }
  }, [])

  const handleRedo = useCallback(() => {
    if (designerRef.current?.canRedo?.()) {
      designerRef.current.redo()
    }
  }, [])

  // Add variable as text field to the canvas
  const handleVariableClick = useCallback((variable: LabelVariable) => {
    if (!designerRef.current) return

    try {
      const currentTemplate = designerRef.current.getTemplate()
      const schemas = currentTemplate.schemas[0] || {}

      // Create a unique field name
      let fieldName = variable.name
      let counter = 1
      while (schemas[fieldName]) {
        fieldName = `${variable.name}_${counter}`
        counter++
      }

      // Add new text schema with the variable placeholder
      const newSchema = {
        ...schemas,
        [fieldName]: {
          type: 'text',
          position: { x: 10, y: 10 },
          width: 40,
          height: 8,
          fontSize: 10,
          content: `{{${variable.name}}}`,
        },
      }

      const updatedTemplate = {
        ...currentTemplate,
        schemas: [newSchema],
      }

      designerRef.current.updateTemplate(updatedTemplate)
    } catch (error) {
      console.error('Failed to add variable:', error)
    }
  }, [])

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm.callback) {
      deleteConfirm.callback()
    }
    setDeleteConfirm({ show: false, callback: null })
  }, [deleteConfirm])

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm({ show: false, callback: null })
  }, [])

  const currentSizeValue = `${size.width}x${size.height}`

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Label htmlFor="template-name" className="sr-only">
            Malnavn
          </Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Malnavn"
            className="w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="size-select" className="text-sm text-muted-foreground">
            Størrelse:
          </Label>
          <Select value={currentSizeValue} onValueChange={handleSizeChange}>
            <SelectTrigger id="size-select" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABEL_SIZE_PRESETS.map((preset) => (
                <SelectItem
                  key={`${preset.width_mm}x${preset.height_mm}`}
                  value={`${preset.width_mm}x${preset.height_mm}`}
                >
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleUndo} title="Angre">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRedo} title="Gjør om">
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Lagrer...' : 'Lagre'}
        </Button>
      </div>

      {/* Main content with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Variables sidebar */}
        <VariablesSidebar
          onVariableClick={handleVariableClick}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Designer container */}
        <div className="flex-1 relative">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">Laster designer...</div>
            </div>
          )}
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirm.show} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett felt</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette dette feltet? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
