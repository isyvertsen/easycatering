'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { X, Send, Loader2, Trash2, AlertCircle } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
  messages: ChatMessageType[]
  isLoading: boolean
  error: string | null
  onClose: () => void
  onSendMessage: (message: string) => void
  onClearMessages: () => void
  onClearError: () => void
}

export function ChatWindow({
  messages,
  isLoading,
  error,
  onClose,
  onSendMessage,
  onClearMessages,
  onClearError
}: ChatWindowProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when window opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Card className={cn(
      'fixed bottom-24 right-6 z-[90] w-[380px] shadow-xl',
      'flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-200'
    )}
    style={{ height: '500px' }}
    >
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Dokumentasjonshjelp</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearMessages}
              className="h-8 w-8"
              title="Tøm samtale"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              title="Lukk"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Tenker...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Error message */}
      {error && (
        <div className="mx-4 mb-2 p-2 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearError}
            className="h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <CardFooter className="flex-shrink-0 p-4 pt-2 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Still et spørsmål..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
