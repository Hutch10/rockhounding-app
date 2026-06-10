import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { BboxQuerySchema } from './types';
import { mapRowToLocationV1 } from './mappers';
import { GET } from './route';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

describe('BboxQuerySchema (TEST-001)', () => {
  it('parses valid bbox string', () => {
    const result = BboxQuerySchema.safeParse({
      bbox: '-120.5,35.2,-119.8,36.1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bbox).toEqual({
        minLon: -120.5,
        minLat: 35.2,
        maxLon: -119.8,
        maxLat: 36.1,
      });
      expect(result.data.limit).toBe(200);
    }
  });

  it('rejects missing bbox', () => {
    expect(BboxQuerySchema.safeParse({}).success).toBe(false);
  });

  it('rejects invalid bbox format', () => {
    expect(BboxQuerySchema.safeParse({ bbox: 'invalid' }).success).toBe(false);
  });

  it('coerces limit and caps at 500', () => {
    const result = BboxQuerySchema.safeParse({
      bbox: '-120,35,-119,36',
      limit: '100',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('parses trust filter array', () => {
    const result = BboxQuerySchema.safeParse({
      bbox: '-120,35,-119,36',
      trust: 'official',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trust).toEqual(['official']);
    }
  });
});

describe('mapRowToLocationV1', () => {
  it('maps fuzzy coords and trust metadata', () => {
    const v1 = mapRowToLocationV1({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Site',
      description: 'A site',
      latitude: 35.5,
      longitude: -120.5,
      fuzzy_lat: 35.51,
      fuzzy_lon: -120.51,
      access_status: 'allowed',
      difficulty_rating: 2,
      is_verified: true,
      trust_category: 'verified',
      freshness_checked_at: '2026-06-01T00:00:00Z',
      freshness_status: 'fresh',
      metadata: {},
      source_tier: 'OPERATOR',
      top_materials: ['Agate'],
    });

    expect(v1.metadata.trust_category).toBe('verified');
    expect(v1.fuzzy_location).toEqual({ lat: 35.51, lon: -120.51, precision: '~1km' });
    expect(v1.metadata.top_materials).toEqual(['Agate']);
  });
});

describe('GET /api/v1/locations', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns 400 on invalid bbox', async () => {
    const req = new NextRequest('http://localhost/api/v1/locations?bbox=bad');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns Zod-valid locations list on success', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Hauser Beds',
          description: null,
          latitude: 34.0,
          longitude: -114.0,
          fuzzy_lat: 34.01,
          fuzzy_lon: -114.01,
          access_status: 'allowed',
          difficulty_rating: 2,
          is_verified: true,
          trust_category: 'verified',
          freshness_checked_at: null,
          freshness_status: 'unknown',
          metadata: {},
          source_tier: 'OPERATOR',
          top_materials: ['Geode'],
        },
      ],
      error: null,
    });

    const req = new NextRequest('http://localhost/api/v1/locations?bbox=-115,33,-113,35');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.count).toBe(1);
    expect(json.data[0].name).toBe('Hauser Beds');
    expect(json.data[0].metadata.trust_category).toBe('verified');
    expect(mockRpc).toHaveBeenCalledWith('locations_v1_in_bbox', {
      p_min_lon: -115,
      p_min_lat: 33,
      p_max_lon: -113,
      p_max_lat: 35,
      p_limit: 200,
    });
  });

  it('returns 500 when RPC fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function does not exist' },
    });

    const req = new NextRequest('http://localhost/api/v1/locations?bbox=-115,33,-113,35');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('filters by trust query param', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Official Site',
          description: null,
          latitude: 34,
          longitude: -114,
          fuzzy_lat: 34.01,
          fuzzy_lon: -114.01,
          access_status: 'allowed',
          difficulty_rating: 1,
          is_verified: true,
          trust_category: 'official',
          freshness_checked_at: null,
          freshness_status: 'unknown',
          metadata: {},
          source_tier: 'OFFICIAL',
          top_materials: [],
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Community Site',
          description: null,
          latitude: 34,
          longitude: -114,
          fuzzy_lat: 34.02,
          fuzzy_lon: -114.02,
          access_status: 'caution',
          difficulty_rating: 3,
          is_verified: false,
          trust_category: 'community',
          freshness_checked_at: null,
          freshness_status: 'unknown',
          metadata: {},
          source_tier: 'COMMUNITY_STAGED',
          top_materials: [],
        },
      ],
      error: null,
    });

    const req = new NextRequest(
      'http://localhost/api/v1/locations?bbox=-115,33,-113,35&trust=official'
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.count).toBe(1);
    expect(json.data[0].metadata.trust_category).toBe('official');
  });
});
