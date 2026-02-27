import type { LngLatBounds } from 'mapbox-gl';

import type { MapBounds } from '../types';

/**
 * Convert Mapbox LngLatBounds to API bbox string format
 *
 * Mapbox LngLatBounds: [[west, south], [east, north]]
 * API format: "minLon,minLat,maxLon,maxLat"
 *
 * @param bounds - Mapbox LngLatBounds object
 * @returns Bbox string for API query parameter
 */
export function bboxFromMap(bounds: LngLatBounds): string {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const minLon = sw.lng;
  const minLat = sw.lat;
  const maxLon = ne.lng;
  const maxLat = ne.lat;

  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Convert Mapbox LngLatBounds to MapBounds object
 *
 * @param bounds - Mapbox LngLatBounds object
 * @returns MapBounds object with minLon, minLat, maxLon, maxLat
 */
export function boundsToMapBounds(bounds: LngLatBounds): MapBounds {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  return {
    minLon: sw.lng,
    minLat: sw.lat,
    maxLon: ne.lng,
    maxLat: ne.lat,
  };
}

/**
 * Validate bbox coordinates
 * Ensures longitude is within [-180, 180] and latitude within [-90, 90]
 *
 * @param bounds - MapBounds to validate
 * @returns true if valid, false otherwise
 */
export function isValidBounds(bounds: MapBounds): boolean {
  const { minLon, minLat, maxLon, maxLat } = bounds;

  // Longitude: -180 to 180
  if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) {
    return false;
  }

  // Latitude: -90 to 90
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
    return false;
  }

  // Min must be less than max
  if (minLon >= maxLon || minLat >= maxLat) {
    return false;
  }

  return true;
}
