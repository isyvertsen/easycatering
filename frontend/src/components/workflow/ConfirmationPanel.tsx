'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConfirmationRequest } from '@/types/workflow'

interface ConfirmationPanelProps {
  confirmation: ConfirmationRequest
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

export function ConfirmationPanel({
  confirmation,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmationPanelProps) {
  const safetyLevel = confirmation.safety_level

  // Determine colors based on safety level
  const isDangerous = safetyLevel === 'delete'
  const isModify = safetyLevel === 'update' || safetyLevel === 'write'

  return (
    <Card className={cn(
      'border-2',
      isDangerous ? 'border-destructive/50 bg-destructive/5' :
      isModify ? 'border-amber-500/50 bg-amber-500/5' :
      'border-primary/50 bg-primary/5'
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {isDangerous ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : isModify ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-primary" />
          )}
          Bekreft handling
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="font-medium mb-2">{confirmation.summary}</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          {confirmation.details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        {isDangerous && (
          <p className="mt-3 text-sm text-destructive font-medium">
            Denne handlingen kan ikke angres.
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Avbryt
        </Button>
        <Button
          variant={isDangerous ? 'destructive' : 'default'}
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'flex-1',
            !isDangerous && 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-1" />
          )}
          {isDangerous ? 'Ja, slett' : 'Bekreft'}
        </Button>
      </CardFooter>
    </Card>
  )
}
