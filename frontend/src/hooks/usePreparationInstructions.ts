/**
 * React hooks for preparation instructions
 */
import { useState, useEffect, useCallback } from 'react';
import {
  preparationInstructionsApi,
  PreparationInstruction,
  PreparationInstructionCreate,
  PreparationInstructionUpdate,
  EnhanceInstructionResponse,
} from '@/lib/api/preparation-instructions';

/**
 * Hook for fetching list of preparation instructions
 */
export function usePreparationInstructions(activeOnly: boolean = true) {
  const [instructions, setInstructions] = useState<PreparationInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await preparationInstructionsApi.list({ active_only: activeOnly });
      setInstructions(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instructions');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchInstructions();
  }, [fetchInstructions]);

  return {
    instructions,
    loading,
    error,
    refetch: fetchInstructions,
  };
}

/**
 * Hook for managing a single preparation instruction
 */
export function usePreparationInstruction(id?: number) {
  const [instruction, setInstruction] = useState<PreparationInstruction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstruction = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await preparationInstructionsApi.get(id);
      setInstruction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instruction');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchInstruction();
    }
  }, [id, fetchInstruction]);

  return {
    instruction,
    loading,
    error,
    refetch: fetchInstruction,
  };
}

/**
 * Hook for creating, updating, and deleting preparation instructions
 */
export function usePreparationInstructionMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInstruction = async (data: PreparationInstructionCreate): Promise<PreparationInstruction | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await preparationInstructionsApi.create(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create instruction');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateInstruction = async (
    id: number,
    data: PreparationInstructionUpdate
  ): Promise<PreparationInstruction | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await preparationInstructionsApi.update(id, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update instruction');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteInstruction = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await preparationInstructionsApi.delete(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete instruction');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createInstruction,
    updateInstruction,
    deleteInstruction,
    loading,
    error,
  };
}

/**
 * Hook for AI enhancement of instructions
 */
export function useInstructionEnhancement() {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhanceInstruction = async (text: string): Promise<EnhanceInstructionResponse | null> => {
    try {
      setEnhancing(true);
      setError(null);
      const result = await preparationInstructionsApi.enhance(text);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance instruction');
      return null;
    } finally {
      setEnhancing(false);
    }
  };

  return {
    enhanceInstruction,
    enhancing,
    error,
  };
}
