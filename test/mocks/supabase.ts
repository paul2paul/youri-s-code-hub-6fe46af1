import { vi } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';

// Mock user data
export const mockUser: User = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

// Mock session data
export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
};

// Mock company data
export const mockCompany = {
  id: 'test-company-id-123',
  user_id: mockUser.id,
  name: 'Test Company SAS',
  siren: '123456789',
  president_name: 'Jean Dupont',
  president_email: 'jean@test-company.com',
  fiscal_year_end: '2024-12-31',
  legal_form: 'SAS',
  jurisdiction: 'France',
  timezone: 'Europe/Paris',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

// Mock stakeholder data
export const mockStakeholder = {
  id: 'test-stakeholder-id-123',
  company_id: mockCompany.id,
  name: 'Jean Dupont',
  email: 'jean@test-company.com',
  role: 'PRESIDENT' as const,
  share_percentage: 60,
  shares_count: 6000,
  created_at: '2024-01-01T00:00:00.000Z',
};

// Mock governance profile
export const mockGovernanceProfile = {
  id: 'test-profile-id-123',
  company_id: mockCompany.id,
  notice_period_days: 15,
  approval_deadline_days: 180,
  quorum_rules_summary: 'Standard quorum rules',
  majority_rules_summary: 'Simple majority',
  who_can_convene: 'Le Président',
  meeting_modality_rules: {
    written_consultation: true,
    video_conference: true,
    physical_meeting: true,
  },
  annual_obligations: ['Approve accounts', 'File with Greffe'],
  special_clauses_flags: [],
  open_questions: [],
  created_at: '2024-01-01T00:00:00.000Z',
};

/**
 * Create a mock Supabase client for testing.
 */
export function createMockSupabaseClient() {
  const mockSubscription = {
    unsubscribe: vi.fn(),
  };

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: mockSubscription },
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    },
  };
}

/**
 * Create an authenticated mock client.
 */
export function createAuthenticatedMockClient() {
  const client = createMockSupabaseClient();
  client.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });
  return client;
}
