'use client';

import type { LocationV1 } from '@rockhounding/shared';
import { LocationsListResponseSchema } from '@rockhounding/shared';
import { Map, Plus, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { TacticalCard } from '@/components/Tactical/TacticalCard';
import { TrustBadge, trustFromMetadata } from '@/components/Trust/TrustBadge';
import { findNearestSite, formatDistance, type NearestSiteResult } from '@/lib/gis/nearestSite';

/**
 * FE-003 + GIS-004: Home MVP with nearest site and offline pill.
 */
export function HomeClient(): JSX.Element {
  const [online, setOnline] = useState(true);
  const [nearest, setNearest] = useState<NearestSiteResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = (): void => setOnline(true);
    const onOffline = (): void => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Location unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          try {
            const { latitude, longitude } = pos.coords;
            const pad = 0.5;
            const bbox = `${longitude - pad},${latitude - pad},${longitude + pad},${latitude + pad}`;
            const res = await fetch(`/api/v1/locations?bbox=${bbox}&limit=50`);
            if (!res.ok) return;
            const json: unknown = await res.json();
            const data = LocationsListResponseSchema.parse(json);
            setNearest(findNearestSite(data.data as LocationV1[], latitude, longitude));
          } catch {
            setGeoError('Could not load nearby sites');
          }
        })();
      },
      () => setGeoError('Enable location to see nearest site'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 md:p-6 max-w-lg mx-auto space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Rockhound</h1>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
          Field Intelligence
        </p>
      </header>

      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
          online
            ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-950/50 border-rose-500/30 text-rose-400'
        }`}
        data-testid="offline-pill"
      >
        {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {online ? 'Online' : 'Offline'}
      </div>

      <TacticalCard title="Field Status" icon={Map}>
        <p className="text-sm text-white/70">No active field session.</p>
        <Link
          href="/field"
          className="mt-3 inline-block text-xs font-bold text-blue-400 uppercase tracking-wider hover:text-blue-300"
        >
          Enter Field Mode →
        </Link>
      </TacticalCard>

      <TacticalCard title="Nearest Site">
        {nearest != null ? (
          <div className="space-y-2">
            <p className="text-white font-semibold">{nearest.site.name}</p>
            <div className="flex items-center gap-2">
              <TrustBadge trustCategory={trustFromMetadata(nearest.site.metadata)} size="sm" />
              <span className="text-xs text-white/50">{formatDistance(nearest.distanceM)}</span>
              {nearest.withinGeofence ? (
                <span className="text-[10px] font-bold text-emerald-400 uppercase">In range</span>
              ) : null}
            </div>
            <Link
              href={`/location/${nearest.site.id}`}
              className="text-xs text-blue-400 font-bold uppercase tracking-wide hover:underline"
            >
              View site →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-white/50">{geoError ?? 'Searching for nearby sites…'}</p>
        )}
      </TacticalCard>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link
          href="/map"
          className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-500"
        >
          <Map className="w-4 h-4" />
          Open Map
        </Link>
        <Link
          href="/finds"
          className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10"
        >
          <Plus className="w-4 h-4" />
          Quick Log
        </Link>
      </div>
    </main>
  );
}
