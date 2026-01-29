import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateRequest, schemas } from "../_shared/validation.ts";

interface RequestBody {
  companyId: string;
  message: string;
  threadTs?: string;
}

interface SlackResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Validate input
    const validation = await validateRequest<RequestBody>(req, schemas.postToSlack, origin);
    if ('error' in validation) return validation.error;

    const { companyId, message, threadTs } = validation.data;

    console.log("Posting to Slack for company:", companyId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const slackApiToken = Deno.env.get("SLACK_API_KEY");

    if (!slackApiToken) {
      return new Response(
        JSON.stringify({ error: "Slack API token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get integration settings for this company
    const { data: settings, error: settingsError } = await supabase
      .from("integration_settings")
      .select("slack_channel_id, slack_enabled")
      .eq("company_id", companyId)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Integration settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings.slack_enabled) {
      return new Response(
        JSON.stringify({ error: "Slack integration is disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings.slack_channel_id) {
      return new Response(
        JSON.stringify({ error: "Slack channel not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Post message to Slack
    const slackPayload: Record<string, unknown> = {
      channel: settings.slack_channel_id,
      text: message,
      unfurl_links: false,
      unfurl_media: false,
    };

    // If replying to a thread
    if (threadTs) {
      slackPayload.thread_ts = threadTs;
    }

    const slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${slackApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
    });

    const slackData: SlackResponse = await slackResponse.json();

    if (!slackData.ok) {
      console.error("Slack API error:", slackData.error);
      return new Response(
        JSON.stringify({ error: `Slack error: ${slackData.error}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Message posted to Slack:", slackData.ts);

    return new Response(
      JSON.stringify({
        success: true,
        messageTs: slackData.ts,
        channel: slackData.channel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in post-to-slack:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
