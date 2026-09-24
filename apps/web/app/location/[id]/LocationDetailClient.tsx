'use client';

import type { LocationV1 } from '@rockhounding/shared';
import Link from 'next/link';

import {
  AccessBanner,
  isCollectingDisabled,
  normalizeAccessStatus,
} from '@/components/Access/AccessBanner';
import { TrustBadge, trustFromMetadata } from '@/components/Trust/TrustBadge';
import { openExternalMaps } from '@/lib/gis/openExternalMaps';

export type LocationDetailV1 = LocationV1 & {
  permit_summary?: string | null;
  collecting_summary?: string | null;
  materials?: { id: string; name: string; abundance: string | null }[];
};

export type GeologicalContextView = {
  state:
    | 'SUCCESS'
    | 'PROVIDER_UNAVAILABLE'
    | 'NO_SGMC_POLYGON_RETURNED'
    | 'OUTSIDE_PROVIDER_COVERAGE'
    | 'PARTIAL_UNSAFE'
    | 'DISCLOSURE_WITHHELD'
    | 'BOUNDS_REJECTED';
  units: Array<{ unitName: string; lithology: string; ageMin: string; ageMax: string }>;
  attribution: { source: string; product: string; doi: string } | null;
  compilationYear: 2017 | null;
  retrievedAt: string | null;
};

interface LocationDetailClientProps {
  location: LocationDetailV1;
  geology?: GeologicalContextView | null;
}

/**
 * FE-006: Site detail Tier-1 — access banner, trust badge, materials, action row.
 */
function geologyMessage(state: GeologicalContextView['state']): string {
  switch (state) {
    case 'SUCCESS':
      return 'USGS geological source for this site.';
    case 'NO_SGMC_POLYGON_RETURNED':
      return 'No SGMC map unit was returned for this location.';
    case 'OUTSIDE_PROVIDER_COVERAGE':
      return 'SGMC geological context is not available for this region.';
    case 'PARTIAL_UNSAFE':
      return 'SGMC returned an incomplete page. Geological context is not shown as complete.';
    case 'DISCLOSURE_WITHHELD':
      return 'Map geometry is withheld.';
    default:
      return 'Geological context temporarily unavailable.';
  }
}

export function LocationDetailClient({
  location,
  geology = null,
}: LocationDetailClientProps): JSX.Element {
  const trust = trustFromMetadata(location.metadata);
  const accessStatus = normalizeAccessStatus(location.access_status);
  const collectingDisabled = isCollectingDisabled(accessStatus);
  const materials = location.materials ?? [];

  return (
    <div className="space-y-4" data-testid="site-detail">
      <AccessBanner accessStatus={accessStatus} />

      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustCategory={trust} />
        {location.difficulty_rating != null && (
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            Difficulty {location.difficulty_rating}/5
          </span>
        )}
      </div>

      {location.collecting_summary != null && location.collecting_summary !== '' ? (
        <p className="text-sm text-gray-700">{location.collecting_summary}</p>
      ) : null}

      {materials.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
            Materials
          </h2>
          <div className="flex flex-wrap gap-2">
            {materials.map((m) => (
              <span
                key={m.id}
                className="text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full"
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {geology != null ? (
        <section
          aria-label="Geological context"
          className="rounded-xl border border-stone-300 bg-stone-50 p-3"
        >
          <h2 className="text-sm font-bold text-stone-900">Geological context</h2>
          <p className="mt-1 text-sm text-stone-800">{geologyMessage(geology.state)}</p>
          <p className="mt-1 text-xs text-stone-700">
            This is map context only. It does not say whether collecting, access, or travel is
            allowed. It is not stored for offline use.
          </p>
          {geology.state === 'SUCCESS'
            ? geology.units.map((unit) => (
                <p key={`${unit.unitName}-${unit.ageMin}`} className="mt-2 text-sm text-stone-900">
                  {unit.unitName}. {unit.lithology}. Geologic age {unit.ageMin} to {unit.ageMax}.
                </p>
              ))
            : null}
          {geology.attribution != null ? (
            <p className="mt-2 text-xs text-stone-700">
              Source: {geology.attribution.source}, {geology.attribution.product}, DOI{' '}
              {geology.attribution.doi}. Rockhounding is not a USGS product.
              {geology.compilationYear != null
                ? ` Source compilation: ${geology.compilationYear}.`
                : ''}
              {geology.retrievedAt != null ? ` Retrieved: ${geology.retrievedAt}.` : ''}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            const fuzzy = location.fuzzy_location;
            if (fuzzy?.lat != null && fuzzy.lon != null) {
              openExternalMaps({ lat: fuzzy.lat, lon: fuzzy.lon });
            }
          }}
          disabled={location.fuzzy_location?.lat == null || location.fuzzy_location.lon == null}
          className="flex-1 min-h-[44px] px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-40"
        >
          Navigate
        </button>
        <button
          type="button"
          disabled={collectingDisabled}
          title={collectingDisabled ? 'Collecting disabled for this access status' : undefined}
          data-testid="quick-log-button"
          className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Quick Log
        </button>
      </div>

      {collectingDisabled && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          Quick Log is disabled — this site has {accessStatus} access status.
        </p>
      )}

      <Link href="/map" className="inline-block text-sm text-blue-600 hover:underline">
        ← Back to Map
      </Link>
    </div>
  );
}
