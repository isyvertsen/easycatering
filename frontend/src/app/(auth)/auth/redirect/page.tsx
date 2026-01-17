'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function AuthRedirectPage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    async function handleRedirect() {
      if (status === 'loading') return

      if (status === 'unauthenticated') {
        window.location.href = '/auth/signin'
        return
      }

      if (!session) return

      // Check if user role should be redirected to webshop
      let redirectUrl = '/'

      if (session.user?.rolle && session.accessToken) {
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
              redirectUrl = '/webshop'
            }
          }
        } catch (error) {
          console.error('Error checking webshop-only role:', error)
        }
      }

      window.location.href = redirectUrl
    }

    handleRedirect()
  }, [session, status])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Logger inn...</p>
      </div>
    </div>
  )
}
