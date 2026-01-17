'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface WebshopOnlyGuardProps {
  children: React.ReactNode
}

/**
 * Guard component that redirects webshop-only users to /webshop
 * when they try to access the main app.
 */
export function WebshopOnlyGuard({ children }: WebshopOnlyGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      if (status === 'loading') return

      if (status === 'unauthenticated' || !session) {
        // Let middleware handle unauthenticated users
        setIsChecking(false)
        setHasAccess(true)
        return
      }

      // If no role, allow access
      if (!session.user?.rolle) {
        setIsChecking(false)
        setHasAccess(true)
        return
      }

      // Check webshop-only role setting
      try {
        const response = await fetch(`${API_URL}/v1/system-settings/webshop-only-role`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.role && data.role === session.user.rolle) {
            // User has webshop-only role, redirect to webshop
            router.replace('/webshop')
            return
          }
        }

        setHasAccess(true)
      } catch (error) {
        console.error('Error checking webshop-only role:', error)
        // On error, allow access (fail open)
        setHasAccess(true)
      } finally {
        setIsChecking(false)
      }
    }

    checkAccess()
  }, [session, status, router])

  if (isChecking || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Laster...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null // Will be redirecting
  }

  return <>{children}</>
}
