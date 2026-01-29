import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { verifySlackSignature } from "../_shared/validation.ts";
import { sanitizeForAI, logSuspiciousInput } from "../_shared/sanitize.ts";

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  // Add Slack-specific headers
  const slackCorsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp',
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const slackSigningSecret = Deno.env.get('SLACK_SIGNING_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Read the raw body for signature verification
    const rawBody = await req.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...slackCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify Slack signature if signing secret is configured
    if (slackSigningSecret) {
      const isValid = await verifySlackSignature(req, rawBody, slackSigningSecret);
      if (!isValid) {
        console.warn('Invalid Slack signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...slackCorsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn('SLACK_SIGNING_SECRET not configured - signature verification skipped');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Slack webhook received:', JSON.stringify(body));

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        status: 200,
        headers: { ...slackCorsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body.event as Record<string, unknown>;

      // Skip bot messages to avoid loops
      if (event.bot_id || event.subtype === 'bot_message') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...slackCorsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle message events
      if (event.type === 'message') {
        // Find company by slack_channel_id
        const { data: settings, error: settingsError } = await supabase
          .from('integration_settings')
          .select('company_id')
          .eq('slack_channel_id', event.channel)
          .eq('slack_enabled', true)
          .single();

        if (settingsError || !settings) {
          console.log('No matching company for channel:', event.channel);
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...slackCorsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Sanitize message text before storing
        const messageText = typeof event.text === 'string' ? event.text : '';
        const sanitizedText = sanitizeForAI(messageText);
        logSuspiciousInput(messageText, 'slack-webhook:message');

        // Store the message
        const userProfile = event.user_profile as Record<string, string> | undefined;
        const { error: insertError } = await supabase
          .from('slack_messages')
          .insert({
            company_id: settings.company_id,
            slack_user_id: event.user,
            slack_user_name: userProfile?.display_name || userProfile?.real_name || null,
            message_text: sanitizedText,
            thread_ts: event.thread_ts || null,
          });

        if (insertError) {
          console.error('Error storing message:', insertError);
        }

        // Handle file uploads
        const files = event.files as Array<Record<string, unknown>> | undefined;
        if (files && files.length > 0) {
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          const SLACK_API_KEY = Deno.env.get('SLACK_API_KEY');

          if (LOVABLE_API_KEY && SLACK_API_KEY) {
            for (const file of files) {
              try {
                // Download file from Slack
                const fileResponse = await fetch(file.url_private_download as string, {
                  headers: {
                    'Authorization': `Bearer ${SLACK_API_KEY}`,
                  },
                });

                if (fileResponse.ok) {
                  const fileBuffer = await fileResponse.arrayBuffer();
                  const fileName = (file.name as string) || `slack-upload-${Date.now()}`;
                  const filePath = `${settings.company_id}/${Date.now()}-${fileName}`;

                  // Upload to Supabase storage
                  const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, fileBuffer, {
                      contentType: file.mimetype as string,
                    });

                  if (!uploadError) {
                    // Create document record
                    await supabase.from('documents').insert({
                      company_id: settings.company_id,
                      type: 'OTHER',
                      file_path: filePath,
                      file_name: fileName,
                      version_label: 'Via Slack',
                    });

                    console.log('File uploaded from Slack:', fileName);
                  } else {
                    console.error('Upload error:', uploadError);
                  }
                }
              } catch (fileError) {
                console.error('Error processing file:', fileError);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...slackCorsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
