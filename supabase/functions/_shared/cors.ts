/**
 * CORS configuration for Supabase edge functions.
 * Only allows requests from known origins.
 */

const ALLOWED_ORIGINS = [
  'https://youri.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function handleCors(req: Request): Response | null {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // For non-OPTIONS requests, return null to indicate the request should proceed
  // The caller should use getCorsHeaders() when building the response
  return null;
}
