"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logError } from '@/lib/error-utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, `Error Boundary caught error: ${error.message}`)
    
    this.setState({
      error,
      errorInfo,
    })

    // Log additional error info
    console.error('Error Boundary Details:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Noe gikk galt
              </CardTitle>
              <CardDescription className="text-lg">
                En uventet feil oppstod i applikasjonen. Vi beklager ulempen.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Prøv å laste siden på nytt, eller gå tilbake til forsiden.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Prøv igjen
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Gå til forsiden
                  </Button>
                </div>
              </div>

              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <details className="bg-gray-100 rounded-lg p-4">
                  <summary className="font-medium cursor-pointer mb-3">
                    Tekniske detaljer (kun synlig i utviklingsmodus)
                  </summary>
                  
                  <div className="space-y-3 text-sm">
                    {this.state.error && (
                      <div>
                        <h4 className="font-medium text-red-700">Feilmelding:</h4>
                        <pre className="bg-red-50 p-2 rounded text-red-800 overflow-auto">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.error?.stack && (
                      <div>
                        <h4 className="font-medium text-red-700">Stack Trace:</h4>
                        <pre className="bg-red-50 p-2 rounded text-red-800 overflow-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <h4 className="font-medium text-red-700">Component Stack:</h4>
                        <pre className="bg-red-50 p-2 rounded text-red-800 overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error boundary integration
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    logError(error, errorInfo)
    throw error // This will be caught by the nearest error boundary
  }
}