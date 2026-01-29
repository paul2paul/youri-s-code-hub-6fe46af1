import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/hooks/useCompany';
import { useDocuments } from '@/hooks/useDocuments';
import { useGovernanceProfile } from '@/hooks/useGovernanceProfile';
import { DocumentType } from '@/types/database';
import { 
  Upload, FileText, Trash2, Loader2, ArrowRight, 
  CheckCircle2, AlertCircle, FileUp, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const documentTypes: { type: DocumentType; label: string; description: string; required: boolean }[] = [
  { 
    type: 'STATUTS', 
    label: 'Statuts', 
    description: 'Statuts de la société (obligatoire)',
    required: true
  },
  { 
    type: 'PACTE', 
    label: "Pacte d'associés", 
    description: 'Convention entre associés (optionnel)',
    required: false
  },
  { 
    type: 'PRIOR_PV', 
    label: 'PV antérieur', 
    description: 'Procès-verbaux précédents (optionnel)',
    required: false
  },
  { 
    type: 'CAPTABLE', 
    label: 'Table de capitalisation', 
    description: 'Liste des associés et répartition du capital (optionnel)',
    required: false
  },
];

const otherDocumentsConfig = {
  type: 'OTHER' as DocumentType,
  label: 'Autres documents',
  description: 'Tout document supplémentaire pertinent (PV conseil, contrats, avenants, etc.)',
};

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { documents, uploadDocument, deleteDocument, isUploading, getDocumentUrl } = useDocuments(company?.id);
  const { analyzeGovernance, isAnalyzing } = useGovernanceProfile(company?.id);
  const [dragOver, setDragOver] = useState<DocumentType | null>(null);

  const handleDrop = useCallback(async (e: React.DragEvent, type: DocumentType) => {
    e.preventDefault();
    setDragOver(null);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      try {
        await uploadDocument({ file, type });
        toast.success(`${file.name} téléchargé avec succès`);
      } catch (error) {
        toast.error('Échec du téléchargement');
      }
    }
  }, [uploadDocument]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadDocument({ file, type });
        toast.success(`${file.name} téléchargé avec succès`);
      } catch (error) {
        toast.error('Échec du téléchargement');
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      toast.success('Document supprimé');
    } catch (error) {
      toast.error('Échec de la suppression');
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = await getDocumentUrl(filePath);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleAnalyze = async () => {
    try {
      await analyzeGovernance();
      navigate('/governance');
    } catch (error) {
      // Error handled in hook
    }
  };

  const getDocumentsOfType = (type: DocumentType) => 
    documents.filter(d => d.type === type);

  const hasStatuts = getDocumentsOfType('STATUTS').length > 0;

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
      <div className="max-w-3xl mx-auto page-enter">
        <PageHeader
          title="Documents juridiques"
          description="Téléchargez vos documents pour extraire les règles de gouvernance"
        />

        <div className="space-y-6">
          {documentTypes.map((docType) => {
            const existingDocs = getDocumentsOfType(docType.type);
            const hasDoc = existingDocs.length > 0;

            return (
              <Card 
                key={docType.type}
                className={cn(
                  "shadow-soft transition-all duration-200",
                  dragOver === docType.type && "ring-2 ring-accent"
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasDoc ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : docType.required ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{docType.label}</CardTitle>
                        <CardDescription>{docType.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {existingDocs.length > 0 ? (
                    <div className="space-y-2">
                      {existingDocs.map((doc) => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{doc.file_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.file_path, doc.file_name)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <label className="block mt-3">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileSelect(e, docType.type)}
                        />
                        <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Télécharger une autre version
                          </span>
                        </Button>
                      </label>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                        dragOver === docType.type 
                          ? "border-accent bg-accent/5" 
                          : "border-border hover:border-accent/50 hover:bg-muted/50"
                      )}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(docType.type); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleDrop(e, docType.type)}
                    >
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileSelect(e, docType.type)}
                      />
                      <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">
                        Glissez votre fichier ici ou cliquez pour parcourir
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOC ou DOCX
                      </p>
                    </label>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Other Documents Section */}
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{otherDocumentsConfig.label}</CardTitle>
                  <CardDescription>{otherDocumentsConfig.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getDocumentsOfType('OTHER').length > 0 && (
                <div className="space-y-2 mb-4">
                  {getDocumentsOfType('OTHER').map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{doc.file_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc.file_path, doc.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label
                className={cn(
                  "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  dragOver === 'OTHER' 
                    ? "border-accent bg-accent/5" 
                    : "border-border hover:border-accent/50 hover:bg-muted/50"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver('OTHER'); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, 'OTHER')}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      Array.from(files).forEach(file => {
                        uploadDocument({ file, type: 'OTHER' })
                          .then(() => toast.success(`${file.name} téléchargé`))
                          .catch(() => toast.error(`Échec du téléchargement de ${file.name}`));
                      });
                    }
                  }}
                />
                <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  Glissez des fichiers ici ou cliquez pour parcourir
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Téléchargez plusieurs fichiers PDF, DOC ou DOCX
                </p>
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            variant="hero"
            size="lg"
            onClick={handleAnalyze}
            disabled={!hasStatuts || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                Analyser la gouvernance
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {!hasStatuts && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Veuillez télécharger les statuts de votre société pour continuer
          </p>
        )}
      </div>
    </AppLayout>
  );
}
