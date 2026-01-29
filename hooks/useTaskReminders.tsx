import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReminderChannel = 'EMAIL' | 'SLACK';

export interface TaskReminder {
  id: string;
  task_id: string;
  days_before: number;
  channel: ReminderChannel;
  enabled: boolean;
  created_at: string;
}

export interface TaskReminderInput {
  task_id: string;
  days_before: number;
  channel: ReminderChannel;
  enabled?: boolean;
}

const REMINDER_INTERVALS = [30, 14, 7, 1] as const;

export function useTaskReminders(taskId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['task_reminders', taskId],
    queryFn: async (): Promise<TaskReminder[]> => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('task_id', taskId)
        .order('days_before', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId,
  });

  const upsertReminderMutation = useMutation({
    mutationFn: async (input: TaskReminderInput) => {
      // Check if reminder already exists
      const { data: existing } = await supabase
        .from('task_reminders')
        .select('id')
        .eq('task_id', input.task_id)
        .eq('days_before', input.days_before)
        .eq('channel', input.channel)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('task_reminders')
          .update({ enabled: input.enabled ?? true })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('task_reminders')
          .insert({
            task_id: input.task_id,
            days_before: input.days_before,
            channel: input.channel,
            enabled: input.enabled ?? true,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_reminders', taskId] });
    },
    onError: (error) => {
      console.error('Error saving reminder:', error);
      toast.error('Erreur lors de la sauvegarde du rappel');
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('task_reminders')
        .delete()
        .eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_reminders', taskId] });
    },
    onError: (error) => {
      console.error('Error deleting reminder:', error);
      toast.error('Erreur lors de la suppression du rappel');
    },
  });

  const toggleReminderMutation = useMutation({
    mutationFn: async ({ reminderId, enabled }: { reminderId: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('task_reminders')
        .update({ enabled })
        .eq('id', reminderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_reminders', taskId] });
    },
  });

  // Helper to check if a specific reminder exists
  const hasReminder = (daysBefore: number, channel: ReminderChannel): boolean => {
    return reminders.some(r => r.days_before === daysBefore && r.channel === channel && r.enabled);
  };

  // Get reminder for specific interval/channel
  const getReminder = (daysBefore: number, channel: ReminderChannel): TaskReminder | undefined => {
    return reminders.find(r => r.days_before === daysBefore && r.channel === channel);
  };

  return {
    reminders,
    isLoading,
    upsertReminder: upsertReminderMutation.mutateAsync,
    deleteReminder: deleteReminderMutation.mutateAsync,
    toggleReminder: toggleReminderMutation.mutateAsync,
    hasReminder,
    getReminder,
    isUpdating: upsertReminderMutation.isPending || deleteReminderMutation.isPending || toggleReminderMutation.isPending,
    REMINDER_INTERVALS,
  };
}
