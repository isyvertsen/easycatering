'use client'

import { useState, useEffect, useCallback } from 'react'
import { browserPrintService } from '@/lib/browserprint'
import type { ZebraPrinter } from '@/types/labels'

interface UseBrowserPrintReturn {
  printers: ZebraPrinter[]
  defaultPrinter: ZebraPrinter | null
  selectedPrinter: ZebraPrinter | null
  setSelectedPrinter: (printer: ZebraPrinter | null) => void
  isLoading: boolean
  isAvailable: boolean
  error: string | null
  refresh: () => Promise<void>
  print: (pdfData: ArrayBuffer) => Promise<void>
  printRaw: (data: string) => Promise<void>
}

export function useBrowserPrint(): UseBrowserPrintReturn {
  const [printers, setPrinters] = useState<ZebraPrinter[]>([])
  const [defaultPrinter, setDefaultPrinter] = useState<ZebraPrinter | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState<ZebraPrinter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if service is available
      const available = await browserPrintService.isAvailable()
      setIsAvailable(available)

      if (!available) {
        setError('Zebra Browser Print er ikke tilgjengelig. Sjekk at programmet kjorer.')
        return
      }

      // Fetch printers in parallel
      const [printerList, defaultDevice] = await Promise.all([
        browserPrintService.getLocalPrinters(),
        browserPrintService.getDefaultPrinter(),
      ])

      setPrinters(printerList)
      setDefaultPrinter(defaultDevice)

      // Auto-select default printer if none selected
      if (!selectedPrinter && defaultDevice) {
        setSelectedPrinter(defaultDevice)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente printere')
      setIsAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPrinter])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const print = useCallback(
    async (pdfData: ArrayBuffer) => {
      if (!selectedPrinter) {
        throw new Error('Ingen printer valgt')
      }
      await browserPrintService.print(selectedPrinter, pdfData)
    },
    [selectedPrinter]
  )

  const printRaw = useCallback(
    async (data: string) => {
      if (!selectedPrinter) {
        throw new Error('Ingen printer valgt')
      }
      await browserPrintService.printRaw(selectedPrinter, data)
    },
    [selectedPrinter]
  )

  return {
    printers,
    defaultPrinter,
    selectedPrinter,
    setSelectedPrinter,
    isLoading,
    isAvailable,
    error,
    refresh,
    print,
    printRaw,
  }
}
