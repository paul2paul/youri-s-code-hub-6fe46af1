import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus } from '@/types/database';
import { toast } from 'sonner';
import { invokeWithRetry } from '@/lib/retryFetch';
import { useState, useCallback } from 'react';

export function useTasks(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  const tasksQuery = useQuery({
    queryKey: ['tasks', companyId],
    queryFn: async (): Promise<Task[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const generateTimelineMutation = useMutation({
    mutationFn: async (cycleYear: number) => {
      if (!companyId) throw new Error('No company selected');

      setRetryCount(0);

      const { data, error } = await invokeWithRetry(
        'generate-timeline',
        { companyId, cycleYear },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt) => {
            setRetryCount(attempt);
            toast.info(`Connection slow, retrying... (${attempt}/3)`);
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRetryCount(0);
      queryClient.invalidateQueries({ queryKey: ['tasks', companyId] });
      toast.success('Timeline generated successfully');
    },
    onError: (error) => {
      setRetryCount(0);
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = message.includes('Failed to send') || message.includes('Failed to fetch');
      toast.error(isNetworkError 
        ? 'Network error. Please check your connection and try again.'
        : `Failed to generate timeline: ${message}`
      );
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', companyId] });
    },
  });

  const draftAGMPackMutation = useMutation({
    mutationFn: async (cycleYear: number) => {
      if (!companyId) throw new Error('No company selected');

      setRetryCount(0);

      const { data, error } = await invokeWithRetry(
        'draft-agm-pack',
        { companyId, cycleYear },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt) => {
            setRetryCount(attempt);
            toast.info(`Connection slow, retrying... (${attempt}/3)`);
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRetryCount(0);
      toast.success('AGM pack drafted successfully');
    },
    onError: (error) => {
      setRetryCount(0);
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = message.includes('Failed to send') || message.includes('Failed to fetch');
      toast.error(isNetworkError 
        ? 'Network error. Please check your connection and try again.'
        : `Failed to draft AGM pack: ${message}`
      );
    },
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    generateTimeline: generateTimelineMutation.mutateAsync,
    updateTaskStatus: updateTaskStatusMutation.mutateAsync,
    draftAGMPack: draftAGMPackMutation.mutateAsync,
    isGenerating: generateTimelineMutation.isPending,
    isDrafting: draftAGMPackMutation.isPending,
    retryCount,
  };
}
