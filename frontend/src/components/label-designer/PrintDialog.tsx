'use client'

import { useState, useMemo } from 'react'
import { useBrowserPrint } from '@/hooks/useBrowserPrint'
import { useGenerateLabel, usePreviewLabel, useLogPrint } from '@/hooks/useLabelTemplates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PrinterSelector } from './PrinterSelector'
import { toast } from '@/hooks/use-toast'
import { Loader2, Eye } from 'lucide-react'
import type { LabelTemplate, PrintDialogProps } from '@/types/labels'

export function PrintDialog({ template, open, onOpenChange }: PrintDialogProps) {
  const { selectedPrinter, print, isAvailable } = useBrowserPrint()
  const generateMutation = useGenerateLabel()
  const previewMutation = usePreviewLabel()
  const logPrintMutation = useLogPrint()

  // Initialize inputs from template parameters
  const initialInputs = useMemo(() => {
    const inputs: Record<string, string> = {}
    template.parameters.forEach((p) => {
      inputs[p.field_name] = p.default_value || ''
    })
    return inputs
  }, [template.parameters])

  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs)
  const [copies, setCopies] = useState(1)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const handleInputChange = (fieldName: string, value: string) => {
    setInputs((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handlePreview = async () => {
    try {
      const result = await previewMutation.mutateAsync({
        template_json: template.template_json,
        inputs,
        width_mm: Number(template.width_mm),
        height_mm: Number(template.height_mm),
      })
      setPreview(result.preview)
    } catch {
      toast({
        title: 'Feil',
        description: 'Kunne ikke generere forhandsvisning',
        variant: 'destructive',
      })
    }
  }

  const handlePrint = async () => {
    if (!selectedPrinter) {
      toast({
        title: 'Ingen printer valgt',
        description: 'Velg en printer for du skriver ut',
        variant: 'destructive',
      })
      return
    }

    setIsPrinting(true)

    try {
      // Generate PDF
      const pdfBlob = await generateMutation.mutateAsync({
        template_id: template.id,
        inputs,
        copies,
      })

      // Convert to ArrayBuffer and send to printer
      const arrayBuffer = await pdfBlob.arrayBuffer()
      await print(arrayBuffer)

      // Log successful print
      await logPrintMutation.mutateAsync({
        template_id: template.id,
        printer_name: selectedPrinter.name,
        input_data: inputs,
        copies,
        status: 'success',
      })

      toast({
        title: 'Utskrift sendt',
        description: `${copies} etikett(er) sendt til ${selectedPrinter.name}`,
      })

      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ukjent feil'

      // Log failed print
      if (selectedPrinter) {
        await logPrintMutation.mutateAsync({
          template_id: template.id,
          printer_name: selectedPrinter.name,
          input_data: inputs,
          copies,
          status: 'failed',
          error_message: errorMessage,
        })
      }

      toast({
        title: 'Utskrift feilet',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const isDisabled = isPrinting || !isAvailable || !selectedPrinter

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Skriv ut: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left column: Settings */}
          <div className="space-y-4">
            <PrinterSelector />

            <div>
              <Label htmlFor="copies">Antall kopier</Label>
              <Input
                id="copies"
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            {template.parameters.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Parametere</Label>
                {template.parameters
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((param) => (
                    <div key={param.id}>
                      <Label htmlFor={param.field_name} className="text-sm">
                        {param.display_name}
                        {param.is_required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Input
                        id={param.field_name}
                        value={inputs[param.field_name] || ''}
                        onChange={(e) => handleInputChange(param.field_name, e.target.value)}
                        placeholder={param.default_value || ''}
                        required={param.is_required}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Right column: Preview */}
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="w-full"
            >
              {previewMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Forhandsvisning
            </Button>

            <div className="border rounded-lg p-4 bg-muted/50 min-h-[250px] flex items-center justify-center">
              {previewMutation.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : preview ? (
                <img
                  src={`data:image/png;base64,${preview}`}
                  alt="Forhandsvisning"
                  className="max-w-full max-h-[230px] object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-sm">
                  Klikk &quot;Forhandsvisning&quot; for a se etiketten
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center">
              {template.width_mm} x {template.height_mm} mm
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handlePrint} disabled={isDisabled}>
            {isPrinting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Skriver ut...
              </>
            ) : (
              'Skriv ut'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
