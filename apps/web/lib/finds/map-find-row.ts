import { FindV1Schema, type FindV1 } from '@rockhounding/shared';

/**
 * PostgREST returns PostGIS geography as EWKB/hex strings and DB defaults for
 * confidence_metrics do not match FindV1Schema. Strict parse of select('*')
 * throws in the server component and surfaces as a Next.js digest error on
 * /collection → /finds after a successful sync.
 */

function toIsoDateTime(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return new Date(0).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeConfidenceMetrics(value: unknown): {
  total: number;
  metrics: Record<string, number>;
  breakdown?: {
    visual?: number;
    expert?: number;
    machine?: number;
    consensus?: number;
  };
  source?: string;
} {
  const raw = asRecord(value);
  const totalRaw = raw.total;
  const total =
    typeof totalRaw === 'number' && Number.isFinite(totalRaw)
      ? Math.min(1, Math.max(0, totalRaw))
      : 0;

  const metricsRaw = asRecord(raw.metrics);
  const metrics: Record<string, number> = {};
  for (const [key, metricValue] of Object.entries(metricsRaw)) {
    if (typeof metricValue === 'number' && Number.isFinite(metricValue)) {
      metrics[key] = metricValue;
    }
  }

  const breakdownRaw = asRecord(raw.breakdown);
  const breakdown = {
    visual:
      typeof breakdownRaw.visual === 'number'
        ? breakdownRaw.visual
        : typeof breakdownRaw.visusal === 'number'
          ? breakdownRaw.visusal
          : undefined,
    expert: typeof breakdownRaw.expert === 'number' ? breakdownRaw.expert : undefined,
    machine: typeof breakdownRaw.machine === 'number' ? breakdownRaw.machine : undefined,
    consensus: typeof breakdownRaw.consensus === 'number' ? breakdownRaw.consensus : undefined,
  };

  const hasBreakdown = Object.values(breakdown).some((entry) => entry !== undefined);

  return {
    total,
    metrics,
    ...(hasBreakdown ? { breakdown } : {}),
    ...(typeof raw.source === 'string' ? { source: raw.source } : {}),
  };
}

function isLatLonObject(value: unknown): value is { lat: number; lon: number } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.lat === 'number' && typeof record.lon === 'number';
}

/**
 * Maps a raw `finds` table row into FindV1 without throwing.
 * Geography WKB/hex strings are treated as private (null fuzzy / omitted exact).
 */
export function mapFindRowToV1(row: unknown): FindV1 | null {
  if (typeof row !== 'object' || row === null) {
    return null;
  }

  const source = row as Record<string, unknown>;
  const exact = isLatLonObject(source.exact_location) ? source.exact_location : undefined;
  const fuzzy = isLatLonObject(source.fuzzy_location)
    ? {
        lat: source.fuzzy_location.lat,
        lon: source.fuzzy_location.lon,
        precision: '~1km' as const,
      }
    : null;

  const candidate = {
    id: source.id,
    user_id: source.user_id,
    trip_id: source.trip_id ?? null,
    material_name: source.material_name,
    material_taxonomy_id: source.material_taxonomy_id ?? null,
    ...(exact !== undefined ? { exact_location: exact } : {}),
    fuzzy_location: fuzzy,
    is_fuzzy: typeof source.is_fuzzy === 'boolean' ? source.is_fuzzy : true,
    confidence_metrics: normalizeConfidenceMetrics(source.confidence_metrics),
    notes: typeof source.notes === 'string' ? source.notes : null,
    discovered_at: toIsoDateTime(source.discovered_at),
    created_at: toIsoDateTime(source.created_at),
    idempotency_key: typeof source.idempotency_key === 'string' ? source.idempotency_key : null,
  };

  const parsed = FindV1Schema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function mapFindRowsToV1(rows: unknown[]): FindV1[] {
  const mapped: FindV1[] = [];
  for (const row of rows) {
    const find = mapFindRowToV1(row);
    if (find !== null) {
      mapped.push(find);
    }
  }
  return mapped;
}
