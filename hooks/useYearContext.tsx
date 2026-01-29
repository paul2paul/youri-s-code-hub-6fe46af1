import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { YearContext, YearInputForm } from '@/types/database';
import { toast } from 'sonner';

export function useYearContext(companyId: string | undefined, cycleYear?: number) {
  const queryClient = useQueryClient();

  const yearContextQuery = useQuery({
    queryKey: ['year-context', companyId, cycleYear],
    queryFn: async (): Promise<YearContext | null> => {
      if (!companyId || !cycleYear) return null;
      
      const { data, error } = await supabase
        .from('year_contexts')
        .select('*')
        .eq('company_id', companyId)
        .eq('cycle_year', cycleYear)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!cycleYear,
  });

  const saveYearContextMutation = useMutation({
    mutationFn: async (form: YearInputForm) => {
      if (!companyId || !cycleYear) throw new Error('Missing company or year');

      // Check if exists
      const existing = yearContextQuery.data;

      if (existing) {
        const { data, error } = await supabase
          .from('year_contexts')
          .update({
            ...form,
            confirmed_by_president_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('year_contexts')
          .insert({
            company_id: companyId,
            cycle_year: cycleYear,
            ...form,
            confirmed_by_president_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['year-context', companyId, cycleYear] });
      toast.success('Contexte de l\'exercice enregistré');
    },
    onError: (error) => {
      toast.error(`Échec de l'enregistrement : ${error.message}`);
    },
  });

  return {
    yearContext: yearContextQuery.data,
    isLoading: yearContextQuery.isLoading,
    error: yearContextQuery.error,
    saveYearContext: saveYearContextMutation.mutateAsync,
    isSaving: saveYearContextMutation.isPending,
  };
}
