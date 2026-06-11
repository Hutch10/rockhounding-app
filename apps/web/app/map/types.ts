import type { LocationV1 } from '@rockhounding/shared';

export type MapLocationPin = LocationV1;

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
 */
export const ZOOM_THRESHOLDS = {
  MIN_VISIBLE: 4,
  CLUSTER_MAX: 9,
  FULL_PINS: 10,
} as const;

/** Access fill colors for legend */
export const ACCESS_FILL_COLORS = {
  allowed: '#059669',
  caution: '#d97706',
  restricted: '#ea580c',
  prohibited: '#e11d48',
  unknown: '#475569',
} as const;
