"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"

type ParamValue = string | number | boolean | undefined

/**
 * Hook for persisting list parameters in URL search params
 * Allows sharing links with filters, sorting, and pagination
 */
export function useUrlParams<T extends Record<string, ParamValue>>(defaultParams: T) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse current URL params into typed object
  const params = useMemo(() => {
    const result = { ...defaultParams } as T

    // Parse each param from URL
    searchParams.forEach((value, key) => {
      if (key in defaultParams) {
        const defaultValue = defaultParams[key]
        if (typeof defaultValue === "number") {
          (result as Record<string, ParamValue>)[key] = parseInt(value, 10)
        } else if (typeof defaultValue === "boolean") {
          (result as Record<string, ParamValue>)[key] = value === "true"
        } else {
          (result as Record<string, ParamValue>)[key] = value
        }
      }
    })

    return result
  }, [searchParams, defaultParams])

  // Update URL params without navigation
  const setParams = useCallback(
    (newParams: Partial<T>) => {
      const current = new URLSearchParams(searchParams.toString())

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === defaultParams[key]) {
          current.delete(key)
        } else {
          current.set(key, String(value))
        }
      })

      const queryString = current.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [searchParams, pathname, router, defaultParams]
  )

  // Reset all params to defaults
  const resetParams = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  return {
    params,
    setParams,
    resetParams,
  }
}
