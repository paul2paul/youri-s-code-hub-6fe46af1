import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invokeWithRetry } from '@/lib/retryFetch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCompany } from '@/hooks/useCompany';
import { useStakeholders, StakeholderRole, StakeholderInput } from '@/hooks/useStakeholders';
import { Users, Plus, Pencil, Trash2, Loader2, Mail, Percent, FileSearch, Upload, Hash } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels: Record<StakeholderRole, string> = {
  PRESIDENT: 'Président',
  SHAREHOLDER: 'Associé',
  ACCOUNTANT: 'Expert-comptable',
};

export default function StakeholdersPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { 
    stakeholders, 
    isLoading, 
    createStakeholder, 
    updateStakeholder, 
    deleteStakeholder,
    isCreating,
    isUpdating,
    isDeleting,
  } = useStakeholders(company?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState<StakeholderInput>({
    name: '',
    email: '',
    role: 'SHAREHOLDER',
    shares_count: null,
  });

  const handleExtractFromDocs = async () => {
    if (!company?.id) return;
    
    setIsExtracting(true);
    try {
      const { data, error } = await invokeWithRetry<{
        inserted?: Array<{ name: string }>;
        extracted?: Array<{ name: string }>;
      }>('extract-stakeholders', { companyId: company.id }, {
        maxRetries: 4,
        baseDelay: 2000,
        onRetry: (attempt) => {
          toast.info(`Extraction en cours, tentative ${attempt}/4...`);
        },
      });

      if (error) throw error;

      if (data?.inserted?.length && data.inserted.length > 0) {
        toast.success(`${data.inserted.length} associé(s) importé(s) depuis les documents`);
      } else if (data?.extracted?.length && data.extracted.length > 0) {
        toast.info('Tous les associés trouvés sont déjà enregistrés');
      } else {
        toast.info('Aucun associé trouvé dans les documents. Essayez d\'ajouter une table de capitalisation.');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      const isNetworkError = message.includes('Failed to fetch') || message.includes('NetworkError');
      toast.error(isNetworkError 
        ? 'Erreur réseau. Veuillez réessayer.'
        : 'Erreur lors de l\'extraction des associés'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      role: 'SHAREHOLDER',
      shares_count: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (stakeholder: typeof stakeholders[0]) => {
    setEditingId(stakeholder.id);
    setFormData({
      name: stakeholder.name,
      email: stakeholder.email,
      role: stakeholder.role,
      shares_count: stakeholder.shares_count,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateStakeholder({ id: editingId, ...formData });
      } else {
        await createStakeholder(formData);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet associé ?')) {
      try {
        await deleteStakeholder(id);
      } catch (error) {
        // Error handled in hook
      }
    }
  };

  const totalShares = stakeholders.reduce((sum, s) => sum + (s.shares_count || 0), 0);
  
  const getSharePercentage = (sharesCount: number | null) => {
    if (!sharesCount || totalShares === 0) return null;
    return (sharesCount / totalShares) * 100;
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
          title="Associés"
          description="Gérez les associés et membres du conseil pour les convocations"
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleExtractFromDocs}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSearch className="h-4 w-4" />
                )}
                Importer depuis les docs
              </Button>
              <Button variant="hero" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Ajouter un associé
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : stakeholders.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-2">Aucun associé enregistré</h3>
              <p className="text-muted-foreground mb-6">
                Importez vos associés depuis vos documents ou ajoutez-les manuellement.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleExtractFromDocs}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSearch className="h-4 w-4" />
                  )}
                  Importer depuis les docs
                </Button>
                <Button variant="outline" onClick={() => navigate('/documents')}>
                  <Upload className="h-4 w-4" />
                  Ajouter une table de capitalisation
                </Button>
                <Button variant="hero" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  Ajouter manuellement
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total associés</p>
                      <p className="text-2xl font-bold">{stakeholders.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total des parts</p>
                      <p className="text-2xl font-bold">{totalShares.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emails renseignés</p>
                      <p className="text-2xl font-bold">
                        {stakeholders.filter(s => s.email).length}/{stakeholders.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stakeholders Table */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Liste des associés</CardTitle>
                <CardDescription>
                  Ces informations seront utilisées pour les convocations et la feuille de présence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="text-right">Nb de parts</TableHead>
                      <TableHead className="text-right">% du capital</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stakeholders.map((stakeholder) => (
                      <TableRow key={stakeholder.id}>
                        <TableCell className="font-medium">{stakeholder.name}</TableCell>
                        <TableCell>
                          {stakeholder.email || (
                            <span className="text-destructive text-sm">Non renseigné</span>
                          )}
                        </TableCell>
                        <TableCell>{roleLabels[stakeholder.role]}</TableCell>
                        <TableCell className="text-right">
                          {stakeholder.shares_count !== null 
                            ? stakeholder.shares_count.toLocaleString()
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const pct = getSharePercentage(stakeholder.shares_count);
                            return pct !== null ? `${pct.toFixed(2)}%` : '-';
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(stakeholder)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(stakeholder.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier l\'associé' : 'Ajouter un associé'}
              </DialogTitle>
              <DialogDescription>
                Ces informations seront utilisées pour les convocations AG.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Si non renseigné, le champ sera marqué "[EMAIL À COMPLÉTER]" dans les convocations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as StakeholderRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESIDENT">Président</SelectItem>
                    <SelectItem value="SHAREHOLDER">Associé</SelectItem>
                    <SelectItem value="ACCOUNTANT">Expert-comptable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shares_count">Nombre de parts</Label>
                <Input
                  id="shares_count"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1000"
                  value={formData.shares_count ?? ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    shares_count: e.target.value ? parseInt(e.target.value) : null 
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Le pourcentage sera calculé automatiquement
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    'Enregistrer'
                  ) : (
                    'Ajouter'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
