import { api } from '../api'

export interface AnalyzeRequest {
  type: 'bug' | 'feature'
  title: string
  description: string
  answers?: Record<string, string>
  screenshots?: string[]  // Base64 encoded images
}

export interface AnalyzeResponse {
  success: boolean
  needsMoreInfo: boolean
  followUpQuestions?: string[]
  improvedTitle?: string
  improvedDescription?: string
  detectedTypes?: ('bug' | 'feature')[]
  existingFeature?: string
  suggestSplit?: boolean
  targetRepositories?: string[]  // ["backend"], ["frontend"], or both
  error?: string
}

export interface CreateIssueRequest {
  type: 'bug' | 'feature'
  title: string
  description: string
  browserInfo: string
  currentUrl: string
  aiImproved?: boolean
  targetRepositories?: string[]
  screenshots?: string[]  // Base64 encoded images
}

export interface IssueInfo {
  repository: string
  url: string
  number: number
}

export interface CreateIssueResponse {
  success: boolean
  issues?: IssueInfo[]  // List of created issues
  issueUrl?: string  // Primary issue URL (for backward compatibility)
  issueNumber?: number  // Primary issue number (for backward compatibility)
  errors?: string[]  // Any errors that occurred
  error?: string
}

export interface VersionResponse {
  version: string
}

export const feedbackApi = {
  /**
   * Analyze feedback with AI and get improvements
   */
  analyze: async (data: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await api.post<AnalyzeResponse>('/v1/feedback/analyze', data)
    return response.data
  },

  /**
   * Create a GitHub issue from feedback
   */
  createIssue: async (data: CreateIssueRequest): Promise<CreateIssueResponse> => {
    const response = await api.post<CreateIssueResponse>('/v1/feedback/create-issue', data)
    return response.data
  },

  /**
   * Get application version
   */
  getVersion: async (): Promise<VersionResponse> => {
    const response = await api.get<VersionResponse>('/v1/feedback/version')
    return response.data
  }
}
