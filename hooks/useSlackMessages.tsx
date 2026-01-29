import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SlackMessage {
  id: string;
  company_id: string;
  slack_user_id: string;
  slack_user_name: string | null;
  message_text: string;
  thread_ts: string | null;
  task_id: string | null;
  processed_at: string | null;
  created_at: string;
}

export function useSlackMessages(companyId: string | undefined) {
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['slack_messages', companyId],
    queryFn: async (): Promise<SlackMessage[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('slack_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refetch every 30 seconds for near real-time
  });

  // Get unprocessed messages (not yet shown in Advisor)
  const unprocessedMessages = messages.filter(m => !m.processed_at);

  return {
    messages,
    unprocessedMessages,
    isLoading,
    refetch,
  };
}
