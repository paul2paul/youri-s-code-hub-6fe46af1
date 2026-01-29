import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";
import { sanitizeForAI, logSuspiciousInput } from "../_shared/sanitize.ts";

interface RequestBody {
  question: string;
  companyId?: string;
}

interface GovernanceBody {
  body_type: string;
  name: string;
  holder_name?: string;
  powers_summary?: string;
  appointment_rules?: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.governanceAdvisor, origin);
    if ('error' in validation) return validation.error;

    const { question, companyId } = validation.data;

    // Sanitize the question before using in AI prompt
    const sanitizedQuestion = sanitizeForAI(question);
    logSuspiciousInput(question, "governance-advisor:question");

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build rich context from company data
    let companyContext = '';
    let governanceContext = '';
    let bodiesContext = '';

    if (companyId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch company info
      const { data: company } = await supabase
        .from('companies')
        .select('name, legal_form, president_name, fiscal_year_end')
        .eq('id', companyId)
        .single();

      if (company) {
        companyContext = `
Informations sur la société:
- Nom: ${company.name}
- Forme juridique: ${company.legal_form || 'SAS'}
- Président actuel: ${company.president_name || 'Non spécifié'}
- Fin de l'exercice fiscal: ${company.fiscal_year_end || 'Non spécifié'}
`;
      }

      // Fetch governance profile
      const { data: profile } = await supabase
        .from('governance_profiles')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (profile) {
        governanceContext = `
Profil de gouvernance (extrait des statuts):
- Délai de convocation: ${profile.notice_period_days || 15} jours
- Délai d'approbation des comptes: ${profile.approval_deadline_days || 180} jours après clôture
- Règles de quorum: ${profile.quorum_rules_summary || 'Règles standard SAS'}
- Règles de majorité: ${profile.majority_rules_summary || 'Majorité simple pour décisions ordinaires'}
- Qui peut convoquer: ${profile.who_can_convene || 'Le Président'}
- Modalités de réunion: ${JSON.stringify(profile.meeting_modality_rules) || 'Standard'}
`;

        // Add special clauses if any
        const specialClauses = profile.special_clauses_flags as string[] | null;
        if (specialClauses && specialClauses.length > 0) {
          governanceContext += `\nClauses spéciales à noter:\n`;
          specialClauses.forEach((clause: string) => {
            governanceContext += `- ${clause}\n`;
          });
        }
      }

      // Fetch governance bodies
      const { data: bodies } = await supabase
        .from('governance_bodies')
        .select('body_type, name, holder_name, powers_summary, appointment_rules')
        .eq('company_id', companyId);

      if (bodies && bodies.length > 0) {
        bodiesContext = '\nOrganes de direction:\n';
        bodies.forEach((body: GovernanceBody) => {
          bodiesContext += `- ${body.name} (${body.body_type})`;
          if (body.holder_name) bodiesContext += `: ${body.holder_name}`;
          bodiesContext += '\n';
          if (body.powers_summary) bodiesContext += `  Pouvoirs: ${body.powers_summary}\n`;
          if (body.appointment_rules) bodiesContext += `  Nomination: ${body.appointment_rules}\n`;
        });
      }
    }

    // Build the full context
    const fullContext = companyContext + governanceContext + bodiesContext;

    const systemPrompt = `Tu es Youri, un conseiller expert en gouvernance d'entreprise française, spécialisé dans les SAS (Société par Actions Simplifiée).

IMPORTANT: Tu ne donnes PAS de conseil juridique formel. Tu fournis des informations pratiques basées sur:
1. Les règles légales françaises applicables aux SAS
2. Le profil de gouvernance spécifique de l'entreprise (extrait de ses statuts)
3. Les organes de direction en place

${fullContext}

INSTRUCTIONS POUR L'ANALYSE:

Pour chaque question:
1. Identifie si l'action nécessite une approbation formelle
2. Précise le type d'approbation (AG ordinaire, AG extraordinaire, décision du président, décision du DG, comité)
3. Indique la majorité requise selon les statuts de l'entreprise
4. Spécifie le délai de convocation applicable
5. Fournis une explication claire avec les étapes concrètes à suivre
6. Si pertinent, suggère des prochaines étapes pratiques

PRIORITÉS DE RÉPONSE:
- Utilise TOUJOURS les règles extraites des statuts de l'entreprise quand disponibles
- Ne cite les règles légales par défaut que si les statuts ne précisent pas
- Sois pratique et orienté action

Réponds TOUJOURS en JSON avec cette structure exacte:
{
  "needs_approval": boolean,
  "approval_type": "AG Ordinaire" | "AG Extraordinaire" | "Décision Président" | "Décision DG" | "Consultation écrite" | null,
  "majority_required": "Majorité simple" | "Majorité des 2/3" | "Unanimité" | "À l'unanimité des associés présents" | null,
  "notice_period": "X jours" | null,
  "explanation": "Explication détaillée en markdown avec étapes concrètes",
  "next_steps": ["Étape 1...", "Étape 2..."] | null,
  "references": "Articles des statuts ou textes légaux applicables" | null
}

RÈGLES LÉGALES SAS DE RÉFÉRENCE (si non précisé dans les statuts):
- Approbation des comptes: AG ordinaire, majorité simple, dans les 6 mois après clôture de l'exercice
- Modification des statuts: AG extraordinaire, généralement 2/3 des voix (sauf dispositions contraires)
- Distribution de dividendes: AG ordinaire après approbation des comptes, majorité simple
- Nomination/révocation du président: selon les statuts, souvent décision collective des associés
- Augmentation de capital: AG extraordinaire, 2/3 des voix minimum
- Contrats courants: décision du président dans les limites de ses pouvoirs
- Conventions réglementées: rapport spécial + approbation AG
- Cession de parts: droit de préemption possible selon les statuts`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sanitizedQuestion },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to get AI response');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty AI response');
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      // If parsing fails, create a fallback response
      parsedResponse = {
        needs_approval: true,
        approval_type: null,
        majority_required: null,
        notice_period: null,
        explanation: content,
      };
    }

    console.log('Advisor response generated successfully');

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in governance-advisor:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        needs_approval: false,
        explanation: 'Une erreur est survenue lors de l\'analyse. Veuillez réessayer.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
