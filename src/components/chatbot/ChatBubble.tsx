'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  isOpen: boolean
  onClick: () => void
}

export function ChatBubble({ isOpen, onClick }: ChatBubbleProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-[90] h-14 w-14 rounded-full shadow-lg print:hidden',
        'transition-all duration-200 hover:scale-105',
        isOpen && 'rotate-90'
      )}
      aria-label={isOpen ? 'Lukk chat' : 'Åpne dokumentasjonshjelp'}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  )
}
