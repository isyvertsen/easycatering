'use client'

import { useBrowserPrint } from '@/hooks/useBrowserPrint'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, Printer } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PrinterSelectorProps {
  className?: string
}

export function PrinterSelector({ className }: PrinterSelectorProps) {
  const {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    isLoading,
    isAvailable,
    error,
    refresh,
  } = useBrowserPrint()

  if (!isAvailable && !isLoading) {
    return (
      <div className={className}>
        <Label className="mb-2 block">Printer</Label>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              {error || 'Zebra Browser Print er ikke tilgjengelig'}
            </span>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Label>Printer</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="h-6 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Select
        value={selectedPrinter?.uid || ''}
        onValueChange={(uid) => {
          const printer = printers.find((p) => p.uid === uid)
          setSelectedPrinter(printer || null)
        }}
        disabled={isLoading || printers.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Laster printere...' : 'Velg printer'}>
            {selectedPrinter && (
              <span className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                {selectedPrinter.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {printers.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Ingen printere funnet
            </div>
          ) : (
            printers.map((printer) => (
              <SelectItem key={printer.uid} value={printer.uid}>
                <span className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  {printer.name}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
