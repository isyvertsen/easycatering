'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { LabelDesigner } from '@/components/label-designer/LabelDesigner'
import { useLabelTemplate, useUpdateLabelTemplate } from '@/hooks/useLabelTemplates'
import { ErrorBoundary } from '@/components/error/error-boundary'
import { Loader2 } from 'lucide-react'
import type { PdfmeTemplate, PrinterConfig } from '@/types/labels'

interface LabelEditPageProps {
  params: Promise<{ id: string }>
}

interface SaveData {
  name: string
  template: PdfmeTemplate
  width: number
  height: number
  printerConfig?: PrinterConfig
}

function LabelEditPageContent({ params }: LabelEditPageProps) {
  const router = useRouter()
  const { id } = use(params)
  const templateId = Number(id)

  const { data: template, isLoading, error } = useLabelTemplate(templateId)
  const updateMutation = useUpdateLabelTemplate()

  const handleSave = async ({ name, template: templateJson, width, height, printerConfig }: SaveData) => {
    await updateMutation.mutateAsync({
      id: templateId,
      data: {
        name,
        template_json: templateJson,
        width_mm: width,
        height_mm: height,
        printer_config: printerConfig,
      },
    })
    router.push('/labels')
  }

  if (isLoading) {
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
          <button
            onClick={() => router.push('/labels')}
            className="text-primary underline"
          >
            Tilbake til maler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <LabelDesigner
        initialTemplate={template.template_json}
        initialName={template.name}
        width={Number(template.width_mm)}
        height={Number(template.height_mm)}
        initialPrinterConfig={template.printer_config}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </div>
  )
}

export default function LabelEditPage({ params }: LabelEditPageProps) {
  return (
    <ErrorBoundary showDetails={true}>
      <LabelEditPageContent params={params} />
    </ErrorBoundary>
  )
}
