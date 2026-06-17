import { FindV1Schema, type FindV1 } from '@rockhounding/shared';
import Link from 'next/link';
import React from 'react';

import { createClient } from '@/lib/supabase/server';

/**
 * MY FINDS LIST PAGE
 *
 * Displays the user's field log ledger.
 */

async function getFinds(): Promise<FindV1[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return [];
  }

  const { data, error } = await supabase
    .from('finds')
    .select('*')
    .eq('user_id', user.id)
    .order('discovered_at', { ascending: false });

  if (error !== null || data === null) {
    return [];
  }
  return data.map((row) => FindV1Schema.parse(row));
}

export default async function FindsPage(): Promise<React.JSX.Element> {
  const finds = await getFinds();

  return (
    <div className="min-h-screen bg-black p-6 md:p-12">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Discovery Ledger</h1>
          <p className="text-sm text-white/50 uppercase tracking-[0.2em] mt-2 font-bold">
            Field Statistics • {finds.length} Logs
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {finds.length === 0 ? (
            <div className="col-span-full py-24 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-white/20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-white font-medium">No specimens logged yet.</p>
              <p className="text-white/40 text-sm mt-1">
                Start a field session or add a find from the map.
              </p>
            </div>
          ) : (
            finds.map((find) => (
              <Link
                key={find.id}
                href={`/finds/${find.id}`}
                className="group relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden transition-all hover:ring-2 hover:ring-blue-500/50 hover:bg-zinc-800/80"
              >
                <div className="aspect-[16/10] bg-zinc-950 flex items-center justify-center overflow-hidden">
                  <div className="text-white/5 font-black text-6xl uppercase transform -rotate-12 select-none">
                    {find.material_name}
                  </div>
                  {/* Image would go here once find_media is implemented */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {find.idempotency_key !== null && find.idempotency_key.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/30">
                        SYNCED
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                    {find.material_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-tight">
                      {new Date(find.discovered_at ?? 0).toLocaleDateString()}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-tight">
                      {find.fuzzy_location !== null
                        ? `${find.fuzzy_location.lat.toFixed(2)}, ${find.fuzzy_location.lon.toFixed(2)}`
                        : 'Location Private'}
                    </span>
                  </div>

                  {find.notes !== null && find.notes.length > 0 && (
                    <p className="text-sm text-white/60 mt-3 line-clamp-2 italic">"{find.notes}"</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-zinc-900 bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-emerald-400">
                          {Math.round((find.confidence_metrics.total ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
                      VIEW DETAILS →
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
