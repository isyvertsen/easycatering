import { apiClient } from '@/lib/api-client'
import type {
  WorkflowChatRequest,
  WorkflowChatResponse,
  WorkflowConfirmRequest,
  WorkflowConfirmResponse,
  Tool,
  ToolListResponse,
} from '@/types/workflow'

/**
 * Workflow Copilot API Client
 *
 * AI-drevet workflow for å utføre oppgaver via naturlig språk
 */

export const workflowApi = {
  /**
   * Send en melding til workflow-agenten
   *
   * Backend endpoint: POST /api/v1/workflow/chat
   */
  chat: async (request: WorkflowChatRequest): Promise<WorkflowChatResponse> => {
    const response = await apiClient.post('/v1/workflow/chat', request)
    return response.data
  },

  /**
   * Bekreft og utfør en ventende arbeidsflyt
   *
   * Backend endpoint: POST /api/v1/workflow/confirm
   */
  confirm: async (request: WorkflowConfirmRequest): Promise<WorkflowConfirmResponse> => {
    const response = await apiClient.post('/v1/workflow/confirm', request)
    return response.data
  },

  /**
   * Hent liste over tilgjengelige verktøy
   *
   * Backend endpoint: GET /api/v1/workflow/tools
   */
  getTools: async (): Promise<ToolListResponse> => {
    const response = await apiClient.get('/v1/workflow/tools')
    return response.data
  },

  /**
   * Hent detaljer om et spesifikt verktøy
   *
   * Backend endpoint: GET /api/v1/workflow/tools/{tool_name}
   */
  getTool: async (toolName: string): Promise<Tool> => {
    const response = await apiClient.get(`/v1/workflow/tools/${toolName}`)
    return response.data
  },
}
