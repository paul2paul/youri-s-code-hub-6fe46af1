import { useMutation } from '@tanstack/react-query';
import { invokeWithRetry } from '@/lib/retryFetch';
import { toast } from 'sonner';

interface PostToSlackParams {
  companyId: string;
  message: string;
  threadTs?: string;
}

interface PostToSlackResult {
  success: boolean;
  messageTs?: string;
  channel?: string;
}

export function usePostToSlack() {
  const mutation = useMutation({
    mutationFn: async (params: PostToSlackParams): Promise<PostToSlackResult> => {
      const { data, error } = await invokeWithRetry<PostToSlackResult>(
        'post-to-slack',
        params,
        { maxRetries: 2, baseDelay: 1000 }
      );

      if (error) throw error;
      if (!data) throw new Error('No response from Slack');
      return data;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Échec de l'envoi vers Slack : ${message}`);
    },
  });

  return {
    postToSlack: mutation.mutateAsync,
    isPosting: mutation.isPending,
    error: mutation.error,
  };
}
