import { supabase } from '@/integrations/supabase/client';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface EdgeFunctionResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Invokes a Supabase edge function with automatic retry, exponential backoff,
 * and explicit timeout control using native fetch.
 */
export async function invokeWithRetry<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: RetryOptions = {}
): Promise<EdgeFunctionResult<T>> {
  const { maxRetries = 4, baseDelay = 2000, timeout = 30000, onRetry } = options;

  let lastError: Error | null = null;

  // Get URL and session token
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${accessToken || anonKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data: data as T, error: null };

    } catch (err) {
      clearTimeout(timeoutId);
      
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      const isRetryable =
        error.name === 'AbortError' ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('timeout');

      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        onRetry?.(attempt + 1, error);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached - return immediately
      return { data: null, error };
    }
  }

  return {
    data: null,
    error: lastError || new Error('Max retries exceeded')
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
