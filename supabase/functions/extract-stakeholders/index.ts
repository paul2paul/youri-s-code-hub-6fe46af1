import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface RequestBody {
  companyId: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.extractStakeholders, origin);
    if ('error' in validation) return validation.error;

    const { companyId } = validation.data;

    console.log("Extracting stakeholders for company:", companyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company documents - prioritize CAPTABLE
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", companyId)
      .in("type", ["CAPTABLE", "STATUTS", "PACTE"]);

    if (docError) throw docError;

    console.log("Found documents:", documents?.length);

    // Get existing stakeholders to avoid duplicates
    const { data: existingStakeholders } = await supabase
      .from("stakeholders")
      .select("name, email")
      .eq("company_id", companyId);

    const existingNames = new Set(existingStakeholders?.map(s => s.name.toLowerCase()) || []);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        extracted: [],
        message: "Aucun document à analyser"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prioritize CAPTABLE document, then STATUTS
    const priorityOrder = ["CAPTABLE", "STATUTS", "PACTE"];
    const sortedDocs = [...documents].sort((a, b) => {
      return priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type);
    });

    // Download the first available PDF and send to vision model
    let documentBase64: string | null = null;
    let documentName: string | null = null;
    let documentType: string | null = null;

    for (const doc of sortedDocs) {
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

          documentBase64 = arrayBufferToBase64(arrayBuffer);
          documentName = doc.file_name;
          documentType = doc.type;
          console.log(`Prepared document: ${doc.file_name} (${arrayBuffer.byteLength} bytes)`);
          break; // Use first successfully downloaded document
        }
      } catch (err) {
        console.error(`Error processing ${doc.file_name}:`, err);
      }
    }

    if (!documentBase64) {
      console.log("No document could be downloaded for analysis");
      return new Response(JSON.stringify({
        success: true,
        extracted: [],
        message: "Impossible de télécharger les documents"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending ${documentName} to vision model for analysis`);

    // Use Gemini vision model to analyze the PDF directly
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
            content: `Tu es un expert juridique français spécialisé dans les SAS/SARL et l'analyse de cap tables (tableaux de capitalisation).

Tu dois analyser le document PDF fourni et extraire chaque associé/actionnaire avec :
- name: nom complet (prénom + nom) ou raison sociale pour les personnes morales
- role: PRESIDENT, SHAREHOLDER, ou ACCOUNTANT
- shares_count: le NOMBRE de parts/actions détenues (nombre entier)
- email: email si disponible (null sinon)

RÈGLES IMPORTANTES:
1. Extrait TOUS les associés/actionnaires mentionnés
2. Le président est généralement aussi actionnaire
3. shares_count doit être un NOMBRE ENTIER (pas de virgule)
4. Cherche la colonne "Shares", "Actions", "Parts" ou équivalent pour le nombre de parts
5. NE PAS confondre le nombre de parts avec le pourcentage
6. Si une personne morale (société) est actionnaire, inclus-la aussi
7. Sois précis sur les noms (respecte la casse et l'orthographe)`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse ce document (${documentType}: ${documentName}) et extrait la liste complète des associés/actionnaires avec leurs noms, rôles et pourcentages de parts.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${documentBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_stakeholders",
              description: "Extrait la liste des associés depuis le document",
              parameters: {
                type: "object",
                properties: {
                  stakeholders: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nom complet de l'associé" },
                        role: {
                          type: "string",
                          enum: ["PRESIDENT", "SHAREHOLDER", "ACCOUNTANT"],
                          description: "Rôle de l'associé"
                        },
                        shares_count: {
                          type: "integer",
                          nullable: true,
                          description: "Nombre de parts/actions détenues (entier)"
                        },
                        email: {
                          type: "string",
                          nullable: true,
                          description: "Adresse email"
                        }
                      },
                      required: ["name", "role"]
                    }
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Niveau de confiance dans l'extraction"
                  },
                  notes: {
                    type: "string",
                    description: "Notes ou observations sur l'extraction"
                  }
                },
                required: ["stakeholders", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_stakeholders" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      throw new Error("No extraction result from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);
    const extractedStakeholders = result.stakeholders || [];

    console.log("Extracted stakeholders:", extractedStakeholders.length, "confidence:", result.confidence);
    console.log("Extraction notes:", result.notes);

    // Filter out existing stakeholders and insert new ones
    const newStakeholders = extractedStakeholders.filter(
      (s: { name: string }) => !existingNames.has(s.name.toLowerCase())
    );

    const insertedStakeholders = [];

    for (const stakeholder of newStakeholders) {
      const { data, error } = await supabase
        .from("stakeholders")
        .insert({
          company_id: companyId,
          name: stakeholder.name,
          email: stakeholder.email || "",
          role: stakeholder.role,
          shares_count: stakeholder.shares_count || null,
          share_percentage: null, // Will be calculated dynamically
        })
        .select()
        .single();

      if (!error && data) {
        insertedStakeholders.push(data);
        console.log("Inserted stakeholder:", stakeholder.name);
      } else if (error) {
        console.error("Error inserting stakeholder:", stakeholder.name, error);
      }
    }

    console.log("Inserted new stakeholders:", insertedStakeholders.length);

    return new Response(JSON.stringify({
      success: true,
      extracted: extractedStakeholders,
      inserted: insertedStakeholders,
      confidence: result.confidence,
      notes: result.notes,
      documentAnalyzed: documentName,
      message: insertedStakeholders.length > 0
        ? `${insertedStakeholders.length} associé(s) importé(s)`
        : extractedStakeholders.length > 0
          ? "Tous les associés sont déjà enregistrés"
          : "Aucun associé trouvé dans le document"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in extract-stakeholders:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
