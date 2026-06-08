import { DUPLICATE_DETECTION } from './policy';
import type { DuplicateDetectionInput, DuplicateSiteSignal } from './types';

const EARTH_RADIUS_M = 6_371_000;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/** Normalized Levenshtein similarity (0–1). */
function nameSimilarity(a: string, b: string): number {
  const s1 = normalizeName(a);
  const s2 = normalizeName(b);
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = Array.from({ length: s1.length + 1 }, (_, i) =>
    Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }

  const distance = matrix[s1.length]![s2.length]!;
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

function geohashPrefix(geohash: string | undefined, length: number): string | undefined {
  if (geohash == null || geohash === '' || geohash.length < length) return undefined;
  return geohash.slice(0, length);
}

/**
 * Detect duplicate site candidates using geohash prefix + proximity + name similarity.
 * Aligns with existing DB geohash infrastructure (precision-7 intake check).
 */
export function detectDuplicateSite(input: DuplicateDetectionInput): DuplicateSiteSignal {
  const flags: string[] = [];
  const prefixLen = DUPLICATE_DETECTION.GEOHASH_PREFIX_LENGTH;
  const inputPrefix = geohashPrefix(input.geohash, prefixLen);

  let nearest_match_id: string | undefined;
  let nearest_distance_m: number | undefined;
  let geohash_prefix_match: string | undefined;
  let is_duplicate_candidate = false;
  let is_name_collision = false;

  for (const site of input.nearby_sites) {
    const distance = haversineM(input.latitude, input.longitude, site.latitude, site.longitude);
    const sitePrefix = geohashPrefix(site.geohash, prefixLen);
    const prefixMatch =
      inputPrefix !== undefined && sitePrefix !== undefined && inputPrefix === sitePrefix;
    const proximityMatch = distance <= DUPLICATE_DETECTION.PROXIMITY_THRESHOLD_M;
    const similarity = nameSimilarity(input.name, site.name);

    if (proximityMatch || prefixMatch) {
      if (nearest_distance_m === undefined || distance < nearest_distance_m) {
        nearest_distance_m = distance;
        nearest_match_id = site.id;
      }
      if (prefixMatch) {
        geohash_prefix_match = inputPrefix;
        flags.push('GEOHASH_PREFIX_MATCH');
      }
      if (proximityMatch) {
        flags.push('PROXIMITY_MATCH');
        is_duplicate_candidate = true;
      }
    }

    if (similarity >= DUPLICATE_DETECTION.NAME_SIMILARITY_THRESHOLD && proximityMatch) {
      is_name_collision = true;
      flags.push('NAME_COLLISION');
    }
  }

  let confidence_penalty = 0;
  if (is_duplicate_candidate) confidence_penalty += DUPLICATE_DETECTION.CONFIDENCE_PENALTY;
  if (is_name_collision) confidence_penalty += DUPLICATE_DETECTION.ESCALATE_PENALTY;

  return {
    is_duplicate_candidate,
    is_name_collision,
    nearest_match_id,
    nearest_distance_m,
    geohash_prefix_match,
    confidence_penalty,
    flags: [...new Set(flags)],
  };
}
