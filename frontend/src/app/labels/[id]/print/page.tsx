'use client'

import { use, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLabelTemplate, useGenerateLabel, usePreviewLabel, useLogPrint } from '@/hooks/useLabelTemplates'
import { useBrowserPrint } from '@/hooks/useBrowserPrint'
import { ErrorBoundary } from '@/components/error/error-boundary'
import { PrinterSelector } from '@/components/label-designer/PrinterSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, Eye, Printer } from 'lucide-react'

interface PrintPageProps {
  params: Promise<{ id: string }>
}

function PrintPageContent({ params }: PrintPageProps) {
  const router = useRouter()
  const { id } = use(params)
  const templateId = Number(id)

  const { data: template, isLoading: isLoadingTemplate, error } = useLabelTemplate(templateId)
  const { selectedPrinter, print, isAvailable } = useBrowserPrint()
  const generateMutation = useGenerateLabel()
  const previewMutation = usePreviewLabel()
  const logPrintMutation = useLogPrint()

  // Initialize inputs from template parameters
  const initialInputs = useMemo(() => {
    if (!template) return {}
    const inputs: Record<string, string> = {}
    template.parameters.forEach((p) => {
      inputs[p.field_name] = p.default_value || ''
    })
    return inputs
  }, [template])

  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [copies, setCopies] = useState(1)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // Initialize inputs when template loads
  if (template && Object.keys(inputs).length === 0 && template.parameters.length > 0) {
    setInputs(initialInputs)
  }

  const handleInputChange = (fieldName: string, value: string) => {
    setInputs((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handlePreview = async () => {
    if (!template) return

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
    if (!template || !selectedPrinter) return

    setIsPrinting(true)

    try {
      const pdfBlob = await generateMutation.mutateAsync({
        template_id: template.id,
        inputs,
        copies,
      })

      const arrayBuffer = await pdfBlob.arrayBuffer()
      await print(arrayBuffer)

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ukjent feil'

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

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <p className="text-destructive mb-2">
            {error ? 'Kunne ikke laste malen' : 'Malen ble ikke funnet'}
          </p>
          <Link href="/labels" className="text-primary underline">
            Tilbake til maler
          </Link>
        </div>
      </div>
    )
  }

  const isDisabled = isPrinting || !isAvailable || !selectedPrinter

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Skriv ut: {template.name}</h1>
          <p className="text-muted-foreground text-sm">
            {template.width_mm} x {template.height_mm} mm
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Printer</CardTitle>
            </CardHeader>
            <CardContent>
              <PrinterSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Utskriftsinnstillinger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {template.parameters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parametere</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.parameters
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((param) => (
                    <div key={param.id}>
                      <Label htmlFor={param.field_name}>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Forhandsvisning</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/50 min-h-[300px] flex items-center justify-center">
                {previewMutation.isPending ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : preview ? (
                  <img
                    src={`data:image/png;base64,${preview}`}
                    alt="Forhandsvisning"
                    className="max-w-full max-h-[280px] object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Klikk pa oyeikonet for a se forhandsvisning</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handlePrint}
            disabled={isDisabled}
            className="w-full h-12 text-lg"
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Skriver ut...
              </>
            ) : (
              <>
                <Printer className="h-5 w-5 mr-2" />
                Skriv ut {copies > 1 ? `(${copies} kopier)` : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PrintPage({ params }: PrintPageProps) {
  return (
    <ErrorBoundary showDetails={true}>
      <PrintPageContent params={params} />
    </ErrorBoundary>
  )
}
