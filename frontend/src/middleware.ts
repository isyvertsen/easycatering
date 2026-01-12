import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

// Check if we're in development mode with auth bypass
const isDevelopment = process.env.NODE_ENV === 'development'
const authBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

export async function middleware(request: NextRequest) {
  // In development with auth bypass, allow all requests
  if (isDevelopment && authBypass) {
    return NextResponse.next()
  }

  // Allow access to auth pages
  if (request.nextUrl.pathname.startsWith('/auth') ||
      request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Allow access to token-based order view (email links)
  // Pattern: /webshop/ordre/[token]
  if (request.nextUrl.pathname.match(/^\/webshop\/ordre\/[^/]+$/)) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const session = await auth()

  // If not authenticated, redirect to sign in
  if (!session) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes - they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
