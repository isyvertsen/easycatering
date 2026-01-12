import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { TopNav } from '@/components/layout/top-nav'
import { Toaster } from '@/components/ui/toaster'
import { DocumentationChatbot } from '@/components/chatbot'
import { ErrorBoundary } from '@/components/error/error-boundary'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LKC - Larvik Kommune Catering',
  description: 'Catering management system for Larvik Kommune',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ErrorBoundary showDetails={true}>
            <div className="min-h-screen bg-muted/30">
              <TopNav />
              <main className="container mx-auto px-6 py-8 max-w-7xl">
                {children}
              </main>
            </div>
          </ErrorBoundary>
          <Toaster />
          <DocumentationChatbot />
        </Providers>
      </body>
    </html>
  )
}