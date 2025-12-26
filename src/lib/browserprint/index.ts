/**
 * BrowserPrint Service Wrapper
 *
 * Provides integration with Zebra BrowserPrint SDK for printing to ZT510 printers.
 * Requires Zebra Browser Print application to be running locally.
 */
import type { ZebraPrinter } from '@/types/labels'

declare global {
  interface Window {
    BrowserPrint: {
      getLocalDevices: (
        callback: (devices: ZebraPrinter[]) => void,
        errorCallback: (error: string) => void,
        deviceType?: string
      ) => void
      getDefaultDevice: (
        deviceType: string,
        callback: (device: ZebraPrinter | null) => void,
        errorCallback: (error: string) => void
      ) => void
    }
  }
}

const BROWSERPRINT_URL = 'http://localhost:9100/'
const SDK_URL = `${BROWSERPRINT_URL}BrowserPrint.js`

export class BrowserPrintService {
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the BrowserPrint SDK by loading it dynamically
   */
  async init(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof window !== 'undefined' && window.BrowserPrint) {
        this.initialized = true
        resolve()
        return
      }

      // Check if we're in a browser
      if (typeof window === 'undefined') {
        reject(new Error('BrowserPrint kan kun brukes i nettleser'))
        return
      }

      // Load SDK dynamically
      const script = document.createElement('script')
      script.src = SDK_URL
      script.onload = () => {
        this.initialized = true
        resolve()
      }
      script.onerror = () => {
        this.initPromise = null
        reject(new Error('Kunne ikke laste BrowserPrint SDK. Er Zebra Browser Print kjorende?'))
      }
      document.head.appendChild(script)
    })

    return this.initPromise
  }

  /**
   * Check if BrowserPrint is available (SDK loaded and service running)
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.init()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all locally available printers
   */
  async getLocalPrinters(): Promise<ZebraPrinter[]> {
    await this.init()

    return new Promise((resolve, reject) => {
      window.BrowserPrint.getLocalDevices(
        (devices) => resolve(devices),
        (error) => reject(new Error(error)),
        'printer'
      )
    })
  }

  /**
   * Get the default printer
   */
  async getDefaultPrinter(): Promise<ZebraPrinter | null> {
    await this.init()

    return new Promise((resolve, reject) => {
      window.BrowserPrint.getDefaultDevice(
        'printer',
        (device) => resolve(device),
        (error) => reject(new Error(error))
      )
    })
  }

  /**
   * Print PDF data to a printer
   */
  async print(printer: ZebraPrinter, pdfData: ArrayBuffer): Promise<void> {
    const response = await fetch(`${BROWSERPRINT_URL}write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'X-Printer-UID': printer.uid,
      },
      body: pdfData,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Utskrift feilet: ${text}`)
    }
  }

  /**
   * Print raw ZPL data to a printer
   */
  async printRaw(printer: ZebraPrinter, data: string): Promise<void> {
    const response = await fetch(`${BROWSERPRINT_URL}write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Printer-UID': printer.uid,
      },
      body: data,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Utskrift feilet: ${text}`)
    }
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(printer: ZebraPrinter): Promise<string> {
    const response = await fetch(`${BROWSERPRINT_URL}read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Printer-UID': printer.uid,
      },
      body: '~HQES',
    })

    if (!response.ok) {
      throw new Error('Kunne ikke hente printerstatus')
    }

    return response.text()
  }
}

// Singleton instance
export const browserPrintService = new BrowserPrintService()
