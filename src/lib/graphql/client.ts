/**
 * GraphQL client configuration using urql
 */
import { createClient, cacheExchange, fetchExchange } from 'urql'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export const graphqlClient = createClient({
  url: `${API_URL}/v1/graphql`,
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
