'use client';

import type { LocationV1 } from '@rockhounding/shared';
import { LocationsListResponseSchema } from '@rockhounding/shared';
import { Compass, MapPin, Plus, Wifi, WifiOff, Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { QuickAddModal } from '@/components/Finds/QuickAddModal';
import { TrustBadge, trustFromMetadata } from '@/components/Trust/TrustBadge';
import { findNearestSite, formatDistance, type NearestSiteResult } from '@/lib/gis/nearestSite';
import { MapClient } from '@/app/map/MapClient';
import { ZOOM_THRESHOLDS } from '@/app/map/types';

type GpsState = 'idle' | 'acquiring' | 'ready' | 'denied';

/**
 * FE-010 — Full-screen Field Mode shell: Map-first, Quick Log FAB, persistent field status.
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

  const mapConfig = {
    initialCenter:
      lon != null && lat != null
        ? ([lon, lat] as [number, number])
        : ([-122.4194, 37.7749] as [number, number]),
    initialZoom: 12,
    minZoom: ZOOM_THRESHOLDS.MIN_VISIBLE,
    maxZoom: 18,
  };

  return (
    <div
      className="relative w-screen h-[100dvh] bg-[var(--slate-900)] overflow-hidden"
      data-testid="field-mode-shell"
    >
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapClient config={mapConfig} />
      </div>

      {/* Top Status Strip Overlay (Persistent Field Status) */}
      <header className="absolute top-0 left-0 right-0 z-10 px-4 pt-safe-top pb-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pt-4 pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full pr-4 pl-1 py-1 border border-white/10 shadow-lg">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
            >
              {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white leading-tight">
                {online ? 'Online' : 'Offline'}
              </span>
              <span className="text-[9px] text-white/60 font-mono leading-tight">{gpsLabel}</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-transform"
            aria-label="More options"
          >
            <Menu className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Selected Site Bottom Sheet (Simplified for now) */}
      {nearest != null && (
        <div className="absolute bottom-28 left-4 right-4 z-10 pointer-events-auto">
          <div className="bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h3 className="text-white font-bold text-sm line-clamp-1">{nearest.site.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <TrustBadge trustCategory={trustFromMetadata(nearest.site.metadata)} size="sm" />
                <span className="text-[10px] text-white/50 uppercase tracking-widest">
                  {formatDistance(nearest.distanceM)}
                </span>
              </div>
            </div>
            <Link
              href={`/location/${nearest.site.id}`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
              style={{ minHeight: '48px', minWidth: '48px', display: 'flex', alignItems: 'center' }}
            >
              View
            </Link>
          </div>
        </div>
      )}

      {/* Quick Log FAB */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto pb-safe">
        <button
          type="button"
          onClick={() => setQuickLogOpen(true)}
          style={{ minHeight: '56px', minWidth: '160px' }}
          className="rounded-full bg-[#d97706] hover:bg-[#b45309] text-white shadow-[0_8px_30px_rgba(217,119,6,0.3)] border border-white/10 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest active:scale-95 transition-transform"
          data-testid="field-quick-log-fab"
          aria-label="Quick Log find"
        >
          <Plus className="w-6 h-6" />
          Quick Log
        </button>
      </div>

      {quickLogOpen ? <QuickAddModal onClose={() => setQuickLogOpen(false)} /> : null}
    </div>
  );
}
