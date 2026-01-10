'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { GraphQLProvider } from '@/lib/graphql/provider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { CartProvider } from '@/contexts/CartContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <GraphQLProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CartProvider>
              {children}
            </CartProvider>
          </ThemeProvider>
        </GraphQLProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}