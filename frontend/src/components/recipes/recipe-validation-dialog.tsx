"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { RecipeValidationWarning } from '@/lib/api/recipes'

interface RecipeValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warnings: RecipeValidationWarning[]
  summary: string
  onConfirm: () => void
  onCancel: () => void
}

export function RecipeValidationDialog({
  open,
  onOpenChange,
  warnings,
  summary,
  onConfirm,
  onCancel,
}: RecipeValidationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950'
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      case 'low':
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950'
      default:
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Høy alvorlighet'
      case 'medium':
        return 'Middels alvorlighet'
      case 'low':
        return 'Lav alvorlighet'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            Oppskriftsvalidering
          </DialogTitle>
          <DialogDescription>
            AI-analysen har oppdaget mulige uvanlige mengder i oppskriften.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              {summary}
            </p>
          </div>

          <div className="space-y-3">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className={`p-4 rounded-md ${getSeverityColor(warning.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(warning.severity)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">
                        {warning.ingredient}
                      </h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800">
                        {getSeverityText(warning.severity)}
                      </span>
                    </div>
                    <p className="text-sm font-mono">
                      {warning.amount_per_portion} {warning.unit} per porsjon
                    </p>
                    <p className="text-sm">
                      {warning.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Vennligst sjekk:</strong> Er disse mengdene riktige for oppskriften?
              Du kan fortsette med PDF-nedlasting hvis du er sikker på at oppskriften er korrekt,
              eller avbryte for å sjekke og rette eventuelle feil.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Avbryt
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
          >
            Fortsett likevel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
