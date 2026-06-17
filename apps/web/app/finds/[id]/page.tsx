import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';

import { getFindById } from '@/app/actions/finds';
import { SyncIndicator } from '@/components/Sync/SyncIndicator';

/**
 * FIND DETAIL PAGE
 *
 * High-fidelity view of a single specimen log.
 */

interface FindPageProps {
  params: { id: string };
}

export default async function FindDetailPage({
  params,
}: FindPageProps): Promise<React.JSX.Element> {
  const find = await getFindById(params.id);

  if (find === null) {
    notFound();
  }

  const confidenceMetrics = find.confidence_metrics ?? { total: 0, breakdown: {} };

  return (
    <div className="min-h-screen bg-black text-white">
      <SyncIndicator />

      {/* Hero Header */}
      <div className="relative h-[40vh] bg-zinc-950 flex flex-col items-center justify-center border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
        <div className="text-[12rem] font-black text-white/[0.03] uppercase select-none transform -rotate-6">
          {find.material_name}
        </div>

        <div className="z-20 text-center px-6">
          <Link
            href="/finds"
            className="text-xs font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors mb-4 block"
          >
            ← Physical Ledger
          </Link>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-2">
            {find.material_name}
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              ID: {(find.id ?? params.id).slice(0, 8)}
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-500/30">
              In Situ Verification
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-12">
            <section>
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-4">
                Discovery Context
              </h2>
              <p className="text-xl text-white/90 leading-relaxed font-light italic">
                {find.notes !== null && find.notes.length > 0
                  ? find.notes
                  : 'No additional field observations recorded for this specimen.'}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-8 p-8 bg-zinc-900/50 border border-white/5 rounded-3xl">
              <div>
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                  Temporal Data
                </h3>
                <p className="text-lg font-medium">
                  {new Date(find.discovered_at ?? find.created_at ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                  Status
                </h3>
                <p className="text-lg font-medium text-emerald-400">Authenticated Persistence</p>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                  Coordinate Mode
                </h3>
                <p className="text-lg font-medium">
                  {find.is_fuzzy ? 'Masked (Privacy Mode)' : 'High Precision'}
                </p>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                  Taxonomy Path
                </h3>
                <p className="text-lg font-medium">Unknown Category</p>
              </div>
            </section>
          </div>

          {/* Sidebar Metrics */}
          <div className="space-y-8">
            <div className="p-6 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-6">
                Confidence Matrix
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-white/60">Total Intelligence</span>
                    <span className="text-xl font-bold text-blue-400">
                      {Math.round((confidenceMetrics.total ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(confidenceMetrics.total ?? 0) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/40 uppercase font-bold">Visual Profile</span>
                    <span className="text-white font-medium">
                      {Math.round((confidenceMetrics.breakdown?.visual ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/40 uppercase font-bold">Machine ID</span>
                    <span className="text-white font-medium">
                      {Math.round((confidenceMetrics.breakdown?.machine ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/40 uppercase font-bold">Expert Verification</span>
                    <span className="text-white font-medium">
                      {Math.round((confidenceMetrics.breakdown?.expert ?? 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
              <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">
                Sync Metadata
              </h2>
              <div className="text-[11px] text-blue-200/60 font-mono break-all font-light">
                KEY: {find.idempotency_key}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
