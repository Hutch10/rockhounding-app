import { NextRequest, NextResponse } from 'next/server';

import { LocationQuerySchema, LocationsResponse, ThinLocationPin } from './types';
import { ApiClientError, createApiClient } from '@/lib/api';

/**
 * GET /api/locations - Thin pins bbox endpoint
 *
 * Build Document Rules:
 * - NON-NEGOTIABLE RULE #2: Map browsing uses a THIN PINS endpoint with bbox queries
 * - NON-NEGOTIABLE RULE #3: Full location detail is fetched ONLY on pin click
 * - NEVER return full detail (no materials, rulesets, sources)
 * - Max 2000 results
 * - Uses GIST index on locations.geom for performance
 */

const MAX_RESULTS = 2000;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validationResult = LocationQuerySchema.safeParse(searchParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { bbox, legal_tag, access_model, material_id, difficulty_max, kid_friendly } =
      validationResult.data;

    const bboxString = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
    const api = createApiClient();
    const result = await api.listLocations({
      bbox: bboxString,
      legalTag: legal_tag,
      accessModel: access_model,
      materialId: material_id,
      difficultyMax: difficulty_max,
      kidFriendly: kid_friendly,
    });

    const thinPins: ThinLocationPin[] = result.items.map((loc) => ({
      id: loc.id,
      name: loc.name,
      lat: loc.latitude,
      lon: loc.longitude,
      legal_tag: loc.legalTag,
      access_model: loc.accessModel,
      difficulty: loc.difficulty ?? null,
      kid_friendly: loc.kidFriendly,
      status: loc.status,
    }));

    const response: LocationsResponse = {
      data: thinPins,
      count: result.count,
      max_results: result.maxResults ?? MAX_RESULTS,
    };

    // Return with short cache TTL for map browsing
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        {
          error: error.message,
          message: error.details instanceof Error ? error.details.message : undefined,
        },
        { status: error.status || 500 }
      );
    }
    console.error('Unexpected error in GET /api/locations:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
