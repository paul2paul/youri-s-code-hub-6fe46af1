import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCompany } from '@/hooks/useCompany';
import { useGovernanceProfile } from '@/hooks/useGovernanceProfile';
import { GovernanceBodyType } from '@/types/database';
import {
  Shield, Calendar, Users, Gavel, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, Loader2, HelpCircle,
  Crown, Briefcase, Building2, Eye, UsersRound, RefreshCw, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const bodyTypeLabels: Record<GovernanceBodyType, string> = {
  'PRESIDENT': 'Président',
  'DIRECTEUR_GENERAL': 'Directeur Général',
  'DIRECTEUR_GENERAL_DELEGUE': 'Directeur Général Délégué',
  'COMITE_DIRECTION': 'Comité de direction',
  'CONSEIL_SURVEILLANCE': 'Conseil de surveillance',
  'COMITE_STRATEGIQUE': 'Comité stratégique',
  'OTHER': 'Autre organe'
};

const bodyTypeIcons: Record<GovernanceBodyType, React.ReactNode> = {
  'PRESIDENT': <Crown className="h-4 w-4 text-accent" />,
  'DIRECTEUR_GENERAL': <Briefcase className="h-4 w-4 text-primary" />,
  'DIRECTEUR_GENERAL_DELEGUE': <Briefcase className="h-4 w-4 text-primary/80" />,
  'COMITE_DIRECTION': <UsersRound className="h-4 w-4 text-secondary-foreground" />,
  'CONSEIL_SURVEILLANCE': <Eye className="h-4 w-4 text-success" />,
  'COMITE_STRATEGIQUE': <Building2 className="h-4 w-4 text-accent" />,
  'OTHER': <Users className="h-4 w-4 text-muted-foreground" />
};

export default function GovernancePage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { profile, bodies, isLoading, analyzeGovernance, isAnalyzing } = useGovernanceProfile(company?.id);

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

  if (!profile) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-bold font-serif mb-4">Pas encore de profil de gouvernance</h2>
          <p className="text-muted-foreground mb-8">
            Téléchargez les documents juridiques de votre entreprise pour extraire les règles de gouvernance et créer votre profil.
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate('/documents')}>
            Télécharger des documents
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </AppLayout>
    );
  }

  const openQuestions = Array.isArray(profile.open_questions) ? profile.open_questions : [];
  const specialClauses = Array.isArray(profile.special_clauses_flags) ? profile.special_clauses_flags : [];
  const annualObligations = Array.isArray(profile.annual_obligations) ? profile.annual_obligations : [];

  return (
    <AppLayout>
      <div className="page-enter">
        <PageHeader
          title="Profil de gouvernance"
          description="Règles de gouvernance extraites de vos documents"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => analyzeGovernance()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Réanalyser
                  </>
                )}
              </Button>
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate('/timeline')}
              >
                Générer le planning
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Governance Bodies */}
          {bodies.length > 0 && (
            <Card className="shadow-soft md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-accent" />
                  Organes de direction
                </CardTitle>
                <CardDescription>
                  Mandataires sociaux et organes collégiaux de votre société
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {bodies.map((body) => (
                    <AccordionItem key={body.id} value={body.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          {bodyTypeIcons[body.body_type]}
                          <span className="font-medium">{body.name || bodyTypeLabels[body.body_type]}</span>
                          {body.holder_name && (
                            <span className="text-muted-foreground text-sm font-normal">
                              — {body.holder_name}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pl-7">
                          {body.holder_name && (
                            <div>
                              <span className="text-sm text-muted-foreground">Titulaire</span>
                              <p className="text-sm font-medium">{body.holder_name}</p>
                            </div>
                          )}
                          {body.powers_summary && (
                            <div>
                              <span className="text-sm text-muted-foreground">Pouvoirs</span>
                              <p className="text-sm">{body.powers_summary}</p>
                            </div>
                          )}
                          {body.appointment_rules && (
                            <div>
                              <span className="text-sm text-muted-foreground">Règles de nomination</span>
                              <p className="text-sm">{body.appointment_rules}</p>
                            </div>
                          )}
                          {body.term_duration && (
                            <div>
                              <span className="text-sm text-muted-foreground">Durée du mandat</span>
                              <p className="text-sm">{body.term_duration}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Timing Rules */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Règles de délais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Délai de convocation</span>
                <span className="font-medium">
                  {profile.notice_period_days ? `${profile.notice_period_days} jours` : 'Non spécifié'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Délai d'approbation</span>
                <span className="font-medium">
                  {profile.approval_deadline_days 
                    ? `${profile.approval_deadline_days} jours après clôture` 
                    : '6 mois (par défaut)'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Rules */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Règles des assemblées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="py-2 border-b">
                <span className="text-muted-foreground text-sm">Qui peut convoquer</span>
                <p className="font-medium mt-1">
                  {profile.who_can_convene || 'Le Président (par défaut)'}
                </p>
              </div>
              <div className="py-2">
                <span className="text-muted-foreground text-sm">Règles de quorum</span>
                <p className="font-medium mt-1">
                  {profile.quorum_rules_summary || 'Règles standard SAS applicables'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Majority Rules */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-accent" />
                Règles de majorité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                {profile.majority_rules_summary || 'Règles de majorité standard SAS applicables'}
              </p>
            </CardContent>
          </Card>

          {/* Annual Obligations */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Obligations annuelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {annualObligations.length > 0 ? (
                <ul className="space-y-2">
                  {annualObligations.map((obligation, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">{String(obligation)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Obligations standard SAS applicables</p>
              )}
            </CardContent>
          </Card>

          {/* Special Clauses */}
          {specialClauses.length > 0 && (
            <Card className="shadow-soft border-warning/30 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning-foreground">
                  <AlertTriangle className="h-5 w-5" />
                  Clauses spéciales détectées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {specialClauses.map((clause, i) => (
                    <li key={i} className="text-sm text-foreground">
                      • {String(clause)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Open Questions */}
          {openQuestions.length > 0 && (
            <Card className="shadow-soft border-primary/30 bg-primary/5 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <HelpCircle className="h-5 w-5" />
                  Questions en suspens
                </CardTitle>
                <CardDescription>
                  Ces éléments nécessitent une clarification ou une vérification manuelle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {openQuestions.map((question, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {String(question)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>
              Profil analysé le {profile.created_at && format(new Date(profile.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note :</strong> Ce profil a été extrait par analyse IA de vos statuts et pacte d'associés.
            Veuillez vérifier attentivement et consulter un avocat pour toute question.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
