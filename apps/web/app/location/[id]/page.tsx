import { LocationV1Schema } from '@rockhounding/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';

import { GeologicalContextPending } from './GeologicalContextPanel';
import { LocationDetailClient, type LocationDetailV1 } from './LocationDetailClient';
import { SiteGeologicalContext } from './SiteGeologicalContext';

import { mapDetailRow } from '@/app/api/v1/locations/mappers';
import type { LocationBboxRow } from '@/app/api/v1/locations/types';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

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

/**
 * Load location detail in-process (no HTTP self-fetch).
 * Avoids Vercel Deployment Protection blocking SSR → /api on Preview.
 */
async function loadLocationDetail(id: string): Promise<LocationDetailV1 | null> {
  const supabase = createClient();

  const { data: locationData, error: locError } = await supabase
    .from('locations')
    .select(
      'id, name, description, latitude, longitude, access_status, difficulty_rating, is_verified, trust_category, freshness_checked_at, freshness_status, metadata, source_tier'
    )
    .eq('id', id)
    .maybeSingle();

  const location = locationData as LocationRecord | null;
  if (locError != null || location == null) {
    return null;
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
    latitude: lat,
    longitude: lon,
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
  LocationV1Schema.parse(detail);
  return detail as LocationDetailV1;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { title: 'Location Not Found' };
  }

  try {
    const location = await loadLocationDetail(parsed.data.id);
    if (location == null) {
      return { title: 'Location Not Found' };
    }
    return {
      title: `${location.name} - Rockhounding Location`,
      description: location.description ?? `Details for ${location.name}`,
    };
  } catch {
    return { title: 'Location Details' };
  }
}

export default async function LocationDetailPage(props: PageProps): Promise<JSX.Element> {
  const params = await props.params;
  const parsed = ParamsSchema.safeParse(params);

  if (!parsed.success) {
    notFound();
  }

  const location = await loadLocationDetail(parsed.data.id);
  if (location == null) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 max-w-lg mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
        {location.description != null && location.description !== '' ? (
          <p className="text-sm text-gray-600 mt-1">{location.description}</p>
        ) : null}
      </header>
      <LocationDetailClient
        location={location}
        geologySection={
          <Suspense fallback={<GeologicalContextPending />}>
            <SiteGeologicalContext location={location} />
          </Suspense>
        }
      />
    </main>
  );
}
