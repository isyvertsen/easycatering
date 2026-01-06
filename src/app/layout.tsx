import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { Sidebar } from '@/components/layout/sidebar'
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
            <div className="flex h-screen bg-muted/30">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                  <div className="container mx-auto px-6 py-8 max-w-7xl">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </ErrorBoundary>
          <Toaster />
          <DocumentationChatbot />
        </Providers>
      </body>
    </html>
  )
}