import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('GET /api/v1/locations/:id (API-002)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns 400 for non-uuid id', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when location missing', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns Tier-1 detail with trust in metadata', async () => {
    const locationChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Site',
          description: 'Look for agates',
          latitude: 35.5,
          longitude: -120.5,
          access_status: 'allowed',
          difficulty_rating: 2,
          is_verified: true,
          trust_category: 'verified',
          freshness_checked_at: '2026-06-01T00:00:00.000Z',
          freshness_status: 'fresh',
          metadata: { collecting_summary: 'North slope' },
          source_tier: 'OPERATOR',
        },
        error: null,
      }),
    };

    const materialsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ abundance: 'common', materials: { id: 'm1', name: 'Agate' } }],
        error: null,
      }),
    };

    const rulesetChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockFrom
      .mockReturnValueOnce(locationChain)
      .mockReturnValueOnce(materialsChain)
      .mockReturnValueOnce(rulesetChain);

    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe('Test Site');
    expect(json.data.metadata.trust_category).toBe('verified');
    expect(json.data.materials).toHaveLength(1);
  });
});
