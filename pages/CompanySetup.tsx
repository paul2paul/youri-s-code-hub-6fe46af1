import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/hooks/useCompany';
import { Loader2, ArrowRight, Building2, Calendar, User, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanySetupPage() {
  const navigate = useNavigate();
  const { company, createCompany, updateCompany, isCreating, isUpdating } = useCompany();
  
  const [formData, setFormData] = useState({
    name: company?.name || '',
    fiscal_year_end: company?.fiscal_year_end || '',
    president_name: company?.president_name || '',
    president_email: company?.president_email || '',
    siren: company?.siren || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (company) {
        await updateCompany({ id: company.id, ...formData });
        toast.success('Entreprise mise à jour');
      } else {
        await createCompany(formData);
        toast.success('Entreprise créée');
      }
      navigate('/documents');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto page-enter">
        <PageHeader
          title="Configuration de l'entreprise"
          description="Configurez les informations de votre SAS française"
        />

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Informations de l'entreprise
            </CardTitle>
            <CardDescription>
              Ces informations seront utilisées dans tout le processus de gouvernance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  placeholder="Nom de votre SAS"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siren">SIREN (optionnel)</Label>
                <Input
                  id="siren"
                  placeholder="123 456 789"
                  value={formData.siren}
                  onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Le numéro d'identification à 9 chiffres de votre entreprise
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscal_year_end" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date de clôture de l'exercice *
                </Label>
                <Input
                  id="fiscal_year_end"
                  type="date"
                  value={formData.fiscal_year_end}
                  onChange={(e) => setFormData({ ...formData, fiscal_year_end: e.target.value })}
                  required
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  La date de fin de votre exercice fiscal (ex : 31 décembre)
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informations du Président
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="president_name">Nom du Président *</Label>
                    <Input
                      id="president_name"
                      placeholder="Nom complet"
                      value={formData.president_name}
                      onChange={(e) => setFormData({ ...formData, president_name: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="president_email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email du Président *
                    </Label>
                    <Input
                      id="president_email"
                      type="email"
                      placeholder="president@entreprise.com"
                      value={formData.president_email}
                      onChange={(e) => setFormData({ ...formData, president_email: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" variant="hero" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continuer vers les documents
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Toutes les données sont stockées de manière sécurisée. Vous seul avez accès aux informations de votre entreprise.
        </p>
      </div>
    </AppLayout>
  );
}
