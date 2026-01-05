/**
 * GraphQL client configuration using urql
 */
import { createClient, cacheExchange, fetchExchange } from 'urql'

// Use relative URL to go through Next.js API proxy
// This works both in development and production
// The proxy at /api/v1/[...proxy] will forward to backend
export const graphqlClient = createClient({
  url: '/api/v1/graphql',
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    // Get auth token from sessionStorage (adjust based on your auth implementation)
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem('token')
      : null

    return {
      headers: {
        authorization: token ? `Bearer ${token}` : '',
      },
    }
  },
})
