import { describe, expect, it } from 'vitest';

import { LegalTag } from '@rockhounding/shared';

import { LocationQuerySchema, ThinLocationPin } from './types';

/**
 * Tests for GET /api/locations thin pins endpoint
 * Validates query parameter parsing and response shape
 */

describe('LocationQuerySchema', () => {
  describe('bbox parameter (REQUIRED)', () => {
    it('should parse valid bbox string', () => {
      const result = LocationQuerySchema.safeParse({
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
      }
    });

    it('should reject missing bbox', () => {
      const result = LocationQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid bbox format', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject bbox with wrong number of coordinates', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,36',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('legal_tag parameter (OPTIONAL)', () => {
    it('should accept valid legal_tag', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        legal_tag: LegalTag.LEGAL_PUBLIC,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.legal_tag).toBe(LegalTag.LEGAL_PUBLIC);
      }
    });

    it('should reject invalid legal_tag', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        legal_tag: 'INVALID_TAG',
      });

      expect(result.success).toBe(false);
    });

    it('should work without legal_tag', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.legal_tag).toBeUndefined();
      }
    });
  });

  describe('access_model parameter (OPTIONAL)', () => {
    it('should accept valid access_model', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        access_model: 'PUBLIC_LAND',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.access_model).toBe('PUBLIC_LAND');
      }
    });

    it('should reject invalid access_model', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        access_model: 'INVALID_MODEL',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('difficulty_max parameter (OPTIONAL)', () => {
    it('should accept valid difficulty (1-5)', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        difficulty_max: '3',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty_max).toBe(3);
      }
    });

    it('should coerce string to number', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        difficulty_max: '5',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.difficulty_max).toBe('number');
      }
    });

    it('should reject difficulty < 1', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        difficulty_max: '0',
      });

      expect(result.success).toBe(false);
    });

    it('should reject difficulty > 5', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        difficulty_max: '6',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('kid_friendly parameter (OPTIONAL)', () => {
    it('should parse "true" to boolean true', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        kid_friendly: 'true',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kid_friendly).toBe(true);
      }
    });

    it('should parse "false" to boolean false', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        kid_friendly: 'false',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kid_friendly).toBe(false);
      }
    });

    it('should reject non-boolean strings', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        kid_friendly: 'yes',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('material_id parameter (OPTIONAL)', () => {
    it('should accept valid UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        material_id: uuid,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.material_id).toBe(uuid);
      }
    });

    it('should reject invalid UUID', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120,35,-119,36',
        material_id: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('combined filters', () => {
    it('should accept all valid parameters together', () => {
      const result = LocationQuerySchema.safeParse({
        bbox: '-120.5,35.2,-119.8,36.1',
        legal_tag: LegalTag.LEGAL_PUBLIC,
        access_model: 'PUBLIC_LAND',
        difficulty_max: '3',
        kid_friendly: 'true',
        material_id: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bbox.minLon).toBe(-120.5);
        expect(result.data.legal_tag).toBe(LegalTag.LEGAL_PUBLIC);
        expect(result.data.access_model).toBe('PUBLIC_LAND');
        expect(result.data.difficulty_max).toBe(3);
        expect(result.data.kid_friendly).toBe(true);
        expect(result.data.material_id).toBeDefined();
      }
    });
  });
});

describe('ThinLocationPin response shape', () => {
  it('should contain only allowed fields', () => {
    const thinPin: ThinLocationPin = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Location',
      lat: 35.5,
      lon: -120.2,
      legal_tag: 'LEGAL_PUBLIC',
      access_model: 'PUBLIC_LAND',
      difficulty: 3,
      kid_friendly: true,
      status: 'OPEN',
    };

    // Verify all required fields are present
    expect(thinPin.id).toBeDefined();
    expect(thinPin.name).toBeDefined();
    expect(thinPin.lat).toBeDefined();
    expect(thinPin.lon).toBeDefined();
    expect(thinPin.legal_tag).toBeDefined();
    expect(thinPin.access_model).toBeDefined();
    expect(thinPin.difficulty).toBeDefined();
    expect(thinPin.kid_friendly).toBeDefined();
    expect(thinPin.status).toBeDefined();

    // Verify field count (9 fields only)
    expect(Object.keys(thinPin)).toHaveLength(9);
  });

  it('should allow null difficulty', () => {
    const thinPin: ThinLocationPin = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Location',
      lat: 35.5,
      lon: -120.2,
      legal_tag: 'RESEARCH_ONLY',
      access_model: 'UNKNOWN',
      difficulty: null,
      kid_friendly: false,
      status: 'RESEARCH_REQUIRED',
    };

    expect(thinPin.difficulty).toBeNull();
  });

  it('should NOT contain full-detail fields', () => {
    const thinPin: ThinLocationPin = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Location',
      lat: 35.5,
      lon: -120.2,
      legal_tag: 'LEGAL_PUBLIC',
      access_model: 'PUBLIC_LAND',
      difficulty: 2,
      kid_friendly: true,
      status: 'OPEN',
    };

    // Explicitly verify forbidden fields are NOT present
    expect('description' in thinPin).toBe(false);
    expect('directions' in thinPin).toBe(false);
    expect('materials' in thinPin).toBe(false);
    expect('rulesets' in thinPin).toBe(false);
    expect('sources' in thinPin).toBe(false);
    expect('geom' in thinPin).toBe(false);
    expect('primary_ruleset_id' in thinPin).toBe(false);
  });
});
