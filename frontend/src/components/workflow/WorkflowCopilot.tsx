'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { WorkflowMessage } from './WorkflowMessage'
import { ConfirmationPanel } from './ConfirmationPanel'
import { X, Send, Loader2, Trash2, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflowChat } from '@/hooks/useWorkflowChat'

export function WorkflowCopilot() {
  const {
    isOpen,
    messages,
    isLoading,
    error,
    pendingConfirmation,
    toggleChat,
    closeChat,
    sendMessage,
    confirmWorkflow,
    cancelWorkflow,
    clearMessages,
    clearError,
  } = useWorkflowChat()

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, pendingConfirmation])

  // Focus input when window opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading && !pendingConfirmation) {
      sendMessage(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeChat()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-6 right-24 z-[100] h-14 w-14 rounded-full shadow-lg print:hidden',
          'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
        )}
        title="AI Copilot"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={cn(
      'fixed bottom-24 right-6 z-[90] w-[420px] shadow-xl print:hidden',
      'flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-200'
    )}
    style={{ height: '550px' }}
    >
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-3 border-b bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">AI Copilot</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="h-8 w-8"
              title="Tøm samtale"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
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
              <WorkflowMessage key={index} message={message} />
            ))}

            {/* Pending confirmation */}
            {pendingConfirmation && (
              <ConfirmationPanel
                confirmation={pendingConfirmation}
                onConfirm={confirmWorkflow}
                onCancel={cancelWorkflow}
                isLoading={isLoading}
              />
            )}

            {isLoading && !pendingConfirmation && (
              <div className="flex items-center gap-2 text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Utfører handling...</span>
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
            onClick={clearError}
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
            placeholder={pendingConfirmation ? 'Bekreft eller avbryt handlingen...' : 'Hva vil du gjøre?'}
            disabled={isLoading || !!pendingConfirmation}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || !!pendingConfirmation}
            className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
