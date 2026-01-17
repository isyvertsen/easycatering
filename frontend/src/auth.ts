import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()

          return {
            id: credentials.email as string,
            email: credentials.email as string,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            rolle: data.rolle,
          }
        } catch (error) {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id_token: account.id_token,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[Google Auth] Backend error:', errorText)
            return false
          }

          const data = await response.json()
          user.accessToken = data.access_token
          user.refreshToken = data.refresh_token
          user.rolle = data.rolle
        } catch (error) {
          console.error('[Google Auth] Exception:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.id = user.id
        token.rolle = user.rolle
        // Set token expiry time (30 minutes from now based on backend config)
        token.accessTokenExpires = Date.now() + 30 * 60 * 1000
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number || 0)) {
        return token
      }

      // Access token has expired, try to refresh it
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refresh_token: token.refreshToken,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to refresh token')
        }

        const refreshedTokens = await response.json()

        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          refreshToken: refreshedTokens.refresh_token,
          rolle: refreshedTokens.rolle || token.rolle, // Keep existing rolle if not returned
          accessTokenExpires: Date.now() + 30 * 60 * 1000,
        }
      } catch (error) {
        console.error('Error refreshing access token:', error)
        // Return old token with error flag
        return {
          ...token,
          error: 'RefreshAccessTokenError',
        }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.user.id = token.id as string
      session.user.rolle = token.rolle as string | undefined
      session.error = token.error as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
})
