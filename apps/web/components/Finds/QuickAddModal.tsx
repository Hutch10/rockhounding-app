/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-misused-promises, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unnecessary-condition */
'use client';

import React, { useEffect, useState } from 'react';

import { getStorageManager } from '@/lib/storage/manager';
import { createClient } from '@/lib/supabase/client';
import { syncManager } from '@/lib/sync/orchestrator';
import { enqueueFindCreate } from '@/lib/sync/queue';
import { canSubmitQuickLog } from '@/lib/sync/quick-log-gating';

/**
 * QUICK ADD FIND MODAL (FE-008)
 *
 * Field-optimized logging: GPS auto-fill, access gating, offline queue.
 */

interface QuickAddModalProps {
  onClose: () => void;
}

type AccessState = 'unknown' | 'allowed' | 'caution' | 'restricted' | 'prohibited' | 'checking';

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [lat, setLat] = useState<string>('');
  const [lon, setLon] = useState<string>('');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'acquiring' | 'ready' | 'denied'>('idle');
  const [accessState, setAccessState] = useState<AccessState>('unknown');

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const canSubmit = canSubmitQuickLog(accessState, isOffline);
  const isProhibited = accessState === 'prohibited' && !isOffline;

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    setGpsStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setGpsStatus('ready');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) return;
    if (isOffline) {
      setAccessState('unknown');
      return;
    }

    let cancelled = false;
    setAccessState('checking');

    fetch('/api/v1/access/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: latNum, lon: lonNum }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.legalState) return;
        setAccessState(data.legalState as AccessState);
      })
      .catch(() => {
        if (!cancelled) setAccessState('unknown');
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, isOffline]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const latNum = parseFloat(formData.get('lat') as string);
    const lonNum = parseFloat(formData.get('lon') as string);

    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setError('Valid GPS coordinates are required.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      material_name: String(formData.get('material_name')),
      notes: (formData.get('notes') as string) || null,
      discovered_at: new Date().toISOString(),
      location: { lat: latNum, lon: lonNum },
    };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Sign in required to log finds.');
        setIsSubmitting(false);
        return;
      }

      const storage = getStorageManager();
      storage.setUserId(user.id);

      await enqueueFindCreate(storage, {
        userId: user.id,
        payload,
      });

      setQueued(true);

      if (navigator.onLine) {
        void syncManager.flush();
      }

      setTimeout(() => onClose(), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to queue operation');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Log Field Find</h2>
            <p className="text-xs text-white/50 uppercase tracking-widest mt-1">
              {isOffline ? 'Offline — queued locally' : 'Tactical Entry Mode'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {queued && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm">
              Queued for sync{isOffline ? ' — will upload when back online' : ''}.
            </div>
          )}

          {isProhibited && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-sm">
              Collection is prohibited at this location. Quick Log is disabled.
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 ml-1">
              Material
            </label>
            <input
              name="material_name"
              required
              disabled={isProhibited}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              placeholder="e.g., Smoky Quartz, Geode"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 ml-1">
                Latitude
                {gpsStatus === 'acquiring' && <span className="ml-2 text-amber-400">GPS…</span>}
                {gpsStatus === 'ready' && <span className="ml-2 text-emerald-400">GPS</span>}
              </label>
              <input
                name="lat"
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                disabled={isProhibited}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder="0.0000"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 ml-1">
                Longitude
              </label>
              <input
                name="lon"
                type="number"
                step="any"
                required
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                disabled={isProhibited}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder="0.0000"
              />
            </div>
          </div>

          {accessState !== 'unknown' && accessState !== 'checking' && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Access: <span className="text-white/70">{accessState}</span>
            </p>
          )}

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 ml-1">
              Observations (optional)
            </label>
            <textarea
              name="notes"
              rows={2}
              disabled={isProhibited}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              placeholder="Quality, host rock, conditions…"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !canSubmit || queued}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isProhibited ? (
              'Logging Disabled'
            ) : (
              <>Queue Field Log</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
