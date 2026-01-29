/**
 * Input validation utilities for edge functions using Zod-like validation.
 * Provides schema validation and request helpers.
 */

import { getCorsHeaders } from './cors.ts';

// Simple schema validation types (Zod-like but lightweight for Deno)
type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

interface SchemaDefinition {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export function validateSchema<T>(data: unknown, schema: SchemaDefinition): ValidationResult<T> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Invalid request body' };
  }

  const obj = data as Record<string, unknown>;
  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip validation if optional and not provided
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rules.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
        continue;
      }
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${key} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${key} must be at most ${rules.maxLength} characters`);
      }
    }

    if (rules.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${key} must be a number`);
        continue;
      }
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
    }

    if (rules.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(', ') };
  }

  return { success: true, data: obj as T };
}

// Predefined schemas for edge functions
export const schemas = {
  analyzeGovernance: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
  },
  generateTimeline: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
    cycleYear: { type: 'number' as const, required: true, min: 2000, max: 2100 },
  },
  draftAgmPack: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
    cycleYear: { type: 'number' as const, required: true, min: 2000, max: 2100 },
  },
  governanceAdvisor: {
    question: { type: 'string' as const, required: true, minLength: 1, maxLength: 2000 },
    companyId: { type: 'string' as const, required: false },
  },
  extractStakeholders: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
  },
  webhookTrigger: {
    action: { type: 'string' as const, required: true, minLength: 1 },
    companyId: { type: 'string' as const, required: false },
    taskId: { type: 'string' as const, required: false },
    webhookUrl: { type: 'string' as const, required: false },
  },
  generateConvocations: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
    cycleYear: { type: 'number' as const, required: false },
    agmDate: { type: 'string' as const, required: false },
  },
  generateAttendanceSheet: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
    agmDate: { type: 'string' as const, required: false },
    agmLocation: { type: 'string' as const, required: false },
  },
  postToSlack: {
    companyId: { type: 'string' as const, required: true, minLength: 1 },
    message: { type: 'string' as const, required: true, minLength: 1, maxLength: 4000 },
    threadTs: { type: 'string' as const, required: false },
  },
};

/**
 * Helper to validate a request and return an error response if invalid.
 */
export async function validateRequest<T>(
  req: Request,
  schema: SchemaDefinition,
  origin: string | null
): Promise<{ data: T } | { error: Response }> {
  const corsHeaders = getCorsHeaders(origin);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const result = validateSchema<T>(body, schema);

  if (!result.success) {
    return {
      error: new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { data: result.data };
}

/**
 * Verify Slack request signature for slack-webhook.
 * Follows Slack's signing secret verification protocol.
 */
export async function verifySlackSignature(
  req: Request,
  body: string,
  signingSecret: string
): Promise<boolean> {
  const signature = req.headers.get('x-slack-signature');
  const timestamp = req.headers.get('x-slack-request-timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  // Verify timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 60 * 5) {
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(sigBasestring)
  );

  const expectedSignature = 'v0=' + Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}
