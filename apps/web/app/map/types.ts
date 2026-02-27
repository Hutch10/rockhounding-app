import type { ThinLocationPin } from '../api/locations/types';

/**
 * Re-export ThinLocationPin from API types
 * Single source of truth for location data
 */
export type { ThinLocationPin };

/**
 * Map viewport bounds
 */
export interface MapBounds {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/**
 * Map configuration
 */
export interface MapConfig {
  initialCenter: [number, number]; // [lng, lat]
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * Pin visibility thresholds by zoom level
 * Build Document: Progressive disclosure
 */
export const ZOOM_THRESHOLDS = {
  MIN_VISIBLE: 6, // Below this, show nothing
  CLUSTER_MAX: 9, // Below this, show simplified clusters
  FULL_PINS: 10, // At or above, show full thin pins
} as const;

/**
 * Legal tag badge colors
 */
export const LEGAL_TAG_COLORS = {
  LEGAL_PUBLIC: 'bg-green-600',
  LEGAL_FEE_SITE: 'bg-blue-600',
  LEGAL_CLUB_SUPERVISED: 'bg-yellow-600',
  GRAY_AREA: 'bg-gray-600',
  RESEARCH_ONLY: 'bg-red-600',
} as const;

/**
 * Access model badge colors
 */
export const ACCESS_MODEL_COLORS = {
  PUBLIC_LAND: 'bg-green-500',
  FEE_SITE: 'bg-blue-500',
  CLUB_ONLY: 'bg-yellow-500',
  PERMISSION_REQUIRED: 'bg-orange-500',
  UNKNOWN: 'bg-gray-500',
} as const;

/**
 * Difficulty badge colors
 */
export const DIFFICULTY_COLORS = {
  1: 'bg-green-400',
  2: 'bg-lime-400',
  3: 'bg-yellow-400',
  4: 'bg-orange-400',
  5: 'bg-red-400',
} as const;
