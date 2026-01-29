/**
 * Input sanitization for AI prompts to prevent prompt injection attacks.
 * Removes or escapes potentially malicious patterns before including user input in LLM prompts.
 */

// Maximum allowed length for user input in AI prompts
const MAX_AI_INPUT_LENGTH = 5000;

// Patterns that could be used for prompt injection
const DANGEROUS_PATTERNS = [
  // System prompt manipulation attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /new\s+instructions?:/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /user\s*:/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  // Role injection
  /you\s+are\s+now\s+(a\s+)?/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /act\s+as\s+(if\s+you\s+are|a)/gi,
  /roleplay\s+as/gi,
  // Jailbreak attempts
  /DAN\s*:/gi,
  /developer\s+mode/gi,
  /jailbreak/gi,
  // Output manipulation
  /print\s+(the\s+)?(system|hidden|secret)\s+prompt/gi,
  /reveal\s+(the\s+)?(system|hidden|secret)\s+prompt/gi,
  /show\s+(the\s+)?(system|hidden|secret)\s+prompt/gi,
];

// Control characters that should be removed
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitizes user input before including it in an AI prompt.
 * @param input - Raw user input
 * @returns Sanitized input safe for AI prompts
 */
export function sanitizeForAI(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove control characters (keep newlines and tabs)
  sanitized = sanitized.replace(CONTROL_CHAR_REGEX, '');

  // Enforce maximum length
  if (sanitized.length > MAX_AI_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_AI_INPUT_LENGTH) + '... [tronqué]';
  }

  // Replace dangerous patterns with safe versions
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[contenu filtré]');
  }

  // Escape any remaining angle brackets that could look like special tokens
  sanitized = sanitized.replace(/</g, '‹').replace(/>/g, '›');

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s{10,}/g, ' '.repeat(10));

  return sanitized.trim();
}

/**
 * Checks if input contains potentially malicious patterns.
 * Can be used for logging/monitoring without modifying the input.
 */
export function containsSuspiciousPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Logs suspicious input for security monitoring.
 */
export function logSuspiciousInput(input: string, context: string): void {
  if (containsSuspiciousPatterns(input)) {
    console.warn(`[SECURITY] Suspicious input detected in ${context}:`, {
      length: input.length,
      preview: input.slice(0, 100),
      timestamp: new Date().toISOString(),
    });
  }
}
