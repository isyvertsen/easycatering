/**
 * Types for AI Workflow Copilot
 */

export type ChatRole = 'user' | 'assistant' | 'system'

export interface WorkflowChatMessage {
  role: ChatRole
  content: string
  timestamp?: Date
}

export interface WorkflowStep {
  tool_name: string
  tool_description: string
  parameters: Record<string, unknown>
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: unknown
  error?: string
  executed_at?: string
}

export interface ConfirmationRequest {
  workflow_id: string
  summary: string
  details: string[]
  safety_level: string
  steps: WorkflowStep[]
}

export interface WorkflowChatRequest {
  message: string
  conversation_history?: WorkflowChatMessage[]
  confirmed_workflow_id?: string
}

export interface WorkflowChatResponse {
  success: boolean
  message: string
  requires_confirmation?: boolean
  confirmation_request?: ConfirmationRequest
  executed_steps?: WorkflowStep[]
  error?: string
}

export interface WorkflowConfirmRequest {
  workflow_id: string
  confirmed: boolean
}

export interface WorkflowConfirmResponse {
  success: boolean
  message: string
  executed_steps?: WorkflowStep[]
  error?: string
}

export interface ToolParameter {
  name: string
  type: string
  description: string
  required: boolean
  default?: unknown
  enum?: string[]
}

export interface Tool {
  name: string
  description: string
  category: string
  safety_level: string
  requires_confirmation: boolean
  parameters?: ToolParameter[]
}

export interface ToolCategory {
  [category: string]: Tool[]
}

export interface ToolListResponse {
  categories: ToolCategory
  total_tools: number
}

export interface WorkflowState {
  isOpen: boolean
  messages: WorkflowChatMessage[]
  isLoading: boolean
  error: string | null
  pendingConfirmation: ConfirmationRequest | null
}
