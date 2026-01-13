import axios from 'axios'
import { getSession, signOut } from 'next-auth/react'

const isDevelopment = process.env.NODE_ENV === 'development'
const authBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'

// All API calls go through Next.js which proxies to backend
// This ensures proper auth, logging, and no CORS issues
export const api = axios.create({
  baseURL: '/api',
})

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  // In development with auth bypass, skip auth header
  if (isDevelopment && authBypass) {
    return config
  }

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
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Skip redirect in development with auth bypass
    if (isDevelopment && authBypass) {
      return Promise.reject(error)
    }
    
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      window.location.href = '/auth/signin'
    }
    return Promise.reject(error)
  }
)

// Generic CRUD operations
export const crudApi = {
  list: async <T = any>(
    table: string,
    params?: {
      page?: number
      page_size?: number
      sort_by?: string
      sort_order?: 'asc' | 'desc'
      search?: string
      [key: string]: any
    }
  ) => {
    const response = await api.get<{
      items: T[]
      total: number
      page: number
      page_size: number
      total_pages: number
    }>(`/v1/tables/${table}`, { params })
    return response.data
  },

  get: async <T = any>(table: string, id: string | number) => {
    const response = await api.get<T>(`/v1/tables/${table}/${id}`)
    return response.data
  },

  create: async <T = any>(table: string, data: Partial<T>) => {
    const response = await api.post<T>(`/v1/tables/${table}`, data)
    return response.data
  },

  update: async <T = any>(table: string, id: string | number, data: Partial<T>) => {
    const response = await api.put<T>(`/v1/tables/${table}/${id}`, data)
    return response.data
  },

  delete: async (table: string, id: string | number) => {
    await api.delete(`/v1/tables/${table}/${id}`)
  },

  getSchema: async (table: string) => {
    const response = await api.get<{
      name: string
      columns: Array<{
        name: string
        type: string
        nullable: boolean
        default: any
        max_length: number | null
      }>
    }>(`/v1/tables/${table}/schema`)
    return response.data
  },
}