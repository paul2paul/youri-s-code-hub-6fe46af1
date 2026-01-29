import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mock getSession function
const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { access_token: 'mock-token' } },
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock import.meta.env
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key');

// Import after mocking
import { invokeWithRetry } from '@/lib/retryFetch';

describe('invokeWithRetry', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return data on successful fetch', async () => {
    const mockData = { success: true, result: 'test' };
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await invokeWithRetry('test-function', { foo: 'bar' });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/test-function',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
      })
    );
  });

  it('should retry on network error and eventually succeed', async () => {
    const mockData = { success: true };

    // Fail first attempt, succeed on second
    fetchSpy
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

    const onRetry = vi.fn();
    const result = await invokeWithRetry('test-function', {}, {
      maxRetries: 4,
      baseDelay: 10, // Short delay for tests
      onRetry,
    });

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should return error after max retries exceeded', async () => {
    fetchSpy.mockRejectedValue(new Error('Failed to fetch'));

    const result = await invokeWithRetry('test-function', {}, {
      maxRetries: 2,
      baseDelay: 10,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Failed to fetch');
    expect(fetchSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry on HTTP 4xx errors', async () => {
    // Use mockResolvedValue to return the same response for all calls
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' }),
    } as Response);

    const result = await invokeWithRetry('test-function', {}, {
      maxRetries: 3,
      baseDelay: 10,
      timeout: 5000,
    });

    expect(result.data).toBeNull();
    // The error message "Bad request" doesn't contain "Failed to fetch" or "NetworkError"
    // so it should not retry according to the isRetryable logic
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toBe('Bad request');
    // Should only be called once since HTTP errors are not retried
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff delays', async () => {
    const mockData = { success: true };

    // Track call times
    const callTimes: number[] = [];
    fetchSpy.mockImplementation(() => {
      callTimes.push(Date.now());
      if (callTimes.length < 3) {
        return Promise.reject(new Error('Failed to fetch'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);
    });

    const baseDelay = 50;
    const result = await invokeWithRetry('test-function', {}, {
      maxRetries: 4,
      baseDelay,
    });

    expect(result.data).toEqual(mockData);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Check that delays increase (with some tolerance for timing)
    if (callTimes.length >= 3) {
      const delay1 = callTimes[1] - callTimes[0];
      const delay2 = callTimes[2] - callTimes[1];
      // Second delay should be roughly double the first (exponential backoff)
      expect(delay2).toBeGreaterThanOrEqual(delay1);
    }
  });

  it('should return error on HTTP 5xx status', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    } as Response);

    const result = await invokeWithRetry('test-function', {}, {
      maxRetries: 0, // No retries to test immediate failure
      timeout: 5000,
    });

    // Note: Current implementation doesn't retry HTTP errors, only network errors
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toBe('Server error');
  });
});
