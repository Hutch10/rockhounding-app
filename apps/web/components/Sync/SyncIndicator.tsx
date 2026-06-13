'use client';

import React from 'react';

import { useSyncState } from '@/hooks/useSyncState';

/**
 * TACTICAL SYNC INDICATOR
 *
 * Network + pending queue status from the unified StorageManager ledger.
 */

export const SyncIndicator: React.FC = () => {
  const { isOnline, pendingCount, isSyncing } = useSyncState();

  const networkLabel = !isOnline
    ? 'Offline / Standalone'
    : isSyncing
      ? 'Syncing Field Logs'
      : 'Tactical Link Active';

  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg transition-all hover:bg-black/60 z-50">
      <div className="relative flex h-3 w-3">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? 'bg-emerald-400' : 'bg-red-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-3 w-3 ${
            isOnline ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase leading-none">
          Network
        </span>
        <span className="text-sm font-medium text-white leading-tight">{networkLabel}</span>
      </div>

      {pendingCount > 0 && <div className="h-8 w-px bg-white/10 mx-1" />}

      {pendingCount > 0 && (
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest text-amber-400/80 uppercase leading-none">
            Queued
          </span>
          <span className="text-sm font-medium text-white leading-tight">
            {pendingCount} Operations
          </span>
        </div>
      )}
    </div>
  );
};
