import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

interface RequestBody {
  companyId: string;
  agmDate?: string;
  agmLocation?: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.generateAttendanceSheet, origin);
    if ('error' in validation) return validation.error;

    const { companyId, agmDate, agmLocation } = validation.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch company details
    const companyResponse = await fetch(
      `${supabaseUrl}/rest/v1/companies?id=eq.${companyId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const companies = await companyResponse.json();
    const company = companies[0];

    if (!company) {
      throw new Error('Company not found');
    }

    // Fetch stakeholders
    const stakeholdersResponse = await fetch(
      `${supabaseUrl}/rest/v1/stakeholders?company_id=eq.${companyId}&select=*&order=name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const stakeholders = await stakeholdersResponse.json();

    const meetingDate = agmDate || new Date().toISOString().split('T')[0];
    const location = agmLocation || '[LIEU À PRÉCISER]';

    // Calculate total shares
    const totalShares = stakeholders.reduce((sum: number, s: { share_percentage?: number }) => sum + (s.share_percentage || 0), 0);

    // Generate stakeholder rows
    const stakeholderRows = stakeholders.map((s: { name: string; share_percentage?: number }, index: number) => {
      return `| ${index + 1} | ${s.name} | ${s.share_percentage || '-'}% | \u2610 | | |`;
    }).join('\n');

    const attendanceSheet = `
# FEUILLE DE PRÉSENCE

## Assemblée Générale Ordinaire Annuelle

---

**${company.name}**
Société par Actions Simplifiée
${company.siren ? `SIREN : ${company.siren}` : 'SIREN : [À COMPLÉTER]'}
Siège social : [ADRESSE]

---

**Date de l'Assemblée :** ${new Date(meetingDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
**Heure :** [HEURE]
**Lieu :** ${location}

---

## Liste des associés

| N° | Nom de l'associé | Parts (%) | Présent | Représenté par | Signature |
|----|-----------------|-----------|---------|----------------|-----------|
${stakeholderRows}

---

## Résumé

- **Nombre total d'associés :** ${stakeholders.length}
- **Parts représentées :** ______ %
- **Quorum atteint :** \u2610 Oui  \u2610 Non

---

## Observations

_________________________________________________________________

_________________________________________________________________

---

## Certification

La présente feuille de présence a été établie et émargée avant l'ouverture de l'Assemblée Générale.

**Le Président de séance**

Nom : ${company.president_name}

Signature :



---

*Document établi conformément aux dispositions légales et statutaires.*

---

**\u26A0\uFE0F BROUILLON** – Ce document doit être vérifié et validé avant utilisation.
`;

    console.log(`Generated attendance sheet for company ${companyId} with ${stakeholders.length} stakeholders`);

    return new Response(
      JSON.stringify({
        company_name: company.name,
        meeting_date: meetingDate,
        location,
        stakeholder_count: stakeholders.length,
        total_shares: totalShares,
        attendance_sheet: attendanceSheet.trim(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating attendance sheet:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
