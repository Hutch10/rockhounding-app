import { LocationV1Schema } from '@rockhounding/shared';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { mapDetailRow } from '../mappers';
import type { LocationBboxRow } from '../types';

import { createClient } from '@/lib/supabase/server';

interface LocationRecord {
  id: string;
  name: string;
  description: string | null;
  latitude: number | string;
  longitude: number | string;
  access_status: string;
  difficulty_rating: number | null;
  is_verified: boolean | null;
  trust_category: string | null;
  freshness_checked_at: string | null;
  freshness_status: string | null;
  metadata: Record<string, unknown> | null;
  source_tier: string | null;
}

const ParamsSchema = z.object({
  id: z.string().uuid('Location id must be a UUID'),
});

export const dynamic = 'force-dynamic';

/**
 * API-002: GET /api/v1/locations/:id — Tier-1 site detail
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const resolved = await context.params;
    const parsed = ParamsSchema.safeParse(resolved);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid location id', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { id } = parsed.data;
    const supabase = createClient();

    const { data: locationData, error: locError } = await supabase
      .from('locations')
      .select(
        'id, name, description, latitude, longitude, access_status, difficulty_rating, is_verified, trust_category, freshness_checked_at, freshness_status, metadata, source_tier, geom, fuzzy_geom'
      )
      .eq('id', id)
      .maybeSingle();

    const location = locationData as LocationRecord | null;

    if (locError != null) {
      console.error('[v1/locations/:id] query error:', locError);
      return NextResponse.json(
        { error: 'Failed to fetch location', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    if (location == null) {
      return NextResponse.json({ error: 'Location not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const lat = Number(location.latitude);
    const lon = Number(location.longitude);
    const pad = 0.02;

    const rpcResult = await supabase.rpc('locations_v1_in_bbox', {
      p_min_lon: lon - pad,
      p_min_lat: lat - pad,
      p_max_lon: lon + pad,
      p_max_lat: lat + pad,
      p_limit: 5,
    });
    const bboxRows = rpcResult.data as LocationBboxRow[] | null | undefined;
    const bboxMatch = bboxRows?.find((row) => row.id === id);

    const { data: materialRows } = await supabase
      .from('location_materials')
      .select('abundance, materials(id, name)')
      .eq('location_id', id)
      .limit(10);

    const materials =
      materialRows
        ?.map((row) => {
          const raw = row.materials as unknown;
          const mat = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null;
          return {
            id: mat?.id ?? '',
            name: mat?.name ?? 'Unknown',
            abundance: row.abundance as string | null,
          };
        })
        .filter((m) => m.id) ?? [];

    const { data: rulesetRows } = await supabase
      .from('location_rulesets')
      .select('is_primary, rulesets(summary, authority_url)')
      .eq('location_id', id)
      .eq('is_primary', true)
      .limit(1);

    const rulesetRaw = rulesetRows?.[0]?.rulesets as unknown;
    const primaryRuleset = (Array.isArray(rulesetRaw) ? rulesetRaw[0] : rulesetRaw) as {
      summary?: string | null;
      authority_url?: string | null;
    } | null;

    const meta = location.metadata ?? {};

    const row: LocationBboxRow & {
      permit_summary: string | null;
      collecting_summary: string | null;
      materials: { id: string; name: string; abundance: string | null }[];
    } = {
      id: location.id,
      name: location.name,
      description: location.description,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      fuzzy_lat: bboxMatch?.fuzzy_lat ?? null,
      fuzzy_lon: bboxMatch?.fuzzy_lon ?? null,
      access_status: location.access_status,
      difficulty_rating: location.difficulty_rating,
      is_verified: location.is_verified ?? false,
      trust_category: location.trust_category,
      freshness_checked_at: location.freshness_checked_at,
      freshness_status: location.freshness_status,
      metadata: meta,
      source_tier: location.source_tier,
      top_materials: materials.map((m) => m.name),
      permit_summary:
        (typeof meta.permit_summary === 'string' ? meta.permit_summary : null) ??
        primaryRuleset?.summary ??
        null,
      collecting_summary:
        typeof meta.collecting_summary === 'string'
          ? meta.collecting_summary
          : (location.description ?? null),
      materials,
    };

    const detail = mapDetailRow(row);

    // Tier-1 core validates against LocationV1; detail fields are additive
    LocationV1Schema.parse(detail);

    return NextResponse.json(
      { data: detail },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
      }
    );
  } catch (err) {
    console.error('[v1/locations/:id] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
