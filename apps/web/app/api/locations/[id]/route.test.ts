/**
 * Tests for GET /api/locations/:id - Full Detail Endpoint
 * Build Document: Comprehensive validation of full detail contract
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';
import { LegalTag, SourceTier, Status } from '@rockhounding/shared';
import type { FullLocationDetailResponse } from './types';
import { ApiClientError } from '@/lib/api';

const mockLocationDetail = {
  id: '1',
  name: 'Crystal Peak',
  latitude: 39.7,
  longitude: -105.5,
  state: 'CO',
  notes: 'A productive quartz location',
  legal_tag: LegalTag.LEGAL_PUBLIC,
  legal_confidence: 95,
  primary_ruleset_id: 1,
  source_tier: SourceTier.FIELD_VERIFIED,
  verification_date: '2024-06-15T00:00:00Z',
  status: Status.ACTIVE,
  access_model: 'Walk-in',
  difficulty: 2,
  kid_friendly: true,
};

const mockGetLocation = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      getLocation: mockGetLocation,
    })),
  };
});

beforeEach(() => {
  mockGetLocation.mockReset();
  mockGetLocation.mockResolvedValue(mockLocationDetail);
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

      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('description');
      expect(location).toHaveProperty('lat');
      expect(location).toHaveProperty('lon');
      expect(location).toHaveProperty('legal_tag');
      expect(location).toHaveProperty('legal_confidence');
      expect(location).toHaveProperty('primary_ruleset_id');
      expect(location).toHaveProperty('source_tier');
      expect(location).toHaveProperty('verification_date');
      expect(location).toHaveProperty('status');
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

      expect(Array.isArray(location.materials)).toBe(true);
      expect(Array.isArray(location.rulesets)).toBe(true);
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

      expect(typeof location.id).toBe('number');
      expect(typeof location.lat).toBe('number');
      expect(typeof location.lon).toBe('number');
      expect(typeof location.legal_confidence).toBe('number');
      expect(typeof location.primary_ruleset_id).toBe('number');
      expect(typeof location.difficulty).toBe('number');
      expect(typeof location.name).toBe('string');
      expect(typeof location.access_model).toBe('string');
      expect(Object.values(LegalTag)).toContain(location.legal_tag);
      expect(Object.values(SourceTier)).toContain(location.source_tier);
      expect(Object.values(Status)).toContain(location.status);
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

  describe('Error Handling', () => {
    it('should return 404 for non-existent location', async () => {
      mockGetLocation.mockRejectedValueOnce(new ApiClientError('Location not found', 404));

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

      expect(json.location).not.toHaveProperty('geom');
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
