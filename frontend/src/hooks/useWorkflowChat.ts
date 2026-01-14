'use client'

import { useState, useCallback } from 'react'
import { workflowApi } from '@/lib/api/workflow'
import type {
  WorkflowChatMessage,
  WorkflowState,
  ConfirmationRequest,
  WorkflowStep,
} from '@/types/workflow'

const WELCOME_MESSAGE: WorkflowChatMessage = {
  role: 'assistant',
  content: 'Hei! Jeg er din AI-assistent for LKC-systemet. Du kan be meg om å utføre oppgaver som å søke etter kunder, se ordrer, opprette nye ordrer, eller vise statistikk. Bare skriv hva du vil gjøre!',
  timestamp: new Date()
}

export function useWorkflowChat() {
  const [state, setState] = useState<WorkflowState>({
    isOpen: false,
    messages: [WELCOME_MESSAGE],
    isLoading: false,
    error: null,
    pendingConfirmation: null,
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
    const userMessage: WorkflowChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
      pendingConfirmation: null,
    }))

    try {
      // Prepare conversation history (exclude welcome message for API)
      const historyForApi = state.messages
        .filter(m => m !== WELCOME_MESSAGE)
        .map(({ role, content }) => ({ role, content }))

      const response = await workflowApi.chat({
        message: message.trim(),
        conversation_history: historyForApi
      })

      if (response.success) {
        // Build assistant message with workflow info
        let assistantContent = response.message

        // If we have executed steps, format them nicely
        if (response.executed_steps && response.executed_steps.length > 0) {
          const stepsSummary = formatExecutedSteps(response.executed_steps)
          if (stepsSummary) {
            assistantContent += '\n\n' + stepsSummary
          }
        }

        const assistantMessage: WorkflowChatMessage = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date()
        }

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
          pendingConfirmation: response.requires_confirmation
            ? response.confirmation_request || null
            : null,
        }))
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'En feil oppstod'
        }))
      }
    } catch (error) {
      console.error('Workflow chat error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Kunne ikke sende melding. Prøv igjen.'
      }))
    }
  }, [state.messages, state.isLoading])

  const confirmWorkflow = useCallback(async () => {
    if (!state.pendingConfirmation || state.isLoading) return

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }))

    try {
      const response = await workflowApi.confirm({
        workflow_id: state.pendingConfirmation.workflow_id,
        confirmed: true,
      })

      let assistantContent = response.message

      // Format executed steps
      if (response.executed_steps && response.executed_steps.length > 0) {
        const stepsSummary = formatExecutedSteps(response.executed_steps)
        if (stepsSummary) {
          assistantContent += '\n\n' + stepsSummary
        }
      }

      const assistantMessage: WorkflowChatMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        pendingConfirmation: null,
      }))
    } catch (error) {
      console.error('Workflow confirm error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Kunne ikke bekrefte handling. Prøv igjen.'
      }))
    }
  }, [state.pendingConfirmation, state.isLoading])

  const cancelWorkflow = useCallback(async () => {
    if (!state.pendingConfirmation) return

    try {
      await workflowApi.confirm({
        workflow_id: state.pendingConfirmation.workflow_id,
        confirmed: false,
      })
    } catch (error) {
      // Ignore errors on cancel
      console.warn('Cancel workflow error:', error)
    }

    const assistantMessage: WorkflowChatMessage = {
      role: 'assistant',
      content: 'Handlingen ble avbrutt.',
      timestamp: new Date()
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      pendingConfirmation: null,
    }))
  }, [state.pendingConfirmation])

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [WELCOME_MESSAGE],
      error: null,
      pendingConfirmation: null,
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
    pendingConfirmation: state.pendingConfirmation,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    confirmWorkflow,
    cancelWorkflow,
    clearMessages,
    clearError,
  }
}

/**
 * Format executed steps for display
 */
function formatExecutedSteps(steps: WorkflowStep[]): string {
  if (!steps || steps.length === 0) return ''

  const lines: string[] = []

  for (const step of steps) {
    const icon = step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : '○'
    lines.push(`${icon} ${step.tool_description}`)

    if (step.status === 'failed' && step.error) {
      lines.push(`  Feil: ${step.error}`)
    }
  }

  return lines.join('\n')
}
