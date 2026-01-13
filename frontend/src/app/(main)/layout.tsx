import { TopNav } from '@/components/layout/top-nav'
import { DocumentationChatbot } from '@/components/chatbot'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <TopNav />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {children}
      </main>
      <DocumentationChatbot />
    </div>
  )
}
