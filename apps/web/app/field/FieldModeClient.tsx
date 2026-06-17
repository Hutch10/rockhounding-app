'use client';

import type { LocationV1 } from '@rockhounding/shared';
import { LocationsListResponseSchema } from '@rockhounding/shared';
import { Compass, MapPin, Plus, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { QuickAddModal } from '@/components/Finds/QuickAddModal';
import { SyncIndicator } from '@/components/Sync/SyncIndicator';
import { TacticalCard } from '@/components/Tactical/TacticalCard';
import { TrustBadge, trustFromMetadata } from '@/components/Trust/TrustBadge';
import { findNearestSite, formatDistance, type NearestSiteResult } from '@/lib/gis/nearestSite';

type GpsState = 'idle' | 'acquiring' | 'ready' | 'denied';

/**
 * FE-010 — Full-screen Field Mode shell: GPS strip, nearest site, Quick Log FAB.
 */
export function FieldModeClient(): JSX.Element {
  const [online, setOnline] = useState(true);
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [nearest, setNearest] = useState<NearestSiteResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

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
      setGpsState('denied');
      setGeoError('GPS unavailable');
      return;
    }

    setGpsState('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLat(latitude);
        setLon(longitude);
        setAccuracyM(accuracy);
        setGpsState('ready');

        void (async () => {
          try {
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
      () => {
        setGpsState('denied');
        setGeoError('Enable location for field GPS');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, []);

  const gpsLabel =
    gpsState === 'ready' && lat != null && lon != null
      ? `${lat.toFixed(5)}, ${lon.toFixed(5)}${accuracyM != null ? ` ±${Math.round(accuracyM)}m` : ''}`
      : gpsState === 'acquiring'
        ? 'Acquiring GPS…'
        : 'GPS denied';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pb-28" data-testid="field-mode-shell">
      <SyncIndicator />

      <header className="px-4 pt-4 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tight">Field Mode</h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                Active session
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-bold text-white/50 uppercase tracking-wider hover:text-white"
          >
            Exit
          </Link>
        </div>
      </header>

      <div
        className={`mx-4 mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest border ${
          online
            ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-950/50 border-rose-500/30 text-rose-400'
        }`}
        data-testid="field-connectivity-pill"
      >
        {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {online ? 'Online' : 'Offline'}
      </div>

      <section
        className="mx-4 mt-3 p-3 rounded-xl bg-zinc-900/80 border border-white/10"
        data-testid="field-gps-strip"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
          <MapPin className="w-3 h-3 text-blue-400" />
          GPS
        </div>
        <p className="mt-1 text-sm font-mono text-white/90">{gpsLabel}</p>
      </section>

      <main className="flex-1 px-4 py-4 space-y-4">
        <TacticalCard title="Nearest Site" icon={MapPin}>
          {nearest != null ? (
            <div className="space-y-2">
              <p className="text-white font-semibold">{nearest.site.name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <TrustBadge trustCategory={trustFromMetadata(nearest.site.metadata)} size="sm" />
                <span className="text-xs text-white/50">{formatDistance(nearest.distanceM)}</span>
                {nearest.withinGeofence ? (
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">In range</span>
                ) : null}
              </div>
              <Link
                href={`/location/${nearest.site.id}`}
                className="inline-block min-h-[44px] leading-[44px] text-xs text-blue-400 font-bold uppercase tracking-wide hover:underline"
              >
                View site →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/50" data-testid="nearest-site-status">
              {geoError ?? 'Searching for nearby sites…'}
            </p>
          )}
        </TacticalCard>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/map"
            className="min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10"
          >
            Open Map
          </Link>
          <Link
            href="/offline"
            className="min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10"
          >
            Sync Queue
          </Link>
        </div>
      </main>

      <button
        type="button"
        onClick={() => setQuickLogOpen(true)}
        style={{ minHeight: 56, minWidth: 140 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
        data-testid="field-quick-log-fab"
        aria-label="Quick Log find"
      >
        <Plus className="w-5 h-5" />
        Quick Log
      </button>

      {quickLogOpen ? <QuickAddModal onClose={() => setQuickLogOpen(false)} /> : null}
    </div>
  );
}
