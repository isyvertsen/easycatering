import { TopNav } from '@/components/layout/top-nav'
import { DocumentationChatbot } from '@/components/chatbot'
import { WorkflowCopilot } from '@/components/workflow'
import { WebshopOnlyGuard } from '@/components/auth/WebshopOnlyGuard'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WebshopOnlyGuard>
      <div className="min-h-screen bg-muted/30">
        <TopNav />
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          {children}
        </main>
        <DocumentationChatbot />
        <WorkflowCopilot />
      </div>
    </WebshopOnlyGuard>
  )
}
