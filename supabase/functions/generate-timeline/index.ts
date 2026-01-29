import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

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
    const validation = await validateRequest<RequestBody>(req, schemas.generateTimeline, origin);
    if ('error' in validation) return validation.error;

    const { companyId, cycleYear } = validation.data;

    console.log("Generating timeline for company:", companyId, "year:", cycleYear);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company and governance profile
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (companyError) throw companyError;

    const { data: profile } = await supabase
      .from("governance_profiles")
      .select("*")
      .eq("company_id", companyId)
      .single();

    // Parse fiscal year end
    const fiscalYearEnd = new Date(company.fiscal_year_end);
    const fyeMonth = fiscalYearEnd.getMonth();
    const fyeDay = fiscalYearEnd.getDate();

    // Calculate the FYE for the given cycle year
    const cycleYearFYE = new Date(cycleYear, fyeMonth, fyeDay);

    // Default timing
    const noticePeriod = profile?.notice_period_days || 15;
    const approvalDeadline = profile?.approval_deadline_days || 180; // 6 months

    // Delete existing tasks for this cycle
    await supabase
      .from("tasks")
      .delete()
      .eq("company_id", companyId)
      .eq("cycle_year", cycleYear);

    // Generate tasks with retro-planning dates
    const tasks = [];

    // 1. Collect Year Inputs - 4 months after FYE
    const collectInputsDate = new Date(cycleYearFYE);
    collectInputsDate.setMonth(collectInputsDate.getMonth() + 4);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "COLLECT_YEAR_INPUTS",
      title: "Provide year context and inputs",
      due_date: collectInputsDate.toISOString(),
      owner_role: "PRESIDENT",
      status: "TODO",
      metadata: { description: "Answer questions about capital changes, dividends, notable events" }
    });

    // 2. Collect Accounts - 4.5 months after FYE
    const collectAccountsDate = new Date(cycleYearFYE);
    collectAccountsDate.setMonth(collectAccountsDate.getMonth() + 4);
    collectAccountsDate.setDate(collectAccountsDate.getDate() + 15);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "COLLECT_ACCOUNTS",
      title: "Collect annual accounts from accountant",
      due_date: collectAccountsDate.toISOString(),
      owner_role: "ACCOUNTANT",
      status: "TODO",
      metadata: { description: "Obtain balance sheet, P&L, and annexes" }
    });

    // 3. Draft AGM Pack - 5 months after FYE (leaves time for convocation)
    const draftPackDate = new Date(cycleYearFYE);
    draftPackDate.setMonth(draftPackDate.getMonth() + 5);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "DRAFT_AGM_PACK",
      title: "Draft AGM documentation pack",
      due_date: draftPackDate.toISOString(),
      owner_role: "PRESIDENT",
      status: "TODO",
      metadata: { description: "Prepare convocation, draft resolutions, PV template" }
    });

    // 4. Send Convocations - notice period before deadline
    const sendConvocationsDate = new Date(cycleYearFYE);
    sendConvocationsDate.setMonth(sendConvocationsDate.getMonth() + Math.floor(approvalDeadline / 30));
    sendConvocationsDate.setDate(sendConvocationsDate.getDate() - noticePeriod - 5);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "SEND_CONVOCATIONS",
      title: "Send AGM convocations to shareholders",
      due_date: sendConvocationsDate.toISOString(),
      owner_role: "PRESIDENT",
      status: "TODO",
      metadata: { description: `Must be sent at least ${noticePeriod} days before AGM` }
    });

    // 5. Hold AGM - before approval deadline
    const holdAGMDate = new Date(cycleYearFYE);
    holdAGMDate.setDate(holdAGMDate.getDate() + approvalDeadline - 7);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "HOLD_AGM",
      title: "Hold Annual General Meeting",
      due_date: holdAGMDate.toISOString(),
      owner_role: "PRESIDENT",
      status: "TODO",
      metadata: { description: "Approve accounts and adopt resolutions" }
    });

    // 6. File Accounts - 1 month after AGM
    const fileAccountsDate = new Date(holdAGMDate);
    fileAccountsDate.setMonth(fileAccountsDate.getMonth() + 1);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "FILE_ACCOUNTS",
      title: "File accounts with the Greffe",
      due_date: fileAccountsDate.toISOString(),
      owner_role: "PRESIDENT",
      status: "TODO",
      metadata: { description: "Submit approved accounts to the commercial registry" }
    });

    // 7. Archive - 2 weeks after filing
    const archiveDate = new Date(fileAccountsDate);
    archiveDate.setDate(archiveDate.getDate() + 14);
    tasks.push({
      company_id: companyId,
      cycle_year: cycleYear,
      type: "ARCHIVE",
      title: "Archive governance documents",
      due_date: archiveDate.toISOString(),
      owner_role: "PRESIDENT",
      status: "TODO",
      metadata: { description: "Store signed PV, receipts, and filed documents" }
    });

    // Insert all tasks
    const { data: createdTasks, error: tasksError } = await supabase
      .from("tasks")
      .insert(tasks)
      .select();

    if (tasksError) throw tasksError;

    console.log("Created", createdTasks?.length, "tasks");

    return new Response(JSON.stringify({
      success: true,
      tasksCreated: createdTasks?.length,
      tasks: createdTasks
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-timeline:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
