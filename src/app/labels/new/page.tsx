'use client'

import { useRouter } from 'next/navigation'
import { LabelDesigner } from '@/components/label-designer/LabelDesigner'
import { useCreateLabelTemplate } from '@/hooks/useLabelTemplates'
import { ErrorBoundary } from '@/components/error/error-boundary'
import type { PdfmeTemplate, PrinterConfig } from '@/types/labels'

interface SaveData {
  name: string
  template: PdfmeTemplate
  width: number
  height: number
  printerConfig?: PrinterConfig
}

function NewLabelPageContent() {
  const router = useRouter()
  const createMutation = useCreateLabelTemplate()

  const handleSave = async ({ name, template, width, height, printerConfig }: SaveData) => {
    await createMutation.mutateAsync({
      name,
      template_json: template,
      width_mm: width,
      height_mm: height,
      is_global: false,
      printer_config: printerConfig,
      parameters: [],
    })
    router.push('/labels')
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <LabelDesigner
        onSave={handleSave}
        isSaving={createMutation.isPending}
      />
    </div>
  )
}

export default function NewLabelPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <NewLabelPageContent />
    </ErrorBoundary>
  )
}
