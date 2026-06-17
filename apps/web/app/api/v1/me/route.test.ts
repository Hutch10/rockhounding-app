import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GET } from './route';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

describe('GET /api/v1/me (API-005)', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns ProfileV1 for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, created_at: '2026-01-01T00:00:00.000Z', user_metadata: {} } },
    });

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: USER_ID,
          username: 'field_agent',
          display_name: 'Field Agent',
          avatar_url: null,
          reputation_score: 120,
          trust_level: 2,
          is_admin: false,
          preferences: { theme: 'dark' },
          created_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);

    const body: unknown = await res.json();
    expect(body).toMatchObject({
      id: USER_ID,
      username: 'field_agent',
      display_name: 'Field Agent',
      reputation_score: 120,
      trust_level: 2,
      is_admin: false,
    });
  });

  it('returns fallback ProfileV1 when profile row missing', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          created_at: '2026-02-01T00:00:00.000Z',
          user_metadata: { username: 'beta1', display_name: 'Beta Tester' },
        },
      },
    });

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);

    const body: unknown = await res.json();
    expect(body).toMatchObject({
      id: USER_ID,
      username: 'beta1',
      display_name: 'Beta Tester',
      reputation_score: 100,
      trust_level: 1,
    });
  });
});
