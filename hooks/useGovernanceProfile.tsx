import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GovernanceProfile, GovernanceBody, GovernanceBodyType } from '@/types/database';
import { toast } from 'sonner';
import { invokeWithRetry } from '@/lib/retryFetch';
import { useState } from 'react';

export function useGovernanceProfile(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  const profileQuery = useQuery({
    queryKey: ['governance-profile', companyId],
    queryFn: async (): Promise<GovernanceProfile | null> => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('governance_profiles')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const bodiesQuery = useQuery({
    queryKey: ['governance-bodies', companyId],
    queryFn: async (): Promise<GovernanceBody[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('governance_bodies')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Map the database response to our TypeScript type
      return (data || []).map(body => ({
        ...body,
        body_type: body.body_type as GovernanceBodyType,
      }));
    },
    enabled: !!companyId,
  });

  const analyzeGovernanceMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company selected');

      setRetryCount(0);

      const { data, error } = await invokeWithRetry(
        'analyze-governance',
        { companyId },
        {
          maxRetries: 4,
          baseDelay: 2000,
          onRetry: (attempt) => {
            setRetryCount(attempt);
            toast.info(`Analyse en cours, tentative ${attempt}/4...`);
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRetryCount(0);
      queryClient.invalidateQueries({ queryKey: ['governance-profile', companyId] });
      queryClient.invalidateQueries({ queryKey: ['governance-bodies', companyId] });
      toast.success('Analyse de gouvernance terminée');
    },
    onError: (error) => {
      setRetryCount(0);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      const isNetworkError = message.includes('Failed to send') || message.includes('Failed to fetch');
      toast.error(isNetworkError 
        ? 'Erreur réseau. Veuillez réessayer dans quelques instants.'
        : `Échec de l'analyse : ${message}`
      );
    },
  });

  return {
    profile: profileQuery.data,
    bodies: bodiesQuery.data || [],
    isLoading: profileQuery.isLoading || bodiesQuery.isLoading,
    error: profileQuery.error || bodiesQuery.error,
    analyzeGovernance: analyzeGovernanceMutation.mutateAsync,
    isAnalyzing: analyzeGovernanceMutation.isPending,
    retryCount,
  };
}
