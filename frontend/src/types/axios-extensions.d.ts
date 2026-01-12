import 'axios'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      requestId?: string
      startTime?: number
      [key: string]: any
    }
    _retry?: boolean
  }
}