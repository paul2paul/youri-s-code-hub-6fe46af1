import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCompany } from '@/hooks/useCompany';
import { useDocuments } from '@/hooks/useDocuments';
import { useGovernanceProfile } from '@/hooks/useGovernanceProfile';
import { useTasks } from '@/hooks/useTasks';
import { 
  Building2, FileText, Shield, Calendar, ArrowRight, 
  CheckCircle2, AlertCircle, Clock, Plus
} from 'lucide-react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { company, isLoading: companyLoading } = useCompany();
  const { documents } = useDocuments(company?.id);
  const { profile } = useGovernanceProfile(company?.id);
  const { tasks } = useTasks(company?.id);

  // If no company, redirect to setup
  useEffect(() => {
    if (!companyLoading && !company) {
      // Show welcome state instead
    }
  }, [company, companyLoading]);

  if (!company) {
    return (
      <AppLayout>
        <div className="page-enter">
          <PageHeader
            title="Bienvenue sur Youri"
            description="Configurons la gouvernance de votre SAS française"
          />

          <Card className="shadow-elegant max-w-2xl mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-2xl font-serif">Configurer votre entreprise</CardTitle>
              <CardDescription>
                Commencez par entrer les informations de votre société. Nous vous guiderons ensuite.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Informations de l'entreprise</p>
                    <p className="text-sm text-muted-foreground">Nom, exercice fiscal, président</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Télécharger les documents</p>
                    <p className="text-sm text-muted-foreground">Statuts, pacte d'associés</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Profil de gouvernance</p>
                    <p className="text-sm text-muted-foreground">Règles extraites par l'IA</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Planning annuel</p>
                    <p className="text-sm text-muted-foreground">Génération automatique des tâches</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full mt-8"
                onClick={() => navigate('/setup')}
              >
                <Plus className="h-4 w-4" />
                Commencer
              </Button>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm text-muted-foreground max-w-md mx-auto">
            Youri vous aide à gérer les obligations de gouvernance annuelles des SAS françaises. 
            Ceci est un outil de workflow, pas un conseil juridique.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Calculate progress
  const hasDocuments = documents.length > 0;
  const hasProfile = !!profile;
  const hasTasks = tasks.length > 0;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const setupProgress = [
    !!company,
    hasDocuments,
    hasProfile,
    hasTasks,
  ].filter(Boolean).length * 25;

  // Upcoming tasks
  const upcomingTasks = tasks
    .filter(t => t.status !== 'DONE')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  // Overdue check
  const today = new Date();
  const overdueTasks = tasks.filter(
    t => t.status !== 'DONE' && isBefore(parseISO(t.due_date), today)
  );

  return (
    <AppLayout>
      <div className="page-enter">
        <PageHeader
          title={`Bon retour`}
          description={company.name}
        />

        {/* Setup Progress */}
        {setupProgress < 100 && (
          <Card className="shadow-soft mb-6 border-accent/20 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">Progression de la configuration</p>
                  <p className="text-sm text-muted-foreground">
                    Complétez la configuration pour débloquer toutes les fonctionnalités
                  </p>
                </div>
                <span className="text-2xl font-bold text-accent">{setupProgress}%</span>
              </div>
              <Progress value={setupProgress} className="h-2" />
              <div className="mt-4 flex gap-2">
                {!hasDocuments && (
                  <Button size="sm" variant="outline" onClick={() => navigate('/documents')}>
                    Télécharger des documents
                  </Button>
                )}
                {hasDocuments && !hasProfile && (
                  <Button size="sm" variant="outline" onClick={() => navigate('/governance')}>
                    Voir la gouvernance
                  </Button>
                )}
                {hasProfile && !hasTasks && (
                  <Button size="sm" variant="hero" onClick={() => navigate('/timeline')}>
                    Générer le planning
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {overdueTasks.length > 0 && (
          <Card className="shadow-soft mb-6 border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consultez votre planning et mettez à jour les statuts
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => navigate('/timeline')}
                >
                  Voir le planning
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="shadow-soft card-hover cursor-pointer" onClick={() => navigate('/setup')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entreprise</p>
                  <p className="font-medium">{company.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft card-hover cursor-pointer" onClick={() => navigate('/documents')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <p className="font-medium">{documents.length} téléchargé{documents.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft card-hover cursor-pointer" onClick={() => navigate('/governance')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  hasProfile ? "bg-success/10" : "bg-muted"
                )}>
                  <Shield className={cn("h-5 w-5", hasProfile ? "text-success" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gouvernance</p>
                  <p className="font-medium">{hasProfile ? 'Configurée' : 'Non configurée'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft card-hover cursor-pointer" onClick={() => navigate('/timeline')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tâches</p>
                  <p className="font-medium">
                    {completedTasks}/{tasks.length} terminée{completedTasks > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    Prochaines échéances
                  </CardTitle>
                  <CardDescription>Vos prochaines obligations de gouvernance</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/timeline')}>
                  Voir tout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task) => {
                  const isOverdue = isBefore(parseISO(task.due_date), today);
                  const isUpcoming = isBefore(parseISO(task.due_date), addDays(today, 14));
                  
                  return (
                    <div 
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg",
                        isOverdue ? "bg-destructive/5 border border-destructive/20" : "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {isOverdue ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className={cn(
                            "text-sm",
                            isOverdue ? "text-destructive" : "text-muted-foreground"
                          )}>
                            Échéance {format(parseISO(task.due_date), 'd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state for tasks */}
        {hasTasks === false && hasProfile && (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Prêt à générer votre planning ?</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre calendrier annuel basé sur votre profil de gouvernance.
              </p>
              <Button variant="hero" onClick={() => navigate('/timeline')}>
                Générer le planning
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
