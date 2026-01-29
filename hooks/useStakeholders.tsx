import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StakeholderRole = 'PRESIDENT' | 'SHAREHOLDER' | 'ACCOUNTANT';

export interface Stakeholder {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: StakeholderRole;
  shares_count: number | null;
  share_percentage: number | null;
  created_at: string;
}

export interface StakeholderInput {
  name: string;
  email: string;
  role: StakeholderRole;
  shares_count?: number | null;
}

export function useStakeholders(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: stakeholders = [], isLoading } = useQuery({
    queryKey: ['stakeholders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Stakeholder[];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: StakeholderInput) => {
      if (!companyId) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('stakeholders')
        .insert({
          company_id: companyId,
          name: input.name,
          email: input.email,
          role: input.role,
          shares_count: input.shares_count ?? null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', companyId] });
      toast.success('Associé ajouté');
    },
    onError: (error) => {
      console.error('Error creating stakeholder:', error);
      toast.error('Erreur lors de l\'ajout de l\'associé');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: StakeholderInput & { id: string }) => {
      const { data, error } = await supabase
        .from('stakeholders')
        .update({
          name: input.name,
          email: input.email,
          role: input.role,
          shares_count: input.shares_count ?? null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', companyId] });
      toast.success('Associé mis à jour');
    },
    onError: (error) => {
      console.error('Error updating stakeholder:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stakeholders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholders', companyId] });
      toast.success('Associé supprimé');
    },
    onError: (error) => {
      console.error('Error deleting stakeholder:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    stakeholders,
    isLoading,
    createStakeholder: createMutation.mutateAsync,
    updateStakeholder: updateMutation.mutateAsync,
    deleteStakeholder: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
