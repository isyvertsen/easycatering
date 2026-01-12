"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  WifiOff, 
  Shield, 
  ShieldX, 
  Search, 
  Server, 
  RefreshCw,
  Home,
  AlertCircle
} from 'lucide-react'
import { getErrorType, getErrorMessage, ErrorType, norwegianErrorMessages } from '@/lib/error-utils'

interface ErrorDisplayProps {
  error?: any
  title?: string
  description?: string
  onRetry?: () => void
  onGoHome?: () => void
  showRetry?: boolean
  showGoHome?: boolean
  variant?: 'default' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export function ErrorDisplay({
  error,
  title,
  description,
  onRetry,
  onGoHome,
  showRetry = true,
  showGoHome = false,
  variant = 'destructive',
  size = 'md'
}: ErrorDisplayProps) {
  const errorType = error ? getErrorType(error) : ErrorType.UNKNOWN
  const errorMessage = error ? getErrorMessage(error) : description || norwegianErrorMessages.generic.somethingWentWrong

  const getIcon = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return <WifiOff className="w-5 h-5" />
      case ErrorType.AUTHENTICATION:
        return <Shield className="w-5 h-5" />
      case ErrorType.AUTHORIZATION:
        return <ShieldX className="w-5 h-5" />
      case ErrorType.NOT_FOUND:
        return <Search className="w-5 h-5" />
      case ErrorType.SERVER:
        return <Server className="w-5 h-5" />
      default:
        return <AlertTriangle className="w-5 h-5" />
    }
  }

  const getTitle = () => {
    if (title) return title
    
    switch (errorType) {
      case ErrorType.NETWORK:
        return 'Tilkoblingsfeil'
      case ErrorType.AUTHENTICATION:
        return 'Autentisering kreves'
      case ErrorType.AUTHORIZATION:
        return 'Ingen tilgang'
      case ErrorType.NOT_FOUND:
        return 'Ikke funnet'
      case ErrorType.SERVER:
        return 'Serverfeil'
      case ErrorType.VALIDATION:
        return 'Valideringsfeil'
      default:
        return 'Feil oppstod'
    }
  }

  if (size === 'sm') {
    return (
      <Alert variant={variant} className="mb-4">
        {getIcon()}
        <AlertTitle>{getTitle()}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
        {showRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Prøv igjen
          </Button>
        )}
      </Alert>
    )
  }

  return (
    <Card className={`max-w-2xl mx-auto ${size === 'lg' ? 'mt-16' : 'mt-8'}`}>
      <CardHeader className="text-center">
        <div className={`mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4 ${
          size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'
        }`}>
          {React.cloneElement(getIcon(), { 
            className: `text-red-600 ${size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}` 
          })}
        </div>
        <CardTitle className={size === 'lg' ? 'text-2xl' : 'text-xl'}>
          {getTitle()}
        </CardTitle>
        <CardDescription className={size === 'lg' ? 'text-lg' : ''}>
          {errorMessage}
        </CardDescription>
      </CardHeader>
      
      {(showRetry || showGoHome) && (
        <CardContent className="text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && onRetry && (
              <Button 
                onClick={onRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Prøv igjen
              </Button>
            )}
            
            {showGoHome && onGoHome && (
              <Button 
                variant="outline" 
                onClick={onGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Gå til forsiden
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

interface NetworkErrorProps {
  onRetry?: () => void
  message?: string
}

export function NetworkError({ onRetry, message }: NetworkErrorProps) {
  return (
    <ErrorDisplay
      title="Tilkoblingsfeil"
      description={message || norwegianErrorMessages.network.connectionFailed}
      onRetry={onRetry}
      showRetry={!!onRetry}
    />
  )
}

interface NotFoundErrorProps {
  resource?: string
  onGoBack?: () => void
  onGoHome?: () => void
}

export function NotFoundError({ resource, onGoBack, onGoHome }: NotFoundErrorProps) {
  const description = resource 
    ? `${resource} ble ikke funnet.`
    : 'Den forespurte ressursen ble ikke funnet.'

  return (
    <ErrorDisplay
      title="Ikke funnet"
      description={description}
      onRetry={onGoBack}
      onGoHome={onGoHome}
      showRetry={!!onGoBack}
      showGoHome={!!onGoHome}
    />
  )
}

interface ServerErrorProps {
  onRetry?: () => void
  message?: string
}

export function ServerError({ onRetry, message }: ServerErrorProps) {
  return (
    <ErrorDisplay
      title="Serverfeil"
      description={message || norwegianErrorMessages.server.internal}
      onRetry={onRetry}
      showRetry={!!onRetry}
    />
  )
}

interface ValidationErrorProps {
  errors: Record<string, string[]>
  title?: string
}

export function ValidationError({ errors, title = 'Valideringsfeil' }: ValidationErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="w-4 h-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          {Object.entries(errors).map(([field, messages]) => (
            <div key={field}>
              <strong className="capitalize">{field}:</strong>
              <ul className="list-disc list-inside ml-2">
                {messages.map((message, index) => (
                  <li key={index} className="text-sm">{message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface LoadingErrorProps {
  resource?: string
  onRetry?: () => void
  error?: any
}

export function LoadingError({ resource, onRetry, error }: LoadingErrorProps) {
  const errorMessage = error 
    ? getErrorMessage(error) 
    : `Kunne ikke laste ${resource || 'data'}.`

  return (
    <ErrorDisplay
      error={error}
      description={errorMessage}
      onRetry={onRetry}
      showRetry={!!onRetry}
      size="sm"
    />
  )
}

interface InlineErrorProps {
  message: string
  onDismiss?: () => void
}

export function InlineError({ message, onDismiss }: InlineErrorProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="w-4 h-4" />
      <AlertDescription className="flex justify-between items-center">
        <span>{message}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 ml-2"
          >
            ×
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}