'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import type { ChatMessage, ChatResponse, ChatState } from '@/types/chat'

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Hei! Jeg er dokumentasjonsassistenten for LKC-systemet. Still meg gjerne spørsmål om hvordan systemet fungerer, API-er, eller andre tekniske detaljer.',
  timestamp: new Date()
}

export function useDocumentationChat() {
  const [state, setState] = useState<ChatState>({
    isOpen: false,
    messages: [WELCOME_MESSAGE],
    isLoading: false,
    error: null
  })

  const toggleChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }))
  }, [])

  const openChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }))
  }, [])

  const closeChat = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || state.isLoading) return

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }))

    try {
      // Prepare conversation history (exclude welcome message for API)
      const historyForApi = state.messages
        .filter(m => m !== WELCOME_MESSAGE)
        .map(({ role, content }) => ({ role, content }))

      const response = await apiClient.post<ChatResponse>('/v1/documentation/chat', {
        message: message.trim(),
        conversation_history: historyForApi
      })

      if (response.data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        }

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.data.error || 'En feil oppstod'
        }))
      }
    } catch (error) {
      console.error('Chat error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Kunne ikke sende melding. Prøv igjen.'
      }))
    }
  }, [state.messages, state.isLoading])

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [WELCOME_MESSAGE],
      error: null
    }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    isOpen: state.isOpen,
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
    clearError
  }
}
