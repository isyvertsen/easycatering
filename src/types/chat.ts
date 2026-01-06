/**
 * Chat message types for documentation chatbot
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface ChatRequest {
  message: string
  conversation_history?: ChatMessage[]
}

export interface ChatResponse {
  success: boolean
  message: string
  error?: string | null
}

export interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
}
