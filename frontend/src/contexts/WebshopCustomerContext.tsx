"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { webshopApi, WebshopAccessResponse, WebshopKundeInfo } from '@/lib/api/webshop'
import { useSession } from 'next-auth/react'

interface WebshopCustomerContextType {
  /** The currently selected customer ID */
  selectedKundeid: number | null
  /** Set the selected customer ID */
  setSelectedKundeid: (kundeid: number) => void
  /** List of available customers for this user */
  availableKunder: WebshopKundeInfo[]
  /** Whether the user has webshop access */
  hasAccess: boolean
  /** Current customer name */
  currentKundeName: string | null
  /** Current customer group name */
  currentKundeGruppeName: string | null
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  errorMessage: string | null
  /** Refetch access data */
  refetch: () => Promise<void>
}

const WebshopCustomerContext = createContext<WebshopCustomerContextType | undefined>(undefined)

const SELECTED_KUNDE_KEY = 'webshop-selected-kundeid'

export function WebshopCustomerProvider({ children }: { children: ReactNode }) {
  const [selectedKundeid, setSelectedKundeidState] = useState<number | null>(null)
  const [accessData, setAccessData] = useState<WebshopAccessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  const { status: sessionStatus } = useSession()
  const isLoggedIn = sessionStatus === 'authenticated'

  // Load selected customer from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_KUNDE_KEY)
    if (stored) {
      const kundeid = parseInt(stored, 10)
      if (!isNaN(kundeid) && kundeid > 0) {
        setSelectedKundeidState(kundeid)
      } else {
        localStorage.removeItem(SELECTED_KUNDE_KEY)
      }
    }
    setIsHydrated(true)
  }, [])

  // Fetch access data when logged in or selected customer changes
  const fetchAccess = useCallback(async () => {
    if (!isLoggedIn) {
      setAccessData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await webshopApi.checkAccess(selectedKundeid || undefined)
      setAccessData(response)

      // If no customer is selected but access is granted, auto-select the first/only customer
      if (!selectedKundeid && response.has_access && response.kundeid) {
        setSelectedKundeidState(response.kundeid)
        localStorage.setItem(SELECTED_KUNDE_KEY, response.kundeid.toString())
      }

      // If selected customer is not valid (not in available list), clear selection
      if (selectedKundeid && response.available_kunder) {
        const isValid = response.available_kunder.some(k => k.kundeid === selectedKundeid)
        if (!isValid) {
          // Selected customer is no longer valid, reset to first available
          if (response.kundeid) {
            setSelectedKundeidState(response.kundeid)
            localStorage.setItem(SELECTED_KUNDE_KEY, response.kundeid.toString())
          } else {
            setSelectedKundeidState(null)
            localStorage.removeItem(SELECTED_KUNDE_KEY)
          }
        }
      }

      if (!response.has_access && response.message) {
        setErrorMessage(response.message)
      }
    } catch (error) {
      console.error('Failed to fetch webshop access', error)
      setErrorMessage('Kunne ikke sjekke webshop-tilgang')
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn, selectedKundeid])

  // Fetch access when logged in or selected customer changes
  useEffect(() => {
    if (isHydrated) {
      fetchAccess()
    }
  }, [isHydrated, fetchAccess])

  // Set selected customer
  const setSelectedKundeid = useCallback((kundeid: number) => {
    setSelectedKundeidState(kundeid)
    localStorage.setItem(SELECTED_KUNDE_KEY, kundeid.toString())
  }, [])

  // Derived values
  const hasAccess = accessData?.has_access ?? false
  const availableKunder = accessData?.available_kunder ?? []
  const currentKundeName = accessData?.kunde_navn ?? null
  const currentKundeGruppeName = accessData?.kundegruppe_navn ?? null

  // Memoize context value
  const contextValue = useMemo(() => ({
    selectedKundeid,
    setSelectedKundeid,
    availableKunder,
    hasAccess,
    currentKundeName,
    currentKundeGruppeName,
    isLoading,
    errorMessage,
    refetch: fetchAccess,
  }), [
    selectedKundeid,
    setSelectedKundeid,
    availableKunder,
    hasAccess,
    currentKundeName,
    currentKundeGruppeName,
    isLoading,
    errorMessage,
    fetchAccess,
  ])

  return (
    <WebshopCustomerContext.Provider value={contextValue}>
      {children}
    </WebshopCustomerContext.Provider>
  )
}

/**
 * Hook for accessing webshop customer context
 */
export function useWebshopCustomer() {
  const context = useContext(WebshopCustomerContext)
  if (!context) {
    throw new Error('useWebshopCustomer must be used within WebshopCustomerProvider')
  }
  return context
}
