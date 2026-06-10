import { LocationV1Schema, type LocationV1 } from '@rockhounding/shared';

import type { LocationBboxRow, LocationDetailRow } from './types';

import { resolveTrustCategory } from '@/lib/trust/resolveTrustCategory';

export function mapRowToLocationV1(row: LocationBboxRow): LocationV1 {
  const trustCategory = resolveTrustCategory({
    trust_category: row.trust_category,
    is_verified: row.is_verified,
    source_tier: row.source_tier,
    metadata: row.metadata,
  });

  const fuzzyLat = row.fuzzy_lat ?? row.latitude;
  const fuzzyLon = row.fuzzy_lon ?? row.longitude;

  return LocationV1Schema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    latitude: fuzzyLat,
    longitude: fuzzyLon,
    fuzzy_location:
      row.fuzzy_lat != null && row.fuzzy_lon != null
        ? { lat: row.fuzzy_lat, lon: row.fuzzy_lon, precision: '~1km' }
        : null,
    access_status: row.access_status,
    difficulty_rating: row.difficulty_rating,
    is_verified: row.is_verified,
    metadata: {
      ...(row.metadata ?? {}),
      trust_category: trustCategory,
      freshness_status: row.freshness_status ?? 'unknown',
      freshness_checked_at: row.freshness_checked_at,
      top_materials: row.top_materials ?? [],
    },
  });
}

export function mapDetailRow(row: LocationDetailRow): LocationV1 & {
  permit_summary: string | null;
  collecting_summary: string | null;
  materials: { id: string; name: string; abundance: string | null }[];
} {
  const base = mapRowToLocationV1(row);
  return {
    ...base,
    permit_summary: row.permit_summary ?? null,
    collecting_summary: row.collecting_summary ?? null,
    materials: row.materials ?? [],
  };
}
