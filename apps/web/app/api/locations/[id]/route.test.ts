/**
 * Tests for GET /api/locations/:id - Full Detail Endpoint
 * Build Document: Comprehensive validation of full detail contract
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';
import { LegalTag, SourceTier, Status } from '@rockhounding/shared';
import type { FullLocationDetailResponse } from './types';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 1,
              name: 'Crystal Peak',
              description: 'A productive quartz location',
              legal_tag: LegalTag.LEGAL_PUBLIC,
              legal_confidence: 95,
              primary_ruleset_id: 1,
              source_tier: SourceTier.FIELD_VERIFIED,
              verification_date: '2024-06-15T00:00:00Z',
              status: Status.ACTIVE,
              access_model: 'Walk-in',
              difficulty: 2,
              kid_friendly: true,
              geom: 'POINT(-105.5 39.7)',
            },
            error: null,
          })),
        })),
      })),
    })),
    rpc: vi.fn((funcName) => {
      if (funcName === 'get_coordinates') {
        return {
          data: [{ lon: -105.5, lat: 39.7 }],
          error: null,
        };
      }
      return { data: null, error: new Error('Unknown RPC') };
    }),
  })),
}));

// Mock environment variables
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
});

describe('GET /api/locations/:id', () => {
  describe('Parameter Validation', () => {
    it('should reject non-numeric ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/abc');
      const context = { params: Promise.resolve({ id: 'abc' }) };

      const response = await GET(request, context);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Invalid location ID');
    });

    it('should reject negative ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/-1');
      const context = { params: Promise.resolve({ id: '-1' }) };

      const response = await GET(request, context);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toHaveProperty('error');
    });

    it('should accept valid positive integer ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveProperty('location');
    });
  });

  describe('Response Structure', () => {
    it('should return all 14 core fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      // Core identification
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('description');

      // Geography
      expect(location).toHaveProperty('lat');
      expect(location).toHaveProperty('lon');

      // Legal
      expect(location).toHaveProperty('legal_tag');
      expect(location).toHaveProperty('legal_confidence');
      expect(location).toHaveProperty('primary_ruleset_id');

      // Provenance
      expect(location).toHaveProperty('source_tier');
      expect(location).toHaveProperty('verification_date');

      // Status
      expect(location).toHaveProperty('status');

      // Accessibility
      expect(location).toHaveProperty('access_model');
      expect(location).toHaveProperty('difficulty');
      expect(location).toHaveProperty('kid_friendly');
    });

    it('should return 3 related arrays', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      expect(location).toHaveProperty('materials');
      expect(Array.isArray(location.materials)).toBe(true);

      expect(location).toHaveProperty('rulesets');
      expect(Array.isArray(location.rulesets)).toBe(true);

      expect(location).toHaveProperty('sources');
      expect(Array.isArray(location.sources)).toBe(true);
    });

    it('should extract lat/lon from geography', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      expect(typeof location.lat).toBe('number');
      expect(typeof location.lon).toBe('number');
      expect(location.lat).toBeGreaterThan(-90);
      expect(location.lat).toBeLessThan(90);
      expect(location.lon).toBeGreaterThan(-180);
      expect(location.lon).toBeLessThan(180);
    });
  });

  describe('Field Types', () => {
    it('should return correct types for all fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      // Numbers
      expect(typeof location.id).toBe('number');
      expect(typeof location.lat).toBe('number');
      expect(typeof location.lon).toBe('number');
      expect(typeof location.legal_confidence).toBe('number');
      expect(typeof location.primary_ruleset_id).toBe('number');
      expect(typeof location.difficulty).toBe('number');

      // Strings
      expect(typeof location.name).toBe('string');
      expect(typeof location.access_model).toBe('string');

      // Enums
      expect(Object.values(LegalTag)).toContain(location.legal_tag);
      expect(Object.values(SourceTier)).toContain(location.source_tier);
      expect(Object.values(Status)).toContain(location.status);

      // Booleans
      expect(typeof location.kid_friendly).toBe('boolean');
    });

    it('should validate legal_confidence range', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      expect(location.legal_confidence).toBeGreaterThanOrEqual(0);
      expect(location.legal_confidence).toBeLessThanOrEqual(100);
    });

    it('should validate difficulty range', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      expect(location.difficulty).toBeGreaterThanOrEqual(1);
      expect(location.difficulty).toBeLessThanOrEqual(5);
    });
  });

  describe('Related Arrays Structure', () => {
    it('should return materials with correct fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      if (location.materials.length > 0) {
        const material = location.materials[0];
        expect(material).toHaveProperty('id');
        expect(material).toHaveProperty('name');
        expect(material).toHaveProperty('category');
        expect(['mineral', 'gemstone', 'rock', 'fossil', 'other']).toContain(
          material.category
        );
      }
    });

    it('should return rulesets with correct fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      if (location.rulesets.length > 0) {
        const ruleset = location.rulesets[0];
        expect(ruleset).toHaveProperty('id');
        expect(ruleset).toHaveProperty('name');
        expect(ruleset).toHaveProperty('authority');
        expect(ruleset).toHaveProperty('url');
        expect(ruleset).toHaveProperty('summary');
      }
    });

    it('should return sources with correct fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      if (location.sources.length > 0) {
        const source = location.sources[0];
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('citation');
        expect(source).toHaveProperty('url');
        expect(source).toHaveProperty('date_accessed');
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent location', async () => {
      // Mock Supabase to return null
      vi.mocked(vi.fn()).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { message: 'Not found' },
              })),
            })),
          })),
        })),
      });

      const request = new NextRequest('http://localhost:3000/api/locations/9999');
      const context = { params: Promise.resolve({ id: '9999' }) };

      const response = await GET(request, context);
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json).toHaveProperty('error');
      expect(json.error).toContain('Location not found');
    });
  });

  describe('Caching', () => {
    it('should include cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toContain('s-maxage=60');
    });
  });

  describe('Build Document Compliance', () => {
    it('should never return geom field (PostGIS internal)', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      expect(location).not.toHaveProperty('geom');
    });

    it('should include primary_ruleset_id for Why? link', async () => {
      const request = new NextRequest('http://localhost:3000/api/locations/1');
      const context = { params: Promise.resolve({ id: '1' }) };

      const response = await GET(request, context);
      const json = (await response.json()) as FullLocationDetailResponse;

      const { location } = json;

      expect(location.primary_ruleset_id).toBeDefined();
      expect(typeof location.primary_ruleset_id).toBe('number');
      expect(location.primary_ruleset_id).toBeGreaterThan(0);
    });
  });
});
