'use client';

import type { LocationV1 } from '@rockhounding/shared';
import type { ReactNode } from 'react';
import Link from 'next/link';

import {
  AccessBanner,
  isCollectingDisabled,
  normalizeAccessStatus,
} from '@/components/Access/AccessBanner';
import { FieldPermissionSummary } from '@/components/Access/FieldPermissionSummary';
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
  geologySection?: ReactNode;
}

/**
 * FE-006: Site detail Tier-1 — access banner, trust badge, materials, action row.
 */
export function LocationDetailClient({
  location,
  geologySection = null,
}: LocationDetailClientProps): JSX.Element {
  const trust = trustFromMetadata(location.metadata);
  const accessStatus = normalizeAccessStatus(location.access_status);
  const collectingDisabled = isCollectingDisabled(accessStatus);
  const materials = location.materials ?? [];

  return (
    <div className="space-y-4" data-testid="site-detail">
      <AccessBanner accessStatus={accessStatus} />
      <FieldPermissionSummary recordedAccessStatus={accessStatus} />

      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustCategory={trust} />
        {location.difficulty_rating != null && (
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            Difficulty {location.difficulty_rating}/5
          </span>
        )}
      </div>

      {location.collecting_summary != null && location.collecting_summary !== '' ? (
        <p className="text-sm text-gray-700">
          Recorded collecting note: {location.collecting_summary}. This note is not collecting
          permission.
        </p>
      ) : null}

      <p className="text-sm text-gray-700">
        {location.permit_summary != null && location.permit_summary !== ''
          ? `Recorded permit note: ${location.permit_summary}. A permit note is not current entry authorization.`
          : 'No permit note is on this record. That absence is not a decision that a permit is unnecessary.'}
      </p>

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

      {geologySection}

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
          className="flex-1 min-h-12 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-40"
        >
          Navigate
        </button>
        <button
          type="button"
          disabled={collectingDisabled}
          title={
            collectingDisabled
              ? 'Quick Log save is held for this recorded access status. The hold is not a collecting verdict.'
              : 'Quick Log records a candidate observation. It does not authorize collecting.'
          }
          data-testid="quick-log-button"
          className="flex-1 min-h-12 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Quick Log
        </button>
      </div>

      {collectingDisabled && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          Quick Log save is held while the recorded access status is {accessStatus}. That status
          does not decide collecting, and unknown is not treated as allowed.
        </p>
      )}

      <Link href="/map" className="inline-block text-sm text-blue-600 hover:underline">
        ← Back to Map
      </Link>
    </div>
  );
}
