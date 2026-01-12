/**
 * API client for preparation instructions
 */
import { apiClient } from '@/lib/api-client';

export interface PreparationInstruction {
  id: number;
  text: string;
  is_active: boolean;
  ai_enhanced: boolean;
  created_at: string;
  updated_at: string;
}

export interface PreparationInstructionListResponse {
  items: PreparationInstruction[];
  total: number;
  skip: number;
  limit: number;
}

export interface PreparationInstructionCreate {
  text: string;
  is_active?: boolean;
  ai_enhanced?: boolean;
}

export interface PreparationInstructionUpdate {
  text?: string;
  is_active?: boolean;
  ai_enhanced?: boolean;
}

export interface EnhanceInstructionRequest {
  text: string;
}

export interface EnhanceInstructionResponse {
  original_text: string;
  enhanced_text: string;
  reasoning: string;
}

export const preparationInstructionsApi = {
  /**
   * List all preparation instructions
   */
  async list(params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<PreparationInstructionListResponse> {
    const response = await apiClient.get('/v1/preparation-instructions/', { params });
    return response.data;
  },

  /**
   * Get a specific preparation instruction
   */
  async get(id: number): Promise<PreparationInstruction> {
    const response = await apiClient.get(`/v1/preparation-instructions/${id}`);
    return response.data;
  },

  /**
   * Create a new preparation instruction
   */
  async create(data: PreparationInstructionCreate): Promise<PreparationInstruction> {
    const response = await apiClient.post('/v1/preparation-instructions/', data);
    return response.data;
  },

  /**
   * Update a preparation instruction
   */
  async update(id: number, data: PreparationInstructionUpdate): Promise<PreparationInstruction> {
    const response = await apiClient.put(`/v1/preparation-instructions/${id}`, data);
    return response.data;
  },

  /**
   * Delete (deactivate) a preparation instruction
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/v1/preparation-instructions/${id}`);
    return response.data;
  },

  /**
   * Enhance an instruction using AI
   */
  async enhance(text: string): Promise<EnhanceInstructionResponse> {
    const response = await apiClient.post('/v1/preparation-instructions/enhance', { text });
    return response.data;
  },
};
