import { describe, expect, it } from 'vitest';

import { bboxFromMap, boundsToMapBounds, isValidBounds } from './bboxFromMap';

// Mock Mapbox LngLatBounds
class MockLngLatBounds {
  constructor(
    private sw: { lng: number; lat: number },
    private ne: { lng: number; lat: number }
  ) {}

  getSouthWest(): { lng: number; lat: number } {
    return this.sw;
  }

  getNorthEast(): { lng: number; lat: number } {
    return this.ne;
  }
}

describe('bboxFromMap', () => {
  it('should convert Mapbox bounds to API bbox string format', () => {
    const bounds = new MockLngLatBounds(
      { lng: -120.5, lat: 35.2 }, // SW
      { lng: -119.8, lat: 36.1 } // NE
    ) as any;

    const bbox = bboxFromMap(bounds);

    expect(bbox).toBe('-120.5,35.2,-119.8,36.1');
  });

  it('should handle negative coordinates', () => {
    const bounds = new MockLngLatBounds(
      { lng: -180, lat: -90 },
      { lng: -170, lat: -80 }
    ) as any;

    const bbox = bboxFromMap(bounds);

    expect(bbox).toBe('-180,-90,-170,-80');
  });

  it('should handle positive coordinates', () => {
    const bounds = new MockLngLatBounds({ lng: 10, lat: 20 }, { lng: 30, lat: 40 }) as any;

    const bbox = bboxFromMap(bounds);

    expect(bbox).toBe('10,20,30,40');
  });

  it('should handle crossing antimeridian', () => {
    const bounds = new MockLngLatBounds({ lng: 170, lat: -10 }, { lng: -170, lat: 10 }) as any;

    const bbox = bboxFromMap(bounds);

    expect(bbox).toBe('170,-10,-170,10');
  });
});

describe('boundsToMapBounds', () => {
  it('should convert Mapbox bounds to MapBounds object', () => {
    const bounds = new MockLngLatBounds(
      { lng: -120.5, lat: 35.2 },
      { lng: -119.8, lat: 36.1 }
    ) as any;

    const mapBounds = boundsToMapBounds(bounds);

    expect(mapBounds).toEqual({
      minLon: -120.5,
      minLat: 35.2,
      maxLon: -119.8,
      maxLat: 36.1,
    });
  });

  it('should preserve decimal precision', () => {
    const bounds = new MockLngLatBounds(
      { lng: -120.123456, lat: 35.789012 },
      { lng: -119.654321, lat: 36.210987 }
    ) as any;

    const mapBounds = boundsToMapBounds(bounds);

    expect(mapBounds.minLon).toBe(-120.123456);
    expect(mapBounds.minLat).toBe(35.789012);
    expect(mapBounds.maxLon).toBe(-119.654321);
    expect(mapBounds.maxLat).toBe(36.210987);
  });
});

describe('isValidBounds', () => {
  it('should accept valid bounds', () => {
    const bounds = {
      minLon: -120,
      minLat: 35,
      maxLon: -119,
      maxLat: 36,
    };

    expect(isValidBounds(bounds)).toBe(true);
  });

  it('should reject longitude out of range (< -180)', () => {
    const bounds = {
      minLon: -181,
      minLat: 35,
      maxLon: -119,
      maxLat: 36,
    };

    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should reject longitude out of range (> 180)', () => {
    const bounds = {
      minLon: -120,
      minLat: 35,
      maxLon: 181,
      maxLat: 36,
    };

    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should reject latitude out of range (< -90)', () => {
    const bounds = {
      minLon: -120,
      minLat: -91,
      maxLon: -119,
      maxLat: 36,
    };

    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should reject latitude out of range (> 90)', () => {
    const bounds = {
      minLon: -120,
      minLat: 35,
      maxLon: -119,
      maxLat: 91,
    };

    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should reject minLon >= maxLon', () => {
    const bounds = {
      minLon: -119,
      minLat: 35,
      maxLon: -120,
      maxLat: 36,
    };

    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should reject minLat >= maxLat', () => {
    const bounds = {
      minLon: -120,
      minLat: 36,
      maxLon: -119,
      maxLat: 35,
    };

    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should accept bounds at extreme valid values', () => {
    const bounds = {
      minLon: -180,
      minLat: -90,
      maxLon: 180,
      maxLat: 90,
    };

    expect(isValidBounds(bounds)).toBe(true);
  });
});
