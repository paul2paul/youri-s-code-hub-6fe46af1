import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/hooks/useCompany';
import { useGovernanceProfile } from '@/hooks/useGovernanceProfile';
import { useSlackMessages, SlackMessage } from '@/hooks/useSlackMessages';
import { useIntegrationSettings } from '@/hooks/useIntegrationSettings';
import { usePostToSlack } from '@/hooks/usePostToSlack';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  HelpCircle,
  Scale,
  Slack
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdvisorResponse {
  needs_approval: boolean;
  approval_type: string | null;
  majority_required: string | null;
  notice_period: string | null;
  explanation: string;
  next_steps?: string[] | null;
  references?: string | null;
}

export default function AdvisorPage() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { profile } = useGovernanceProfile(company?.id);
  const { unprocessedMessages, refetch: refetchMessages } = useSlackMessages(company?.id);
  const { settings: integrationSettings } = useIntegrationSettings(company?.id);
  const { postToSlack, isPosting } = usePostToSlack();

  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlackMessage, setCurrentSlackMessage] = useState<SlackMessage | null>(null);
  const [sentToSlack, setSentToSlack] = useState(false);

  // Auto-fill question from Slack message if any
  useEffect(() => {
    if (unprocessedMessages.length > 0 && !question) {
      const latestMessage = unprocessedMessages[0];
      setQuestion(latestMessage.message_text);
      setCurrentSlackMessage(latestMessage);
      // Mark as processed
      markMessageProcessed(latestMessage.id);
    }
  }, [unprocessedMessages]);

  const markMessageProcessed = async (messageId: string) => {
    await supabase
      .from('slack_messages')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', messageId);
    refetchMessages();
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      toast.error('Veuillez poser une question');
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setSentToSlack(false);

    try {
      const { data, error } = await supabase.functions.invoke('governance-advisor', {
        body: {
          question,
          companyId: company?.id,
        },
      });

      if (error) throw error;
      setResponse(data);
    } catch (error) {
      console.error('Error asking advisor:', error);
      toast.error('Erreur lors de la consultation du conseiller');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToSlack = async () => {
    if (!response || !company?.id) return;

    // Format the response for Slack
    const slackMessage = formatResponseForSlack(response, question);

    try {
      await postToSlack({
        companyId: company.id,
        message: slackMessage,
        threadTs: currentSlackMessage?.thread_ts || undefined,
      });
      setSentToSlack(true);
      toast.success('Réponse envoyée sur Slack');
    } catch {
      // Error handled in hook
    }
  };

  const formatResponseForSlack = (resp: AdvisorResponse, originalQuestion: string): string => {
    const emoji = resp.needs_approval ? ':warning:' : ':white_check_mark:';
    const status = resp.needs_approval
      ? 'Cette décision *nécessite une approbation*'
      : '*Aucune approbation formelle requise*';

    let message = `${emoji} *Conseiller Gouvernance Youri*\n\n`;
    message += `> _${originalQuestion}_\n\n`;
    message += `${status}\n\n`;

    if (resp.needs_approval) {
      if (resp.approval_type) {
        message += `:clipboard: *Type :* ${resp.approval_type}\n`;
      }
      if (resp.majority_required) {
        message += `:busts_in_silhouette: *Majorité :* ${resp.majority_required}\n`;
      }
      if (resp.notice_period) {
        message += `:clock3: *Délai :* ${resp.notice_period}\n`;
      }
      message += '\n';
    }

    message += resp.explanation;

    // Add next steps if available
    if (resp.next_steps && resp.next_steps.length > 0) {
      message += '\n\n:arrow_right: *Prochaines étapes :*\n';
      resp.next_steps.forEach((step, i) => {
        message += `${i + 1}. ${step}\n`;
      });
    }

    message += '\n\n_Ceci n\'est pas un conseil juridique. Consultez un professionnel qualifié._';

    return message;
  };

  const exampleQuestions = [
    "Puis-je modifier le capital social sans organiser d'AG ?",
    "Ai-je besoin de l'accord des associés pour signer un contrat de 100 000€ ?",
    "Quelle majorité est requise pour changer les statuts ?",
    "Puis-je nommer un nouveau directeur général sans vote ?",
  ];

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
          title="Conseiller Gouvernance"
          description="Posez vos questions sur les décisions nécessitant une approbation"
        />

        {/* Slack Messages Queue */}
        {unprocessedMessages.length > 0 && (
          <Card className="shadow-soft mb-6 border-accent/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Slack className="h-4 w-4" />
                Messages Slack en attente
                <Badge variant="secondary">{unprocessedMessages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unprocessedMessages.slice(0, 3).map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => {
                    setQuestion(msg.message_text);
                    setCurrentSlackMessage(msg);
                    setResponse(null);
                    setSentToSlack(false);
                    markMessageProcessed(msg.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {msg.slack_user_name || 'Utilisateur Slack'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(msg.created_at), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {msg.message_text}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-soft mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-accent" />
              Poser une question
            </CardTitle>
            <CardDescription>
              Décrivez la décision ou l'action que vous envisagez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ex: Puis-je augmenter le capital social de 50 000€ sans organiser une AG ?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-24"
            />
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.slice(0, 2).map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestion(q)}
                    className="text-xs"
                  >
                    {q.substring(0, 40)}...
                  </Button>
                ))}
              </div>
              <Button
                variant="hero"
                onClick={handleAsk}
                disabled={isLoading || !question.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Analyser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Response */}
        {response && (
          <Card className="shadow-soft mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-accent" />
                  Analyse
                </CardTitle>
                {integrationSettings?.slack_enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendToSlack}
                    disabled={isPosting || sentToSlack}
                  >
                    {isPosting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : sentToSlack ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Envoyé
                      </>
                    ) : (
                      <>
                        <Slack className="h-4 w-4" />
                        Envoyer sur Slack
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Decision */}
              <div className={`p-4 rounded-lg ${
                response.needs_approval 
                  ? 'bg-amber-50 border border-amber-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  {response.needs_approval ? (
                    <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      response.needs_approval ? 'text-amber-800' : 'text-green-800'
                    }`}>
                      {response.needs_approval 
                        ? 'Cette décision nécessite une approbation'
                        : 'Aucune approbation formelle requise'
                      }
                    </p>
                    {response.approval_type && (
                      <p className="text-sm text-amber-700 mt-1">
                        Type : {response.approval_type}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              {response.needs_approval && (
                <div className="grid gap-4 md:grid-cols-2">
                  {response.majority_required && (
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Users className="h-5 w-5 text-accent shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Majorité requise</p>
                        <p className="font-medium">{response.majority_required}</p>
                      </div>
                    </div>
                  )}
                  {response.notice_period && (
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Clock className="h-5 w-5 text-accent shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Délai de convocation</p>
                        <p className="font-medium">{response.notice_period}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{response.explanation}</ReactMarkdown>
              </div>

              {/* Next Steps */}
              {response.next_steps && response.next_steps.length > 0 && (
                <div className="mt-4 p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <h4 className="font-medium text-accent mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Prochaines étapes
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {response.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* References */}
              {response.references && (
                <div className="mt-4 text-xs text-muted-foreground border-t pt-3">
                  <span className="font-medium">Références : </span>
                  {response.references}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">
                Ceci n'est pas un conseil juridique
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Les informations fournies sont basées sur l'analyse automatique de vos documents 
                et des règles générales des SAS françaises. Pour toute décision importante, 
                consultez un avocat ou un expert-comptable qualifié.
              </p>
            </div>
          </div>
        </div>

        {/* No Governance Profile Warning */}
        {!profile && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-medium text-blue-800">
                  Profil de gouvernance non configuré
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Pour des conseils personnalisés basés sur vos statuts, 
                  uploadez d'abord vos documents juridiques.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/documents')}
                >
                  Uploader des documents
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
