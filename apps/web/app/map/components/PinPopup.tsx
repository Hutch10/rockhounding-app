'use client';

import type { LocationV1 } from '@rockhounding/shared';
import Link from 'next/link';

import { AccessBanner, normalizeAccessStatus } from '@/components/Access/AccessBanner';
import { TrustBadge, trustFromMetadata } from '@/components/Trust/TrustBadge';
import { openExternalMaps } from '@/lib/gis/openExternalMaps';

interface PinPopupProps {
  pin: LocationV1;
  userLat?: number;
  userLon?: number;
}

function topMaterial(pin: LocationV1): string | null {
  const raw: unknown = pin.metadata.top_materials;
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const first: unknown = raw[0];
  return typeof first === 'string' ? first : null;
}

function distanceLabel(pin: LocationV1, userLat?: number, userLon?: number): string | null {
  if (userLat == null || userLon == null) {
    return null;
  }
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const lat = pin.latitude ?? 0;
  const lon = pin.longitude ?? 0;
  const dLat = toRad(lat - userLat);
  const dLon = toRad(lon - userLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  const m = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/**
 * FE-005: Tier-1 popup — name, access, trust, material, navigate, open site.
 */
export function PinPopup({ pin, userLat, userLon }: PinPopupProps): JSX.Element {
  const material = topMaterial(pin);
  const dist = distanceLabel(pin, userLat, userLon);
  const trust = trustFromMetadata(pin.metadata);
  const accessStatus = normalizeAccessStatus(pin.access_status);

  return (
    <div className="min-w-[260px] max-w-[320px] p-1" data-testid="pin-popup">
      <AccessBanner accessStatus={accessStatus} className="mb-2" />

      <h3 className="text-base font-bold text-gray-900 leading-tight">{pin.name}</h3>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <TrustBadge trustCategory={trust} size="sm" />
        {material != null && material !== '' && (
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {material}
          </span>
        )}
        {dist != null && dist !== '' ? (
          <span className="text-[10px] text-gray-500 font-medium">{dist} away</span>
        ) : null}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          data-testid="pin-navigate-external"
          onClick={() => {
            const fuzzy = pin.fuzzy_location;
            if (fuzzy?.lat != null && fuzzy.lon != null) {
              openExternalMaps({ lat: fuzzy.lat, lon: fuzzy.lon });
            }
          }}
          disabled={pin.fuzzy_location?.lat == null || pin.fuzzy_location.lon == null}
          className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-gray-700 disabled:opacity-40"
        >
          Navigate
        </button>
        <Link
          href={`/location/${pin.id}`}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-blue-500 text-center"
        >
          Open Site
        </Link>
      </div>
    </div>
  );
}
