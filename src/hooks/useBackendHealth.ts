'use client'

import { useState, useEffect, useCallback } from 'react'

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'checking'

export interface HealthCheckResult {
  status: HealthStatus
  message: string
  lastChecked: Date | null
  frontendVersion?: string
  backendVersion?: string
  databaseName?: string
  details?: {
    database?: string
  }
}

const HEALTH_CHECK_INTERVAL = 30000 // 30 sekunder
const HEALTH_CHECK_TIMEOUT = 5000 // 5 sekunder timeout

export function useBackendHealth() {
  const [health, setHealth] = useState<HealthCheckResult>({
    status: 'checking',
    message: 'Sjekker backend status...',
    lastChecked: null,
  })

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

      // Kall Next.js API route som proxyer til backend
      const response = await fetch('/api/health', {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (data.status === 'ready') {
        setHealth({
          status: 'healthy',
          message: 'Backend kjører normalt',
          lastChecked: new Date(),
          frontendVersion: data.frontend_version,
          backendVersion: data.version,
          databaseName: data.database,
          details: data.checks,
        })
      } else if (data.status === 'error') {
        setHealth({
          status: 'error',
          message: data.message || 'Kan ikke nå backend',
          lastChecked: new Date(),
        })
      } else {
        setHealth({
          status: 'warning',
          message: 'Backend har problemer',
          lastChecked: new Date(),
          details: data.checks,
        })
      }
    } catch (error) {
      console.error('Health check failed:', error)
      setHealth({
        status: 'error',
        message: 'Kan ikke nå backend',
        lastChecked: new Date(),
      })
    }
  }, [])

  useEffect(() => {
    // Kjør første sjekk umiddelbart
    checkHealth()

    // Sett opp intervall for periodiske sjekker
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL)

    // Cleanup
    return () => clearInterval(interval)
  }, [checkHealth])

  return { health, checkHealth }
}
