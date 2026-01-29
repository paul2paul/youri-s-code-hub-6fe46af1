import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IntegrationSettings {
  id: string;
  company_id: string;
  webhook_url: string | null;
  notify_14_days: boolean;
  notify_7_days: boolean;
  notify_overdue: boolean;
  notify_timeline_generated: boolean;
  slack_channel_id: string | null;
  slack_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSettingsInput {
  webhook_url?: string | null;
  notify_14_days?: boolean;
  notify_7_days?: boolean;
  notify_overdue?: boolean;
  notify_timeline_generated?: boolean;
  slack_channel_id?: string | null;
  slack_enabled?: boolean;
}

export function useIntegrationSettings(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['integration_settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (error) throw error;
      return data as IntegrationSettings | null;
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: IntegrationSettingsInput) => {
      if (!companyId) throw new Error('No company ID');
      
      if (settings) {
        // Update existing
        const { data, error } = await supabase
          .from('integration_settings')
          .update(input)
          .eq('id', settings.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('integration_settings')
          .insert({
            company_id: companyId,
            ...input,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration_settings', companyId] });
      toast.success('Paramètres sauvegardés');
    },
    onError: (error) => {
      console.error('Error saving integration settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.webhook_url) throw new Error('No webhook URL configured');
      
      const response = await fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEST',
          message: 'Test de connexion depuis Youri',
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) throw new Error('Webhook failed');
      return true;
    },
    onSuccess: () => {
      toast.success('Test envoyé avec succès');
    },
    onError: (error) => {
      console.error('Error testing webhook:', error);
      toast.error('Échec du test webhook');
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveMutation.mutateAsync,
    testWebhook: testWebhookMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isTesting: testWebhookMutation.isPending,
  };
}
