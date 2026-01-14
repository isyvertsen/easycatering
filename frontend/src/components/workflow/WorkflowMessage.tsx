'use client'

import { cn } from '@/lib/utils'
import type { WorkflowChatMessage } from '@/types/workflow'
import { User, Sparkles } from 'lucide-react'

interface WorkflowMessageProps {
  message: WorkflowChatMessage
}

export function WorkflowMessage({ message }: WorkflowMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isUser ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1">
          {isUser ? 'Deg' : 'AI Copilot'}
        </p>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  )
}
