/**
 * BrowserPrint Service Wrapper
 *
 * Provides integration with Zebra BrowserPrint SDK for printing to Zebra printers.
 * Requires Zebra Browser Print application to be running locally.
 * Uses official BrowserPrint SDK from /public/lib/BrowserPrint.min.js
 */
import type { ZebraPrinter } from '@/types/labels'

// BrowserPrint SDK device interface
interface BrowserPrintDevice {
  name: string
  uid: string
  deviceType: string
  connection: string
  version: number
  provider: string
  manufacturer: string
  send: (data: string, success?: () => void, error?: (err: string) => void) => void
  sendFile: (file: Blob | string, success?: () => void, error?: (err: string) => void) => void
  read: (success?: (data: string) => void, error?: (err: string) => void) => void
  sendThenRead: (data: string, success?: (data: string) => void, error?: (err: string) => void) => void
}

declare global {
  interface Window {
    BrowserPrint: {
      getLocalDevices: (
        callback: (devices: BrowserPrintDevice[] | Record<string, BrowserPrintDevice[]>) => void,
        errorCallback: (error: string) => void,
        deviceType?: string
      ) => void
      getDefaultDevice: (
        deviceType: string,
        callback: (device: BrowserPrintDevice | null) => void,
        errorCallback: (error: string) => void
      ) => void
      getApplicationConfiguration: (
        callback: (config: unknown) => void,
        errorCallback: (error: string) => void
      ) => void
    }
  }
}

const SDK_URL = '/lib/BrowserPrint.min.js'

