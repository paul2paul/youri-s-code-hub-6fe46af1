import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { mockUser, mockSession, mockCompany } from '@/test/mocks/supabase';
import { ReactNode } from 'react';

// Mock functions
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => mockOnAuthStateChange(callback),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe('useCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockOnAuthStateChange.mockImplementation((callback) => {
      // Immediately call with signed in state
      setTimeout(() => callback('SIGNED_IN', mockSession), 0);
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    // Default mock for from()
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('should return company when it exists', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      }),
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(result.current.company).toEqual(mockCompany);
    });
  });

  it('should return undefined company when user not authenticated', async () => {
    // Unauthenticated user
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: createWrapper(),
    });

    // Wait for auth state to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    // The query should be disabled when there's no user
    // company will be undefined (not fetched) rather than null (fetched but empty)
    expect(result.current.company).toBeUndefined();
  });

  it('should have createCompany mutation available', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(typeof result.current.createCompany).toBe('function');
    expect(typeof result.current.updateCompany).toBe('function');
  });

  it('should expose loading states for mutations', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
  });
});
