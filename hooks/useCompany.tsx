import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company, CompanySetupForm } from '@/types/database';
import { useAuth } from './useAuth';

export function useCompany() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ['company', user?.id],
    queryFn: async (): Promise<Company | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (form: CompanySetupForm) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name: form.name,
          fiscal_year_end: form.fiscal_year_end,
          president_name: form.president_name,
          president_email: form.president_email,
          siren: form.siren || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, ...form }: CompanySetupForm & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: form.name,
          fiscal_year_end: form.fiscal_year_end,
          president_name: form.president_name,
          president_email: form.president_email,
          siren: form.siren || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });

  return {
    company: companyQuery.data,
    isLoading: companyQuery.isLoading,
    error: companyQuery.error,
    createCompany: createCompanyMutation.mutateAsync,
    updateCompany: updateCompanyMutation.mutateAsync,
    isCreating: createCompanyMutation.isPending,
    isUpdating: updateCompanyMutation.isPending,
  };
}
