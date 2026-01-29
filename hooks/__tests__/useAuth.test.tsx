import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { mockUser, mockSession } from '@/test/mocks/supabase';

// Create a mock getSession function
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => mockOnAuthStateChange(callback),
      signUp: (params: { email: string; password: string; options?: object }) => mockSignUp(params),
      signInWithPassword: (params: { email: string; password: string }) => mockSignInWithPassword(params),
      signOut: () => mockSignOut(),
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));

    mockSignUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    mockSignOut.mockResolvedValue({
      error: null,
    });
  });

  it('should start in loading state', () => {
    // Keep getSession pending to test loading state
    mockGetSession.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return null user when not authenticated', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.session).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return user when authenticated via getSession', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should update state on auth state change', async () => {
    let authCallback: (event: string, session: unknown) => void;

    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);

    // Simulate auth state change
    authCallback!('SIGNED_IN', mockSession);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should call signIn correctly', async () => {
    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.signIn('test@example.com', 'password123');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should call signOut correctly', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.signOut();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should call signUp with correct redirect URL', async () => {
    const { result } = renderHook(() => useAuthContext(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.signUp('new@example.com', 'password123');

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        emailRedirectTo: expect.stringContaining('/'),
      },
    });
  });
});
