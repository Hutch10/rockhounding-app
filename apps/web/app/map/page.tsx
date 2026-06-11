import type { Metadata } from 'next';
import Link from 'next/link';

import { MapClient } from './MapClient';
import { QuickAddButton } from './QuickAddButton';
import type { MapConfig } from './types';

import { SyncIndicator } from '@/components/Sync/SyncIndicator';

export const metadata: Metadata = {
  title: 'Field Map - Rockhounding Intelligence',
  description: 'Tactical exploration and specimen logging interface',
};

const MAP_CONFIG: MapConfig = {
  initialCenter: [-98.5795, 39.8283],
  initialZoom: 4,
  minZoom: 3,
  maxZoom: 18,
};

export default function MapPage(): JSX.Element {
  return (
    <main className="h-screen w-screen flex flex-col bg-black overflow-hidden">
      <SyncIndicator />

      {/* Tactical HUD Header */}
      <header className="z-10 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight uppercase leading-none">
              Field Intelligence
            </h1>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
              Operational Area: CONUS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/offline" className="p-2 text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <QuickAddButton />
        </div>
      </header>

      {/* Map Interface */}
      <div className="flex-1 relative">
        <MapClient config={MAP_CONFIG} />

        {/* Map Overlays */}
        <div className="absolute top-6 left-6 z-20 w-72 space-y-4">
          <div className="p-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">
              Land Access Engine
            </p>
            <div className="space-y-2 text-xs text-white/80">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                Fill = Access
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Allowed
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Caution
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Restricted
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Prohibited
              </div>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest pt-1">
                Ring = Trust
              </p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-blue-600 bg-transparent" />{' '}
                Official
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-emerald-600 bg-transparent" />{' '}
                Verified
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-amber-600 bg-transparent" />{' '}
                Community
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-slate-500 bg-transparent" />{' '}
                Unverified
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
