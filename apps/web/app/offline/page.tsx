import React from 'react';

import { QueueManager } from '@/components/Offline/QueueManager';
import { SyncIndicator } from '@/components/Sync/SyncIndicator';

/**
 * OFFLINE MANAGEMENT PAGE
 *
 * The field base for data synchronization.
 */

export default function OfflinePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <SyncIndicator />

      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight">Field Synchronization</h1>
          <p className="text-sm text-white/50 uppercase tracking-[0.2em] mt-2 font-bold">
            Offline Resilience • Sprint 4
          </p>
        </header>

        <section>
          <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-4">
            Active Queue
          </h2>
          <QueueManager />
        </section>

        <section className="mt-8 p-6 bg-amber-600/10 border border-amber-500/20 rounded-2xl">
          <h2 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">
            Tactical Warning
          </h2>
          <p className="text-[11px] text-amber-200/60 leading-relaxed">
            Offline changes are held in the local StorageManager ledger. Do not clear browser cache
            while operations are pending.
          </p>
        </section>
      </div>
    </div>
  );
}
