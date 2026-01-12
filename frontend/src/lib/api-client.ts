import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'

// All API calls go through Next.js which proxies to backend
// This ensures proper auth, logging, and no CORS issues
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  async (config) => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return config
    }

    // Get the session and add the access token to the request
    const session = await getSession()

    // If session has refresh error, sign out the user
    if (session?.error === 'RefreshAccessTokenError') {
      await signOut({ callbackUrl: '/auth/signin?error=SessionExpired' })
      return Promise.reject(new Error('Session expired, please sign in again'))
    }

    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (error.response) {
      // Handle specific error cases
      if (error.response.status === 401) {
        console.error('Unauthorized access - token may have expired')
        // Session will be refreshed automatically on next request via jwt callback
        // For now, we just log the error. The next request will have a fresh token.

        // If this was a real 401 (not due to token expiry), user will be signed out
        // via the request interceptor on the next call
      }
    }
    return Promise.reject(error)
  }
)