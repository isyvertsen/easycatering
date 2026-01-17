import 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken: string
    refreshToken: string
    error?: string
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      rolle?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    accessToken: string
    refreshToken: string
    rolle?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string
    refreshToken: string
    id: string
    rolle?: string
    accessTokenExpires?: number
    error?: string
  }
}