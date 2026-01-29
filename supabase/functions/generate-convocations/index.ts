import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

interface RequestBody {
  companyId: string;
  cycleYear?: number;
  agmDate?: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.generateConvocations, origin);
    if ('error' in validation) return validation.error;

    const { companyId, cycleYear, agmDate } = validation.data;

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
      `${supabaseUrl}/rest/v1/stakeholders?company_id=eq.${companyId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const stakeholders = await stakeholdersResponse.json();

    // Fetch governance profile
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/governance_profiles?company_id=eq.${companyId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    const profiles = await profileResponse.json();
    const profile = profiles[0];

    const noticePeriod = profile?.notice_period_days || 15;
    const meetingDate = agmDate || new Date(Date.now() + noticePeriod * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Generate convocation for each stakeholder
    const convocations = stakeholders.map((stakeholder: {
      id: string;
      name: string;
      email?: string;
      role: string;
      share_percentage?: number;
    }) => {
      const emailDisplay = stakeholder.email || '[EMAIL À COMPLÉTER]';
      const shareDisplay = stakeholder.share_percentage
        ? `${stakeholder.share_percentage}% des parts sociales`
        : '[PARTS À PRÉCISER]';

      const convocationText = `
# CONVOCATION À L'ASSEMBLÉE GÉNÉRALE ORDINAIRE

**${company.name}**
Société par Actions Simplifiée au capital de [CAPITAL] euros
Siège social : [ADRESSE]
${company.siren ? `SIREN : ${company.siren}` : 'SIREN : [À COMPLÉTER]'}

---

**Destinataire :**
${stakeholder.name}
Email : ${emailDisplay}
Parts détenues : ${shareDisplay}

---

Madame, Monsieur,

Vous êtes convoqué(e) à l'Assemblée Générale Ordinaire Annuelle de la société **${company.name}** qui se tiendra :

**Date :** ${new Date(meetingDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
**Heure :** [HEURE À PRÉCISER]
**Lieu :** [LIEU OU VISIOCONFÉRENCE]

---

## Ordre du jour

1. Lecture et approbation du rapport de gestion du Président sur l'exercice clos le ${company.fiscal_year_end}
2. Approbation des comptes annuels de l'exercice ${cycleYear || new Date().getFullYear() - 1}
3. Affectation du résultat de l'exercice
4. Quitus au Président pour sa gestion
5. Questions diverses

---

## Documents joints

Les documents suivants sont tenus à votre disposition au siège social :
- Rapport de gestion
- Comptes annuels (bilan, compte de résultat, annexe)
- Texte des résolutions proposées

---

## Modalités de participation

Vous pouvez :
- Assister personnellement à l'assemblée
- Vous faire représenter par un autre associé muni d'un pouvoir
- Voter par correspondance (formulaire joint)

---

Fait à [VILLE], le ${new Date().toLocaleDateString('fr-FR')}

**Le Président**
${company.president_name}

---

*Cette convocation est adressée conformément aux statuts de la société et aux dispositions légales applicables aux SAS.*

---

**\u26A0\uFE0F BROUILLON** – Ce document doit être vérifié et validé avant utilisation.
Ceci n'est pas un conseil juridique.
`;

      return {
        stakeholder_id: stakeholder.id,
        stakeholder_name: stakeholder.name,
        stakeholder_email: stakeholder.email,
        stakeholder_role: stakeholder.role,
        share_percentage: stakeholder.share_percentage,
        convocation_text: convocationText.trim(),
        email_missing: !stakeholder.email,
      };
    });

    console.log(`Generated ${convocations.length} convocations for company ${companyId}`);

    return new Response(
      JSON.stringify({
        company_name: company.name,
        meeting_date: meetingDate,
        notice_period_days: noticePeriod,
        convocations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating convocations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
