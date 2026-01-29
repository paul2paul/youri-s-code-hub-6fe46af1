import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

// Webhook event types
type WebhookEvent =
  | "timeline_generated"
  | "task_due_14_days"
  | "task_due_7_days"
  | "task_overdue";

interface WebhookPayload {
  event: WebhookEvent;
  company_id: string;
  company_name: string;
  task_id?: string;
  task_title?: string;
  task_due_date?: string;
  cycle_year?: number;
  timestamp: string;
}

interface RequestBody {
  action: string;
  companyId?: string;
  taskId?: string;
  webhookUrl?: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // This endpoint can be called by a cron job to check for upcoming/overdue tasks
  // Or called directly when a timeline is generated

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.webhookTrigger, origin);
    if ('error' in validation) return validation.error;

    const { action, companyId, webhookUrl } = validation.data;

    console.log("Webhook trigger received:", { action, companyId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhooks: WebhookPayload[] = [];

    if (action === "timeline_generated") {
      // Fetch company info
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      webhooks.push({
        event: "timeline_generated",
        company_id: companyId!,
        company_name: company?.name || "Unknown",
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "check_due_tasks") {
      // Find all tasks due in 14 days or 7 days or overdue
      const today = new Date();
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);
      const in14Days = new Date(today);
      in14Days.setDate(in14Days.getDate() + 14);

      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          due_date,
          status,
          cycle_year,
          company_id,
          companies(name)
        `)
        .neq("status", "DONE")
        .lte("due_date", in14Days.toISOString());

      if (tasks) {
        for (const task of tasks) {
          const dueDate = new Date(task.due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let event: WebhookEvent | null = null;

          if (daysUntilDue < 0) {
            event = "task_overdue";
          } else if (daysUntilDue <= 7) {
            event = "task_due_7_days";
          } else if (daysUntilDue <= 14) {
            event = "task_due_14_days";
          }

          if (event) {
            webhooks.push({
              event,
              company_id: task.company_id,
              company_name: (task.companies as { name?: string })?.name || "Unknown",
              task_id: task.id,
              task_title: task.title,
              task_due_date: task.due_date,
              cycle_year: task.cycle_year,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    // If a webhook URL is provided, send the payloads
    // This allows integration with Zapier/Make
    if (webhookUrl && webhooks.length > 0) {
      for (const payload of webhooks) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          // Log the nudge
          if (payload.task_id) {
            await supabase.from("task_nudges").insert({
              task_id: payload.task_id,
              channel: "SLACK", // Assuming webhook = Slack
              payload,
            });
          }
        } catch (err) {
          console.error("Failed to send webhook:", err);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      webhooksTriggered: webhooks.length,
      webhooks
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in webhook-trigger:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
