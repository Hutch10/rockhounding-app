import { ProfileV1Schema, type ProfileV1 } from '@rockhounding/shared';
import React from 'react';

import { SyncIndicator } from '@/components/Sync/SyncIndicator';
import { createClient } from '@/lib/supabase/server';

/**
 * PROFILE / IDENTITY PAGE
 *
 * Shows user standing, reputation, and tactical field stats.
 */

async function getProfile(): Promise<ProfileV1 | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    return null;
  }

  const profileResult = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (profileResult.error !== null || profileResult.data === null) {
    return null;
  }
  return ProfileV1Schema.parse(profileResult.data as unknown);
}

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const profile = await getProfile();

  if (profile === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Unidentified Unit</h1>
          <p className="text-white/40 mb-6">Please authenticate to establish field credentials.</p>
          <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <SyncIndicator />

      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 p-1">
              <div className="w-full h-full rounded-[20px] bg-zinc-900 flex items-center justify-center text-3xl font-black">
                {profile.username !== null && profile.username.length > 0
                  ? profile.username.slice(0, 1).toUpperCase()
                  : 'R'}
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">
                {profile.display_name !== null && profile.display_name.length > 0
                  ? profile.display_name
                  : profile.username}
              </h1>
              <p className="text-sm text-white/50 uppercase tracking-[0.2em] mt-1 font-bold">
                Authenticated Field Agent • v1.0
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="px-6 py-3 bg-zinc-900 border border-white/10 rounded-2xl text-center">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                Reputation
              </div>
              <div className="text-2xl font-black text-blue-400">{profile.reputation_score}</div>
            </div>
            <div className="px-6 py-3 bg-zinc-900 border border-white/10 rounded-2xl text-center">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                Trust Level
              </div>
              <div className="text-2xl font-black text-emerald-400">L{profile.trust_level}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="p-8 bg-zinc-900/50 border border-white/5 rounded-3xl space-y-6">
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
              Credentials & Security
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">System Role</span>
                <span className="font-bold text-blue-400">
                  {profile.is_admin ? 'ADMINISTRATOR' : 'FIELD AGENT'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">ID Verification</span>
                <span className="font-bold text-emerald-500">SECURE</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Registered At</span>
                <span className="font-bold">
                  {new Date(profile.created_at ?? 0).toLocaleDateString()}
                </span>
              </div>
            </div>
          </section>

          <section className="p-8 bg-zinc-900/50 border border-white/5 rounded-3xl space-y-6">
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
              Field Deployment Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="text-[10px] font-bold text-white/30 uppercase mb-1">
                  Total Finds
                </div>
                <div className="text-2xl font-black">--</div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="text-[10px] font-bold text-white/30 uppercase mb-1">
                  Active Trips
                </div>
                <div className="text-2xl font-black">--</div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="text-[10px] font-bold text-white/30 uppercase mb-1">
                  Regions Explored
                </div>
                <div className="text-2xl font-black">--</div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="text-[10px] font-bold text-white/30 uppercase mb-1">
                  Taxon Depth
                </div>
                <div className="text-2xl font-black">--</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
