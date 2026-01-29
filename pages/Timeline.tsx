import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { TaskTable } from '@/components/timeline/TaskTable';
import { useCompany } from '@/hooks/useCompany';
import { useTasks } from '@/hooks/useTasks';
import { useIntegrationSettings } from '@/hooks/useIntegrationSettings';
import { TaskStatus } from '@/types/database';
import { 
  Calendar, RefreshCw, FileText, Loader2, Users, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export default function TimelinePage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { tasks, isLoading, generateTimeline, updateTaskStatus, draftAGMPack, isGenerating, isDrafting, retryCount } = useTasks(company?.id);
  const { settings } = useIntegrationSettings(company?.id);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isGeneratingConvocations, setIsGeneratingConvocations] = useState(false);
  const [isGeneratingAttendance, setIsGeneratingAttendance] = useState(false);

  const filteredTasks = useMemo(() => 
    tasks.filter(t => t.cycle_year === selectedYear),
    [tasks, selectedYear]
  );

  const handleGenerateTimeline = async () => {
    try {
      await generateTimeline(selectedYear);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDraftAGMPack = async () => {
    try {
      await draftAGMPack(selectedYear);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleGenerateConvocations = async () => {
    setIsGeneratingConvocations(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-convocations', {
        body: { companyId: company?.id, cycleYear: selectedYear },
      });
      if (error) throw error;
      
      // Download as text file
      const blob = new Blob([data.convocations.map((c: any) => c.convocation_text).join('\n\n---\n\n')], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convocations-ag-${selectedYear}.md`;
      a.click();
      
      toast.success(`${data.convocations.length} convocations générées`);
    } catch (error) {
      console.error('Error generating convocations:', error);
      toast.error('Erreur lors de la génération des convocations');
    } finally {
      setIsGeneratingConvocations(false);
    }
  };

  const handleGenerateAttendance = async () => {
    setIsGeneratingAttendance(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-attendance-sheet', {
        body: { companyId: company?.id },
      });
      if (error) throw error;
      
      // Download as text file
      const blob = new Blob([data.attendance_sheet], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feuille-presence-ag-${selectedYear}.md`;
      a.click();
      
      toast.success('Feuille de présence générée');
    } catch (error) {
      console.error('Error generating attendance sheet:', error);
      toast.error('Erreur lors de la génération de la feuille de présence');
    } finally {
      setIsGeneratingAttendance(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatus({ taskId, status: newStatus });
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

  return (
    <AppLayout>
      <div className="page-enter">
        <PageHeader
          title="Planning annuel"
          description="Suivez vos tâches de gouvernance et échéances"
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleGenerateTimeline}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isGenerating 
                  ? (retryCount > 0 ? `Nouvelle tentative (${retryCount}/3)...` : 'Génération...')
                  : (filteredTasks.length > 0 ? 'Régénérer' : 'Générer')
                }
              </Button>
            </div>
          }
        />

        {/* Action buttons for documents */}
        {filteredTasks.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant="hero"
              onClick={handleDraftAGMPack}
              disabled={isDrafting}
            >
              {isDrafting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isDrafting 
                ? (retryCount > 0 ? `Nouvelle tentative (${retryCount}/3)...` : 'Rédaction...')
                : 'Rédiger le pack AG'
              }
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateConvocations}
              disabled={isGeneratingConvocations}
            >
              {isGeneratingConvocations ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Générer les convocations
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateAttendance}
              disabled={isGeneratingAttendance}
            >
              {isGeneratingAttendance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              Feuille de présence
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-2">Aucun planning généré</h3>
              <p className="text-muted-foreground mb-6">
                Générez votre planning annuel basé sur votre profil de gouvernance et la date de clôture fiscale.
              </p>
              <Button variant="hero" onClick={handleGenerateTimeline} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {retryCount > 0 ? `Nouvelle tentative (${retryCount}/3)...` : 'Génération...'}
                  </>
                ) : (
                  <>
                    Générer le planning {selectedYear}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Tâches {selectedYear}</CardTitle>
              <CardDescription>
                {filteredTasks.filter(t => t.status === 'DONE').length} sur {filteredTasks.length} tâches terminées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskTable 
                tasks={filteredTasks} 
                onStatusChange={handleStatusChange}
                slackEnabled={settings?.slack_enabled ?? false}
              />
            </CardContent>
          </Card>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Automatisation :</strong> Les webhooks sont disponibles pour se connecter à Slack, Google Calendar, 
            ou d'autres outils via Zapier/Make pour des rappels automatiques. Configurez-les dans les Paramètres.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
