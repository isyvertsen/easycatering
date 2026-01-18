import { apiClient } from '@/lib/api-client'

/**
 * Workflow Automation API Client
 *
 * For managing automated workflows (scheduled tasks, event-based automation)
 */

// ============================================================================
// Types
// ============================================================================

export interface WorkflowDefinition {
  id: number
  name: string
  description: string | null
  workflow_type: 'scheduled' | 'event_based'
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  last_executed_at: string | null
}

export interface WorkflowDefinitionDetailed extends WorkflowDefinition {
  steps: WorkflowStep[]
  schedule: WorkflowSchedule | null
  executions: WorkflowExecution[]
}

export interface WorkflowStep {
  id: number
  workflow_id: number
  step_type: 'send_email' | 'check_condition' | 'wait_until' | 'create_order'
  step_name: string
  step_order: number
  is_active: boolean
  action_config: Record<string, unknown> | null
  condition_config: Record<string, unknown> | null
  trigger_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface WorkflowSchedule {
  id: number
  workflow_id: number
  trigger_type: 'time_based' | 'event_based'
  schedule_config: {
    cron_expression?: string
    [key: string]: unknown
  }
  is_active: boolean
  next_run: string | null
  last_run: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: number
  workflow_id: number
  status: 'running' | 'completed' | 'failed' | 'paused'
  started_at: string
  completed_at: string | null
  current_step: number | null
  error_message: string | null
}

export interface WorkflowExecutionDetailed extends WorkflowExecution {
  action_logs: WorkflowActionLog[]
}

export interface WorkflowActionLog {
  id: number
  execution_id: number
  step_id: number
  action_type: string
  status: 'success' | 'failed' | 'running'
  performed_at: string
  result_data: Record<string, unknown> | null
  error_message: string | null
}

export interface WorkflowStatistics {
  workflow_id: number
  total_executions: number
  successful_executions: number
  failed_executions: number
  success_rate: number
  average_duration_seconds: number | null
  last_execution_at: string | null
  last_success_at: string | null
  last_failure_at: string | null
}

// Request types
export interface WorkflowCreateRequest {
  name: string
  description?: string
  workflow_type: 'scheduled' | 'event_based'
  is_active?: boolean
}

export interface WorkflowCreateFullRequest {
  name: string
  description: string
  workflow_type: 'scheduled' | 'event_based'
  is_active?: boolean
  steps: Array<{
    step_type: 'send_email' | 'check_condition' | 'wait_until' | 'create_order'
    step_name: string
    step_order: number
    action_config?: Record<string, unknown>
    condition_config?: Record<string, unknown>
    trigger_config?: Record<string, unknown>
  }>
  schedule: {
    trigger_type: 'time_based' | 'event_based'
    schedule_config: {
      cron_expression?: string
      [key: string]: unknown
    }
  }
}

export interface WorkflowUpdateRequest {
  name?: string
  description?: string
  is_active?: boolean
}

export interface WorkflowListParams {
  page?: number
  page_size?: number
  is_active?: boolean
  workflow_type?: 'scheduled' | 'event_based'
  created_by?: number
  search?: string
}

export interface WorkflowListResponse {
  items: WorkflowDefinition[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ExecutionListParams {
  page?: number
  page_size?: number
  workflow_id?: number
  status?: 'running' | 'completed' | 'failed' | 'paused'
}

export interface ExecutionListResponse {
  items: WorkflowExecution[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// API Client
// ============================================================================

export const workflowAutomationApi = {
  /**
   * List all workflows with pagination and filters
   * GET /api/v1/workflow-automation/workflows
   */
  listWorkflows: async (params?: WorkflowListParams): Promise<WorkflowListResponse> => {
    const response = await apiClient.get('/v1/workflow-automation/workflows', { params })
    return response.data
  },

  /**
   * Get a single workflow by ID with optional related data
   * GET /api/v1/workflow-automation/workflows/{id}
   */
  getWorkflow: async (
    id: number,
    includeSteps = true,
    includeSchedule = true,
    includeExecutions = false
  ): Promise<WorkflowDefinitionDetailed> => {
    const response = await apiClient.get(`/v1/workflow-automation/workflows/${id}`, {
      params: {
        include_steps: includeSteps,
        include_schedule: includeSchedule,
        include_executions: includeExecutions,
      },
    })
    return response.data
  },

  /**
   * Create a new workflow (definition only)
   * POST /api/v1/workflow-automation/workflows
   */
  createWorkflow: async (data: WorkflowCreateRequest): Promise<WorkflowDefinition> => {
    const response = await apiClient.post('/v1/workflow-automation/workflows', data)
    return response.data
  },

  /**
   * Create a complete workflow with steps and schedule
   * POST /api/v1/workflow-automation/workflows/full
   */
  createWorkflowFull: async (
    data: WorkflowCreateFullRequest
  ): Promise<WorkflowDefinitionDetailed> => {
    const response = await apiClient.post('/v1/workflow-automation/workflows/full', data)
    return response.data
  },

  /**
   * Update a workflow
   * PATCH /api/v1/workflow-automation/workflows/{id}
   */
  updateWorkflow: async (
    id: number,
    data: WorkflowUpdateRequest
  ): Promise<WorkflowDefinition> => {
    const response = await apiClient.patch(`/v1/workflow-automation/workflows/${id}`, data)
    return response.data
  },

  /**
   * Delete a workflow
   * DELETE /api/v1/workflow-automation/workflows/{id}
   */
  deleteWorkflow: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/workflow-automation/workflows/${id}`)
  },

  /**
   * Execute a workflow manually
   * POST /api/v1/workflow-automation/workflows/{id}/execute
   */
  executeWorkflow: async (id: number): Promise<WorkflowExecution> => {
    const response = await apiClient.post(`/v1/workflow-automation/workflows/${id}/execute`)
    return response.data
  },

  /**
   * Get workflow statistics
   * GET /api/v1/workflow-automation/workflows/{id}/statistics
   */
  getStatistics: async (id: number): Promise<WorkflowStatistics> => {
    const response = await apiClient.get(`/v1/workflow-automation/workflows/${id}/statistics`)
    return response.data
  },

  /**
   * List workflow executions
   * GET /api/v1/workflow-automation/executions
   */
  listExecutions: async (params?: ExecutionListParams): Promise<ExecutionListResponse> => {
    const response = await apiClient.get('/v1/workflow-automation/executions', { params })
    return response.data
  },

  /**
   * Get a single execution with action logs
   * GET /api/v1/workflow-automation/executions/{id}
   */
  getExecution: async (id: number): Promise<WorkflowExecutionDetailed> => {
    const response = await apiClient.get(`/v1/workflow-automation/executions/${id}`)
    return response.data
  },
}
