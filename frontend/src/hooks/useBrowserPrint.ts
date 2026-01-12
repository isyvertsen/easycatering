'use client'

import { useState, useEffect, useCallback } from 'react'
import { browserPrintService, type PrinterStatus } from '@/lib/browserprint'
import type { ZebraPrinter } from '@/types/labels'

// Check if BrowserPrint is enabled via environment variable
const isBrowserPrintEnabled = process.env.NEXT_PUBLIC_BROWSERPRINT_ENABLED !== 'false'

interface UseBrowserPrintReturn {
  printers: ZebraPrinter[]
  defaultPrinter: ZebraPrinter | null
  selectedPrinter: ZebraPrinter | null
  setSelectedPrinter: (printer: ZebraPrinter | null) => void
  isLoading: boolean
  isAvailable: boolean
  isEnabled: boolean
  error: string | null
  printerStatus: PrinterStatus | null
  refresh: () => Promise<void>
  print: (pdfData: ArrayBuffer) => Promise<void>
  printRaw: (data: string) => Promise<void>
  printTestLabel: () => Promise<void>
  refreshPrinterStatus: () => Promise<void>
}

export function useBrowserPrint(): UseBrowserPrintReturn {
  const [printers, setPrinters] = useState<ZebraPrinter[]>([])
  const [defaultPrinter, setDefaultPrinter] = useState<ZebraPrinter | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState<ZebraPrinter | null>(null)
  const [isLoading, setIsLoading] = useState(isBrowserPrintEnabled)
  const [isAvailable, setIsAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null)

  const refresh = useCallback(async () => {
    // Skip if BrowserPrint is disabled
    if (!isBrowserPrintEnabled) {
      setIsLoading(false)
      return
    }

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

  const printTestLabel = useCallback(async () => {
    if (!selectedPrinter) {
      throw new Error('Ingen printer valgt')
    }
    await browserPrintService.printTestLabel(selectedPrinter)
  }, [selectedPrinter])

  const refreshPrinterStatus = useCallback(async () => {
    if (!selectedPrinter) {
      setPrinterStatus(null)
      return
    }
    try {
      const statusResponse = await browserPrintService.getPrinterStatus(selectedPrinter)
      const status = browserPrintService.parsePrinterStatus(statusResponse)
      setPrinterStatus(status)
    } catch {
      setPrinterStatus({
        isReady: false,
        isPaused: false,
        hasError: true,
        headOpen: false,
        ribbonOut: false,
        mediaOut: false,
        message: 'Kunne ikke hente status',
      })
    }
  }, [selectedPrinter])

  // Refresh printer status when selected printer changes
  useEffect(() => {
    if (selectedPrinter && isAvailable) {
      refreshPrinterStatus()
    }
  }, [selectedPrinter, isAvailable, refreshPrinterStatus])

  return {
    printers,
    defaultPrinter,
    selectedPrinter,
    setSelectedPrinter,
    isLoading,
    isAvailable,
    isEnabled: isBrowserPrintEnabled,
    error,
    printerStatus,
    refresh,
    print,
    printRaw,
    printTestLabel,
    refreshPrinterStatus,
  }
}