export class BrowserPrintService {
  private initialized = false
  private initPromise: Promise<void> | null = null
  private devices: Map<string, BrowserPrintDevice> = new Map()

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
        // Wait a bit for BrowserPrint to initialize
        setTimeout(() => {
          if (window.BrowserPrint) {
            this.initialized = true
            resolve()
          } else {
            this.initPromise = null
            reject(new Error('BrowserPrint SDK lastet, men BrowserPrint objekt ikke tilgjengelig'))
          }
        }, 100)
      }
      script.onerror = () => {
        this.initPromise = null
        reject(new Error('Kunne ikke laste BrowserPrint SDK'))
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
      // Try to get config to verify service is running
      return new Promise((resolve) => {
        window.BrowserPrint.getApplicationConfiguration(
          () => resolve(true),
          () => resolve(false)
        )
      })
    } catch {
      return false
    }
  }

  /**
   * Convert BrowserPrintDevice to ZebraPrinter
   */
  private toZebraPrinter(device: BrowserPrintDevice): ZebraPrinter {
    return {
      name: device.name,
      uid: device.uid,
      deviceType: device.deviceType,
      connection: device.connection,
      version: device.version,
      provider: device.provider,
      manufacturer: device.manufacturer,
    }
  }

  /**
   * Get all locally available printers
   */
  async getLocalPrinters(): Promise<ZebraPrinter[]> {
    await this.init()

    return new Promise((resolve, reject) => {
      window.BrowserPrint.getLocalDevices(
        (result) => {
          // Result can be array or object with device types
          let deviceList: BrowserPrintDevice[]
          if (Array.isArray(result)) {
            deviceList = result
          } else if (result.printer) {
            deviceList = result.printer
          } else {
            deviceList = []
          }

          // Store devices for later use (don't clear - other calls may have added devices)
          deviceList.forEach((d) => this.devices.set(d.uid, d))

          resolve(deviceList.map((d) => this.toZebraPrinter(d)))
        },
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
        (device) => {
          if (device) {
            this.devices.set(device.uid, device)
            resolve(this.toZebraPrinter(device))
          } else {
            resolve(null)
          }
        },
        (error) => reject(new Error(error))
      )
    })
  }

  /**
   * Get the native BrowserPrint device by UID
   */
  private getDevice(printer: ZebraPrinter): BrowserPrintDevice | undefined {
    return this.devices.get(printer.uid)
  }

  /**
   * Print PDF data to a printer using sendFile
   */
  async print(printer: ZebraPrinter, pdfData: ArrayBuffer): Promise<void> {
    const device = this.getDevice(printer)
    if (!device) {
      throw new Error('Printer ikke funnet. Prøv å oppdatere printerlisten.')
    }

    // Convert ArrayBuffer to Blob
    const blob = new Blob([pdfData], { type: 'application/pdf' })

    return new Promise((resolve, reject) => {
      device.sendFile(
        blob,
        () => resolve(),
        (error) => reject(new Error(error || 'Utskrift feilet'))
      )
    })
  }

  /**
   * Print raw ZPL data to a printer using send
   */
  async printRaw(printer: ZebraPrinter, data: string): Promise<void> {
    const device = this.getDevice(printer)
    if (!device) {
      throw new Error('Printer ikke funnet. Prøv å oppdatere printerlisten.')
    }

    return new Promise((resolve, reject) => {
      device.send(
        data,
        () => resolve(),
        (error) => reject(new Error(error || 'Utskrift feilet'))
      )
    })
  }

  /**
   * Get printer status using ~HQES command
   */
  async getPrinterStatus(printer: ZebraPrinter): Promise<string> {
    const device = this.getDevice(printer)
    if (!device) {
      throw new Error('Printer ikke funnet')
    }

    return new Promise((resolve, reject) => {
      device.sendThenRead(
        '~HQES',
        (response) => resolve(response || ''),
        (error) => reject(new Error(error || 'Kunne ikke hente status'))
      )
    })
  }

  /**
   * Parse printer status response
   */
  parsePrinterStatus(statusResponse: string): PrinterStatus {
    const defaultStatus: PrinterStatus = {
      isReady: true,
      isPaused: false,
      hasError: false,
      headOpen: false,
      ribbonOut: false,
      mediaOut: false,
      message: 'Klar',
    }

    if (!statusResponse || statusResponse.length < 3) {
      return { ...defaultStatus, message: 'Ukjent status' }
    }

    const status = statusResponse.toLowerCase()

    if (status.includes('error') || status.includes('feil')) {
      return { ...defaultStatus, isReady: false, hasError: true, message: 'Printerfeil' }
    }
    if (status.includes('pause')) {
      return { ...defaultStatus, isPaused: true, message: 'Printer pauset' }
    }
    if (status.includes('head') || status.includes('open')) {
      return { ...defaultStatus, isReady: false, headOpen: true, message: 'Printerhode åpent' }
    }
    if (status.includes('ribbon')) {
      return { ...defaultStatus, isReady: false, ribbonOut: true, message: 'Ribbon tom' }
    }
    if (status.includes('media') || status.includes('paper')) {
      return { ...defaultStatus, isReady: false, mediaOut: true, message: 'Media tom' }
    }

    return defaultStatus
  }

  /**
   * Print a test label (ZPL)
   */
  async printTestLabel(printer: ZebraPrinter): Promise<void> {
    const testZpl = `^XA
^FO50,50^A0N,50,50^FDTest Label^FS
^FO50,120^A0N,30,30^FDPrinter: ${printer.name}^FS
^FO50,160^A0N,30,30^FD${new Date().toLocaleString('nb-NO')}^FS
^FO50,220^BY3^BCN,100,Y,N,N^FD123456789^FS
^XZ`
    await this.printRaw(printer, testZpl)
  }

  /**
   * Check if BrowserPrint service is reachable
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      await this.init()
      return new Promise((resolve) => {
        window.BrowserPrint.getApplicationConfiguration(
          () => resolve(true),
          () => resolve(false)
        )
      })
    } catch {
      return false
    }
  }
}

export interface PrinterStatus {
  isReady: boolean
  isPaused: boolean
  hasError: boolean
  headOpen: boolean
  ribbonOut: boolean
  mediaOut: boolean
  message: string
}

// Singleton instance
export const browserPrintService = new BrowserPrintService()
