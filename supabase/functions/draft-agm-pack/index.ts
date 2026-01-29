import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";
import { sanitizeForAI, logSuspiciousInput } from "../_shared/sanitize.ts";

interface RequestBody {
  companyId: string;
  cycleYear: number;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.draftAgmPack, origin);
    if ('error' in validation) return validation.error;

    const { companyId, cycleYear } = validation.data;

    console.log("Drafting AGM pack for company:", companyId, "year:", cycleYear);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company info
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError) throw companyError;

    // Fetch governance profile
    const { data: profile } = await supabase
      .from("governance_profiles")
      .select("*")
      .eq("company_id", companyId)
      .single();

    // Fetch year context if available
    const { data: yearContext } = await supabase
      .from("year_contexts")
      .select("*")
      .eq("company_id", companyId)
      .eq("cycle_year", cycleYear)
      .single();

    // Sanitize user-provided content before including in AI prompts
    const eventsSummary = yearContext?.events_summary
      ? sanitizeForAI(yearContext.events_summary)
      : "";
    logSuspiciousInput(yearContext?.events_summary || "", "draft-agm-pack:events_summary");

    // Prepare context for AI
    const context = {
      companyName: company.name,
      siren: company.siren,
      presidentName: company.president_name,
      fiscalYearEnd: company.fiscal_year_end,
      cycleYear,
      noticePeriod: profile?.notice_period_days || 15,
      capitalChange: yearContext?.capital_change || false,
      governanceChange: yearContext?.governance_change || false,
      dividends: yearContext?.dividends || false,
      eventsSummary,
      quorumRules: profile?.quorum_rules_summary || "Standard SAS quorum rules",
      majorityRules: profile?.majority_rules_summary || "Standard SAS majority rules",
    };

    let drafts = {
      convocationEmail: "",
      pvAG: "",
      resolutions: "",
    };

    if (LOVABLE_API_KEY) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are an expert in French corporate law drafting documents for SAS companies.
                Generate professional, legally-appropriate drafts in French.
                All outputs MUST include a clear "DRAFT - À VALIDER AVANT UTILISATION" header.
                Use formal legal French language appropriate for corporate governance documents.
                Return a JSON object with three fields: convocationEmail, pvAG, resolutions.`
              },
              {
                role: "user",
                content: `Draft an AGM pack for ${context.companyName} (SIREN: ${context.siren || "N/A"}) for fiscal year ${context.cycleYear}.

President: ${context.presidentName}
Fiscal year end: ${context.fiscalYearEnd}
Notice period required: ${context.noticePeriod} days
Quorum rules: ${context.quorumRules}
Majority rules: ${context.majorityRules}

Year specifics:
- Capital changes this year: ${context.capitalChange ? "Yes" : "No"}
- Governance changes: ${context.governanceChange ? "Yes" : "No"}
- Dividend distribution planned: ${context.dividends ? "Yes" : "No"}
- Notable events: ${context.eventsSummary || "None specified"}

Generate:
1. convocationEmail: A formal convocation email to shareholders
2. pvAG: A template for the Procès-Verbal of the AGM
3. resolutions: The draft resolutions to be voted`
              }
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_agm_pack",
                  description: "Generate AGM documentation pack",
                  parameters: {
                    type: "object",
                    properties: {
                      convocationEmail: { type: "string", description: "Formal convocation email text in French" },
                      pvAG: { type: "string", description: "PV AG template in French" },
                      resolutions: { type: "string", description: "Draft resolutions in French" }
                    },
                    required: ["convocationEmail", "pvAG", "resolutions"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "generate_agm_pack" } }
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            drafts = JSON.parse(toolCall.function.arguments);
            console.log("AI drafts generated");
          }
        } else {
          const errorText = await response.text();
          console.error("AI API error:", errorText);
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
      }
    }

    // Fallback templates if AI fails
    if (!drafts.convocationEmail) {
      drafts.convocationEmail = `
DRAFT - À VALIDER AVANT UTILISATION

Objet : Convocation à l'Assemblée Générale Ordinaire Annuelle

Madame, Monsieur,

Vous êtes convoqué(e) à l'Assemblée Générale Ordinaire Annuelle de ${context.companyName} qui se tiendra le [DATE] à [HEURE] à [LIEU].

Ordre du jour :
1. Approbation des comptes de l'exercice clos le ${context.fiscalYearEnd}
2. Affectation du résultat
${context.dividends ? "3. Distribution de dividendes" : ""}
${context.capitalChange ? "4. Modifications du capital" : ""}
${context.governanceChange ? "5. Modifications statutaires" : ""}
6. Quitus au Président
7. Questions diverses

Veuillez agréer, Madame, Monsieur, nos salutations distinguées.

${context.presidentName}
Président
      `;
    }

    if (!drafts.pvAG) {
      drafts.pvAG = `
DRAFT - À VALIDER AVANT UTILISATION

PROCÈS-VERBAL DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE ANNUELLE

${context.companyName}
SIREN : ${context.siren || "[À COMPLÉTER]"}

L'an [ANNÉE], le [DATE],
Les associés de la société ${context.companyName} se sont réunis en Assemblée Générale Ordinaire Annuelle.

Sont présents / représentés :
[Liste des associés]

L'assemblée est présidée par ${context.presidentName}, Président.

Le Président constate que l'assemblée est régulièrement constituée et peut valablement délibérer.

[DÉLIBÉRATIONS]

De tout ce que dessus, il a été dressé le présent procès-verbal.

Fait à [LIEU], le [DATE]
Signature du Président
      `;
    }

    if (!drafts.resolutions) {
      drafts.resolutions = `
DRAFT - À VALIDER AVANT UTILISATION

RÉSOLUTIONS DE L'ASSEMBLÉE GÉNÉRALE ORDINAIRE ANNUELLE

Première résolution - Approbation des comptes
L'Assemblée Générale approuve les comptes de l'exercice clos le ${context.fiscalYearEnd}.

Deuxième résolution - Affectation du résultat
L'Assemblée Générale décide d'affecter le résultat de l'exercice comme suit :
- Report à nouveau : [MONTANT] €
${context.dividends ? "- Distribution de dividendes : [MONTANT] €" : ""}

Troisième résolution - Quitus au Président
L'Assemblée Générale donne quitus au Président pour sa gestion au cours de l'exercice écoulé.

${context.capitalChange ? `
Quatrième résolution - Modification du capital
[Détails de la modification]
` : ""}

${context.governanceChange ? `
Cinquième résolution - Modifications statutaires
[Détails des modifications]
` : ""}
      `;
    }

    // Add disclaimer header to all drafts
    const disclaimer = "\n\u26A0\uFE0F DRAFT – Ce document doit être revu et validé avant utilisation. Ceci ne constitue pas un conseil juridique.\n\n";

    drafts.convocationEmail = disclaimer + drafts.convocationEmail;
    drafts.pvAG = disclaimer + drafts.pvAG;
    drafts.resolutions = disclaimer + drafts.resolutions;

    console.log("AGM pack drafted successfully");

    return new Response(JSON.stringify({
      success: true,
      drafts,
      metadata: {
        companyName: context.companyName,
        cycleYear,
        generatedAt: new Date().toISOString(),
        isAIGenerated: !!LOVABLE_API_KEY
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in draft-agm-pack:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
