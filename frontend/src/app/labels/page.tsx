'use client'

import { TemplateLibrary } from '@/components/label-designer/TemplateLibrary'
import { ErrorBoundary } from '@/components/error/error-boundary'

function LabelsPageContent() {
  return (
    <div className="container mx-auto py-6">
      <TemplateLibrary />
    </div>
  )
}

export default function LabelsPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <LabelsPageContent />
    </ErrorBoundary>
  )
}
