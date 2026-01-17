// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

// Norwegian error messages
export const norwegianErrorMessages = {
  generic: {
    somethingWentWrong: 'Noe gikk galt. Vennligst prøv igjen.',
    unknownError: 'En ukjent feil oppstod.'
  },
  network: {
    connectionFailed: 'Kunne ikke koble til serveren. Sjekk internettforbindelsen din.',
    timeout: 'Forespørselen tok for lang tid. Vennligst prøv igjen.',
    offline: 'Du er frakoblet. Sjekk internettforbindelsen din.'
  },
  server: {
    internal: 'En serverfeil oppstod. Vennligst prøv igjen senere.',
    unavailable: 'Tjenesten er ikke tilgjengelig. Vennligst prøv igjen senere.',
    maintenance: 'Systemet er under vedlikehold. Vennligst prøv igjen senere.'
  },
  authentication: {
    required: 'Du må logge inn for å fortsette.',
    invalid: 'Ugyldig brukernavn eller passord.',
    expired: 'Økten din har utløpt. Vennligst logg inn igjen.'
  },
  authorization: {
    forbidden: 'Du har ikke tilgang til denne ressursen.',
    insufficientPermissions: 'Du har ikke nødvendige tillatelser.'
  },
  notFound: {
    resource: 'Den forespurte ressursen ble ikke funnet.',
    page: 'Siden du leter etter finnes ikke.'
  },
  validation: {
    required: 'Dette feltet er påkrevd.',
    invalid: 'Ugyldig verdi.',
    tooShort: 'Verdien er for kort.',
    tooLong: 'Verdien er for lang.'
  }
}

// Helper to safely access properties on unknown error objects
function getErrorProperty<T>(error: unknown, ...path: string[]): T | undefined {
  let current: unknown = error
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return current as T
}

// Get error type from error object
export function getErrorType(error: unknown): ErrorType {
  if (!error) return ErrorType.UNKNOWN

  // Check for network errors
  const message = getErrorProperty<string>(error, 'message')
  if (message?.includes('fetch') || message?.includes('network')) {
    return ErrorType.NETWORK
  }

  // Check for HTTP status codes
  const responseStatus = getErrorProperty<number>(error, 'response', 'status')
  const directStatus = getErrorProperty<number>(error, 'status')
  const status = responseStatus || directStatus

  if (status) {
    if (status === 401) return ErrorType.AUTHENTICATION
    if (status === 403) return ErrorType.AUTHORIZATION
    if (status === 404) return ErrorType.NOT_FOUND
    if (status >= 500) return ErrorType.SERVER
    if (status >= 400) return ErrorType.VALIDATION
  }

  return ErrorType.UNKNOWN
}

// Get error message from error object
export function getErrorMessage(error: unknown): string {
  if (!error) return norwegianErrorMessages.generic.somethingWentWrong

  // Check for custom error messages
  if (typeof error === 'string') return error

  const message = getErrorProperty<string>(error, 'message')
  if (message) return message

  const responseMessage = getErrorProperty<string>(error, 'response', 'data', 'message')
  if (responseMessage) return responseMessage

  const responseDetail = getErrorProperty<string>(error, 'response', 'data', 'detail')
  if (responseDetail) return responseDetail

  // Fallback to error type message
  const errorType = getErrorType(error)
  switch (errorType) {
    case ErrorType.NETWORK:
      return norwegianErrorMessages.network.connectionFailed
    case ErrorType.AUTHENTICATION:
      return norwegianErrorMessages.authentication.required
    case ErrorType.AUTHORIZATION:
      return norwegianErrorMessages.authorization.forbidden
    case ErrorType.NOT_FOUND:
      return norwegianErrorMessages.notFound.resource
    case ErrorType.SERVER:
      return norwegianErrorMessages.server.internal
    default:
      return norwegianErrorMessages.generic.somethingWentWrong
  }
}

// Get CRUD-specific error message
export function getCrudErrorMessage(
  operation: 'create' | 'update' | 'delete' | 'read',
  resource: string,
  error: unknown
): string {
  const errorType = getErrorType(error)
  const resourceNorwegian = resource // Could add translation mapping here

  const baseMessage = getErrorMessage(error)

  // Add operation context
  const operationMessages = {
    create: `Kunne ikke opprette ${resourceNorwegian}`,
    update: `Kunne ikke oppdatere ${resourceNorwegian}`,
    delete: `Kunne ikke slette ${resourceNorwegian}`,
    read: `Kunne ikke laste ${resourceNorwegian}`
  }

  const operationMessage = operationMessages[operation]

  // If we have a specific error message, combine them
  if (baseMessage && baseMessage !== norwegianErrorMessages.generic.somethingWentWrong) {
    return `${operationMessage}: ${baseMessage}`
  }

  return operationMessage
}

export function logError(error: unknown, context?: string) {
  const timestamp = new Date().toISOString()

  // Extract error details from various error types
  let message = 'Unknown error'
  let stack: string | undefined
  let responseData: unknown
  let status: number | undefined

  if (error instanceof Error) {
    message = error.message
    stack = error.stack
  }

  // Handle axios errors
  if (error && typeof error === 'object') {
    const axiosError = error as { response?: { data?: unknown; status?: number }; message?: string }
    if (axiosError.response?.data) {
      responseData = axiosError.response.data
    }
    if (axiosError.response?.status) {
      status = axiosError.response.status
    }
    if (axiosError.message) {
      message = axiosError.message
    }
  }

  const errorDetails = {
    timestamp,
    message,
    stack,
    status,
    responseData,
    context,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', errorDetails)
  } else {
    console.error(`[${timestamp}] ${context || 'Error'}: ${message}`)
  }

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails),
      }).catch((fetchError) => {
        console.error('Failed to log error to server:', fetchError)
      })
    } catch (e) {
      console.error('Failed to send error to server:', e)
    }
  }
}

export function formatError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  
  if (typeof error === 'string') {
    return new Error(error)
  }
  
  if (typeof error === 'object' && error !== null) {
    return new Error(JSON.stringify(error))
  }
  
  return new Error('An unknown error occurred')
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    
    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}