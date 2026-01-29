import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCompany } from '@/hooks/useCompany';
import { useYearContext } from '@/hooks/useYearContext';
import { Loader2, ArrowRight, AlertTriangle, DollarSign, Users, FileEdit, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const currentYear = new Date().getFullYear();

export default function YearInputPage() {
  const navigate = useNavigate();
  const { year: yearParam } = useParams<{ year: string }>();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const { company } = useCompany();
  const { yearContext, isLoading, saveYearContext, isSaving } = useYearContext(company?.id, year);

  const [formData, setFormData] = useState({
    capital_change: false,
    governance_change: false,
    dividends: false,
    events_summary: '',
    exceptions: '',
  });

  // Initialize form when yearContext loads
  useEffect(() => {
    if (yearContext) {
      setFormData({
        capital_change: yearContext.capital_change || false,
        governance_change: yearContext.governance_change || false,
        dividends: yearContext.dividends || false,
        events_summary: yearContext.events_summary || '',
        exceptions: yearContext.exceptions || '',
      });
    }
  }, [yearContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await saveYearContext(formData);
      navigate('/timeline');
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

  const fiscalYearEnd = company.fiscal_year_end ? new Date(company.fiscal_year_end + '-' + year) : null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto page-enter">
        <PageHeader
          title={`Contexte de l'exercice ${year}`}
          description="Fournissez le contexte de cet exercice fiscal pour personnaliser votre planning de gouvernance"
        />

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Questions de revue annuelle</CardTitle>
            <CardDescription>
              Vos réponses nous aident à adapter les documents AG et le planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Capital Changes */}
              <div className="flex items-center justify-between py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <Label htmlFor="capital_change" className="text-base font-medium">
                      Modification du capital
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Y a-t-il eu des modifications du capital social cette année ?
                    </p>
                  </div>
                </div>
                <Switch
                  id="capital_change"
                  checked={formData.capital_change}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, capital_change: checked })
                  }
                />
              </div>

              {/* Governance Changes */}
              <div className="flex items-center justify-between py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <Label htmlFor="governance_change" className="text-base font-medium">
                      Modifications de gouvernance
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Y a-t-il eu des changements de dirigeants, mandataires ou statuts ?
                    </p>
                  </div>
                </div>
                <Switch
                  id="governance_change"
                  checked={formData.governance_change}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, governance_change: checked })
                  }
                />
              </div>

              {/* Dividends */}
              <div className="flex items-center justify-between py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <Label htmlFor="dividends" className="text-base font-medium">
                      Distribution de dividendes
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Prévoyez-vous de distribuer des dividendes cette année ?
                    </p>
                  </div>
                </div>
                <Switch
                  id="dividends"
                  checked={formData.dividends}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, dividends: checked })
                  }
                />
              </div>

              {/* Events Summary */}
              <div className="space-y-2 pt-4">
                <Label htmlFor="events_summary" className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Résumé des événements notables
                </Label>
                <Textarea
                  id="events_summary"
                  placeholder="Décrivez tout événement significatif, réalisation ou changement qui devrait être mentionné dans le PV d'AG..."
                  value={formData.events_summary}
                  onChange={(e) => setFormData({ ...formData, events_summary: e.target.value })}
                  className="min-h-24"
                />
              </div>

              {/* Exceptions */}
              <div className="space-y-2">
                <Label htmlFor="exceptions" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Exceptions ou circonstances particulières (optionnel)
                </Label>
                <Textarea
                  id="exceptions"
                  placeholder="Toute circonstance inhabituelle ou exception à noter..."
                  value={formData.exceptions}
                  onChange={(e) => setFormData({ ...formData, exceptions: e.target.value })}
                  className="min-h-20"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" variant="hero" size="lg" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Confirmer les informations
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {yearContext?.confirmed_by_president_at && (
          <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-sm text-success">
              <Calendar className="h-4 w-4" />
              <span>
                Confirmé le {format(new Date(yearContext.confirmed_by_president_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            En confirmant, vous reconnaissez que ces informations sont exactes au meilleur de vos connaissances.
            Un horodatage de confirmation sera enregistré.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
