import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

interface GovernanceBodyExtracted {
  body_type: string;
  name: string;
  holder_name?: string;
  powers_summary?: string;
  appointment_rules?: string;
  term_duration?: string;
}

interface RequestBody {
  companyId: string;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  console.log("Request received:", req.method, new Date().toISOString());

  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.analyzeGovernance, origin);
    if ('error' in validation) return validation.error;

    const { companyId } = validation.data;

    console.log("Analyzing governance for company:", companyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company documents - prioritize STATUTS and PACTE
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", companyId)
      .in("type", ["STATUTS", "PACTE", "PRIOR_PV"]);

    if (docError) throw docError;

    console.log("Found documents:", documents?.length);

    // Fetch company info for president details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("president_name, legal_form, name")
      .eq("id", companyId)
      .single();

    if (companyError) throw companyError;

    // Default governance rules (French SAS defaults)
    let analysisResult = {
      notice_period_days: 15,
      approval_deadline_days: 180,
      quorum_rules_summary: "Le quorum est atteint lorsque les associés représentant au moins 50% des parts sont présents ou représentés.",
      majority_rules_summary: "Les décisions ordinaires requièrent la majorité simple. Les décisions extraordinaires (modifications du capital, des statuts) requièrent une majorité des 2/3.",
      who_can_convene: "Le Président peut convoquer les assemblées d'associés. Tout associé détenant au moins 5% des parts peut également demander une réunion.",
      meeting_modality_rules: {
        written_consultation: true,
        video_conference: true,
        physical_meeting: true
      },
      annual_obligations: [
        "Approuver les comptes annuels dans les 6 mois suivant la clôture de l'exercice",
        "Déposer les comptes annuels au Greffe",
        "Tenir l'assemblée générale annuelle",
        "Préparer le rapport de gestion du Président"
      ],
      special_clauses_flags: [] as string[],
      open_questions: [] as string[]
    };

    // Default governance bodies (at minimum, a President)
    let governanceBodies: GovernanceBodyExtracted[] = [
      {
        body_type: "PRESIDENT",
        name: "Président",
        holder_name: company?.president_name || null,
        powers_summary: "Représente la société à l'égard des tiers. Dispose des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société.",
        appointment_rules: "Nommé par décision collective des associés à la majorité simple.",
        term_duration: "Durée illimitée sauf disposition contraire des statuts"
      }
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY && documents && documents.length > 0) {
      // Download and analyze actual document content
      const documentContents: { type: string; name: string; base64: string }[] = [];

      // Prioritize STATUTS first, then PACTE
      const priorityOrder = ["STATUTS", "PACTE", "PRIOR_PV"];
      const sortedDocs = [...documents].sort((a, b) => {
        return priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type);
      });

      // Download up to 2 documents (to stay within API limits)
      for (const doc of sortedDocs.slice(0, 2)) {
        console.log(`Downloading document: ${doc.file_name} (${doc.type})`);

        try {
          const { data: fileData, error: downloadError } = await supabase
            .storage
            .from("documents")
            .download(doc.file_path);

          if (downloadError) {
            console.error(`Download error for ${doc.file_name}:`, downloadError);
            continue;
          }

          if (fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            // Limit file size to 4MB for API
            if (arrayBuffer.byteLength > 4 * 1024 * 1024) {
              console.log(`File ${doc.file_name} too large (${arrayBuffer.byteLength} bytes), skipping`);
              continue;
            }

            documentContents.push({
              type: doc.type,
              name: doc.file_name,
              base64: arrayBufferToBase64(arrayBuffer)
            });
            console.log(`Prepared document: ${doc.file_name} (${arrayBuffer.byteLength} bytes)`);
          }
        } catch (err) {
          console.error(`Error processing ${doc.file_name}:`, err);
        }
      }

      if (documentContents.length > 0) {
        console.log(`Sending ${documentContents.length} document(s) to AI for analysis`);

        try {
          // Build content array with documents
          const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            {
              type: "text",
              text: `Analysez ces documents juridiques de la société "${company?.name || 'SAS'}" et extrayez les règles de gouvernance.

Le président actuel est : ${company?.president_name || "Non spécifié"}.

Documents fournis :
${documentContents.map(d => `- ${d.type}: ${d.name}`).join('\n')}

Analysez le contenu réel des documents pour extraire :
1. Les délais de convocation (en jours)
2. Le délai d'approbation des comptes après clôture
3. Les règles de quorum
4. Les règles de majorité (ordinaire et extraordinaire)
5. Qui peut convoquer les assemblées
6. Les modalités de réunion autorisées
7. Les obligations annuelles spécifiques
8. Les clauses particulières ou inhabituelles
9. Les organes de gouvernance (Président, DG, comités, etc.)

Soyez précis et citez les articles des statuts quand possible.`
            }
          ];

          // Add each document as an image (PDF)
          for (const doc of documentContents) {
            userContent.push({
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${doc.base64}`
              }
            });
          }

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `Vous êtes un expert en droit des sociétés français, spécialisé dans les SAS (Société par Actions Simplifiée).

Analysez les documents juridiques fournis (statuts, pacte d'associés, PV) et extrayez les règles de gouvernance RÉELLES telles qu'écrites dans ces documents.

NE PAS utiliser de règles par défaut. Extrayez uniquement ce qui est explicitement écrit dans les documents.

Pour les organes de gouvernance, identifiez :
- Le Président (obligatoire dans une SAS)
- Le Directeur Général s'il existe
- Les Directeurs Généraux Délégués s'ils existent
- Le Comité de direction s'il existe
- Le Conseil de surveillance s'il existe
- Tout autre comité mentionné

Retournez un JSON structuré avec les règles extraites et les organes identifiés.`
                },
                {
                  role: "user",
                  content: userContent
                }
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_governance",
                    description: "Extrait les règles de gouvernance et les organes de direction des documents",
                    parameters: {
                      type: "object",
                      properties: {
                        rules: {
                          type: "object",
                          properties: {
                            notice_period_days: {
                              type: "number",
                              description: "Délai de convocation en jours (ex: 15, 8, 21)"
                            },
                            approval_deadline_days: {
                              type: "number",
                              description: "Délai d'approbation des comptes après clôture en jours (ex: 180 pour 6 mois)"
                            },
                            quorum_rules_summary: {
                              type: "string",
                              description: "Résumé des règles de quorum tel qu'écrit dans les statuts"
                            },
                            majority_rules_summary: {
                              type: "string",
                              description: "Résumé des règles de majorité (ordinaire et extraordinaire)"
                            },
                            who_can_convene: {
                              type: "string",
                              description: "Qui peut convoquer les assemblées selon les statuts"
                            },
                            meeting_modality_rules: {
                              type: "object",
                              properties: {
                                written_consultation: { type: "boolean" },
                                video_conference: { type: "boolean" },
                                physical_meeting: { type: "boolean" }
                              },
                              description: "Modalités de réunion autorisées"
                            },
                            annual_obligations: {
                              type: "array",
                              items: { type: "string" },
                              description: "Liste des obligations annuelles spécifiques mentionnées"
                            },
                            special_clauses_flags: {
                              type: "array",
                              items: { type: "string" },
                              description: "Clauses particulières ou inhabituelles à signaler"
                            },
                            open_questions: {
                              type: "array",
                              items: { type: "string" },
                              description: "Questions non résolues ou ambiguïtés dans les documents"
                            }
                          }
                        },
                        bodies: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              body_type: {
                                type: "string",
                                enum: ["PRESIDENT", "DIRECTEUR_GENERAL", "DIRECTEUR_GENERAL_DELEGUE", "COMITE_DIRECTION", "CONSEIL_SURVEILLANCE", "COMITE_STRATEGIQUE", "OTHER"]
                              },
                              name: { type: "string", description: "Nom de l'organe tel qu'écrit dans les statuts" },
                              holder_name: { type: "string", description: "Nom du titulaire actuel si mentionné" },
                              powers_summary: { type: "string", description: "Résumé des pouvoirs tels que définis dans les statuts" },
                              appointment_rules: { type: "string", description: "Règles de nomination selon les statuts" },
                              term_duration: { type: "string", description: "Durée du mandat si spécifiée" }
                            },
                            required: ["body_type", "name"]
                          }
                        },
                        source_references: {
                          type: "array",
                          items: { type: "string" },
                          description: "Références aux articles des statuts utilisés (ex: 'Article 12', 'Article 15.2')"
                        }
                      },
                      required: ["rules", "bodies"]
                    }
                  }
                }
              ],
              tool_choice: { type: "function", function: { name: "extract_governance" } }
            }),
          });

          if (response.ok) {
            const aiData = await response.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              const parsed = JSON.parse(toolCall.function.arguments);
              if (parsed.rules) {
                // Merge AI results with defaults (AI values take precedence)
                analysisResult = {
                  ...analysisResult,
                  ...parsed.rules,
                  // Keep arrays from AI if provided, otherwise keep defaults
                  annual_obligations: parsed.rules.annual_obligations?.length > 0
                    ? parsed.rules.annual_obligations
                    : analysisResult.annual_obligations,
                  special_clauses_flags: parsed.rules.special_clauses_flags || [],
                  open_questions: parsed.rules.open_questions || []
                };
              }
              if (parsed.bodies && Array.isArray(parsed.bodies) && parsed.bodies.length > 0) {
                governanceBodies = parsed.bodies;
              }
              if (parsed.source_references) {
                console.log("Source references:", parsed.source_references);
              }
              console.log("AI analysis complete from actual documents, found", governanceBodies.length, "governance bodies");
            }
          } else {
            const errorText = await response.text();
            console.error("AI API error:", response.status, errorText);
          }
        } catch (aiError) {
          console.error("AI analysis error (using defaults):", aiError);
        }
      } else {
        console.log("No documents could be downloaded, using default rules");
      }
    } else {
      console.log("No AI key or no documents, using default SAS rules");
    }

    // Upsert governance profile
    const { data: profile, error: profileError } = await supabase
      .from("governance_profiles")
      .upsert({
        company_id: companyId,
        ...analysisResult
      }, {
        onConflict: "company_id"
      })
      .select()
      .single();

    if (profileError) throw profileError;

    console.log("Governance profile created/updated:", profile.id);

    // Delete existing governance bodies for this company and insert new ones
    const { error: deleteError } = await supabase
      .from("governance_bodies")
      .delete()
      .eq("company_id", companyId);

    if (deleteError) {
      console.error("Error deleting old governance bodies:", deleteError);
    }

    // Insert new governance bodies
    if (governanceBodies.length > 0) {
      const bodiesToInsert = governanceBodies.map(body => ({
        company_id: companyId,
        body_type: body.body_type,
        name: body.name,
        holder_name: body.holder_name || null,
        powers_summary: body.powers_summary || null,
        appointment_rules: body.appointment_rules || null,
        term_duration: body.term_duration || null
      }));

      const { error: insertError } = await supabase
        .from("governance_bodies")
        .insert(bodiesToInsert);

      if (insertError) {
        console.error("Error inserting governance bodies:", insertError);
      } else {
        console.log("Inserted", bodiesToInsert.length, "governance bodies");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      profile,
      bodiesCount: governanceBodies.length,
      documentsAnalyzed: documents?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-governance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
