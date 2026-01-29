import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/hooks/useCompany';
import { useIntegrationSettings } from '@/hooks/useIntegrationSettings';
import {
  Webhook,
  Bell,
  Loader2,
  Send,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { settings, isLoading, saveSettings, testWebhook, isSaving, isTesting } = useIntegrationSettings(company?.id);

  const [formData, setFormData] = useState({
    webhook_url: '',
    notify_14_days: true,
    notify_7_days: true,
    notify_overdue: true,
    notify_timeline_generated: true,
    slack_enabled: false,
    slack_channel_id: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        webhook_url: settings.webhook_url || '',
        notify_14_days: settings.notify_14_days,
        notify_7_days: settings.notify_7_days,
        notify_overdue: settings.notify_overdue,
        notify_timeline_generated: settings.notify_timeline_generated,
        slack_enabled: settings.slack_enabled || false,
        slack_channel_id: settings.slack_channel_id || '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await saveSettings({
        webhook_url: formData.webhook_url || null,
        notify_14_days: formData.notify_14_days,
        notify_7_days: formData.notify_7_days,
        notify_overdue: formData.notify_overdue,
        notify_timeline_generated: formData.notify_timeline_generated,
        slack_enabled: formData.slack_enabled,
        slack_channel_id: formData.slack_channel_id || null,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleTest = async () => {
    if (!formData.webhook_url) {
      toast.error('Veuillez d\'abord configurer une URL de webhook');
      return;
    }
    try {
      await testWebhook();
    } catch (error) {
      // Error handled in hook
    }
  };

  if (!company) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Veuillez d'abord configurer votre entreprise.</p>
          <Button variant="hero" className="mt-4" onClick={() => navigate('/dashboard')}>
            Aller à la configuration
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto page-enter">
        <PageHeader
          title="Paramètres"
          description="Configurez les intégrations et notifications automatiques"
        />

        {/* Webhook Configuration */}
        <Card className="shadow-soft mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-accent" />
              Configuration Webhook
            </CardTitle>
            <CardDescription>
              Connectez Youri à Zapier, Make ou d'autres outils d'automatisation pour 
              synchroniser avec Slack et Google Calendar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook_url">URL du Webhook</Label>
              <Input
                id="webhook_url"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Collez l'URL de votre webhook Zapier, Make, ou autre service d'automatisation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || !formData.webhook_url}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Tester le webhook
              </Button>
              <a
                href="https://zapier.com/apps/webhook/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                Créer un webhook Zapier
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Slack Integration */}
        <Card className="shadow-soft mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              Intégration Slack
            </CardTitle>
            <CardDescription>
              Connectez Youri directement à votre canal Slack pour recevoir des notifications
              et poser des questions à l'assistant depuis Slack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Activer Slack</p>
                <p className="text-sm text-muted-foreground">
                  Permet l'envoi de messages et la réception de questions depuis Slack
                </p>
              </div>
              <Switch
                checked={formData.slack_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, slack_enabled: checked })
                }
              />
            </div>

            {formData.slack_enabled && (
              <div className="space-y-2">
                <Label htmlFor="slack_channel_id">ID du canal Slack</Label>
                <Input
                  id="slack_channel_id"
                  placeholder="C0123456789"
                  value={formData.slack_channel_id}
                  onChange={(e) => setFormData({ ...formData, slack_channel_id: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Trouvez l'ID du canal en cliquant droit sur le canal Slack &gt; Afficher les détails du canal.
                  L'ID commence par C (ex: C0123456789).
                </p>
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note :</strong> L'intégration Slack nécessite que votre administrateur
                configure le bot Youri dans votre workspace Slack. Contactez-nous pour obtenir
                les instructions d'installation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="shadow-soft mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choisissez quels événements déclenchent une notification webhook.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Échéance dans 14 jours</p>
                <p className="text-sm text-muted-foreground">
                  Notification 14 jours avant chaque tâche
                </p>
              </div>
              <Switch
                checked={formData.notify_14_days}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, notify_14_days: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Échéance dans 7 jours</p>
                <p className="text-sm text-muted-foreground">
                  Notification 7 jours avant chaque tâche
                </p>
              </div>
              <Switch
                checked={formData.notify_7_days}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, notify_7_days: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Tâche en retard</p>
                <p className="text-sm text-muted-foreground">
                  Notification quand une tâche dépasse sa date d'échéance
                </p>
              </div>
              <Switch
                checked={formData.notify_overdue}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, notify_overdue: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Timeline générée</p>
                <p className="text-sm text-muted-foreground">
                  Notification quand une nouvelle timeline est créée
                </p>
              </div>
              <Switch
                checked={formData.notify_timeline_generated}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, notify_timeline_generated: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="hero" size="lg" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Enregistrer les paramètres
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Astuce :</strong> Utilisez Zapier ou Make pour créer des automatisations 
            qui envoient des messages Slack ou créent des événements Google Calendar 
            à partir des notifications de Youri.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
