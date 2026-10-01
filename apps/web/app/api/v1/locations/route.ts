import { LocationsListResponseSchema } from '@rockhounding/shared';
import {
  SiteType,
  isPubliclyDiscoverableAdmission,
  locationMatchesSiteTypeFilter,
  parseFeeSiteEnvelope,
} from '@rockhounding/shared/fee-site-support';
import { NextRequest, NextResponse } from 'next/server';

import { mapRowToLocationV1 } from './mappers';
import { BboxQuerySchema, type LocationBboxRow } from './types';

import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Fail-closed: TEST_ONLY / DISCOVERED / RESEARCHING / REJECTED fee envelopes
 * must not appear on the public map list. Rows without a fee envelope pass
 * (legacy public sites). Rows with an envelope require ADMITTED or PUBLISHED.
 */
export function isPubliclyListableLocationMetadata(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  const envelope = parseFeeSiteEnvelope(metadata);
  if (envelope == null) return true;
  return isPubliclyDiscoverableAdmission(envelope.admissionStatus);
}

/**
 * API-001: GET /api/v1/locations
 * PostGIS bbox query on fuzzy_geom via locations_v1_in_bbox RPC.
 * Optional site_type / fee_mine filters use metadata fee_site envelope (fail-closed).
 * Fee-site admission is filtered fail-closed (TEST_ONLY never listed).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = BboxQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      bbox,
      limit,
      access,
      trust,
      site_type: siteTypeFilter,
      fee_mine: feeMineOnly,
    } = parsed.data;
    const supabase = createClient();

    const rpcResult = await supabase.rpc('locations_v1_in_bbox', {
      p_min_lon: bbox.minLon,
      p_min_lat: bbox.minLat,
      p_max_lon: bbox.maxLon,
      p_max_lat: bbox.maxLat,
      p_limit: limit,
    });

    const error = rpcResult.error;
    const data = rpcResult.data as LocationBboxRow[] | null;

    if (error != null) {
      console.error('[v1/locations] RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch locations', code: 'DB_ERROR', details: error.message },
        { status: 500 }
      );
    }

    let rows: LocationBboxRow[] = data ?? [];

    // H2: exclude non-discoverable admission (TEST_ONLY never public).
    rows = rows.filter((r) =>
      isPubliclyListableLocationMetadata((r.metadata ?? {}) as Record<string, unknown>)
    );

    if (access != null && access.length > 0) {
      rows = rows.filter((r) => access.includes(r.access_status as (typeof access)[number]));
    }

    if (trust != null && trust.length > 0) {
      rows = rows.filter((r) => {
        const mapped = mapRowToLocationV1(r);
        const category = mapped.metadata?.trust_category as string;
        return trust.includes(category as (typeof trust)[number]);
      });
    }

    const effectiveSiteTypes =
      feeMineOnly === true
        ? [SiteType.FEE_MINE]
        : siteTypeFilter != null && siteTypeFilter.length > 0
          ? siteTypeFilter
          : undefined;

    if (effectiveSiteTypes != null) {
      rows = rows.filter((r) =>
        locationMatchesSiteTypeFilter(
          (r.metadata ?? {}) as Record<string, unknown>,
          effectiveSiteTypes
        )
      );
    }

    const locations = rows.map(mapRowToLocationV1);
    const body = LocationsListResponseSchema.parse({
      data: locations,
      count: locations.length,
    });

    return NextResponse.json(body, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (err) {
    console.error('[v1/locations] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
