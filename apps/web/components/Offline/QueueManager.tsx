/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
'use client';

import React, { useEffect, useState } from 'react';

import { useSyncState } from '@/hooks/useSyncState';
import { getStorageManager } from '@/lib/storage/manager';
import { toQueuedFindView, type QueuedFindOperation } from '@/lib/sync/queue';

/**
 * OFFLINE QUEUE MANAGER
 *
 * Visibility into the StorageManager operations ledger.
 */

export const QueueManager: React.FC = () => {
  const { pendingCount, triggerSync } = useSyncState();
  const [operations, setOperations] = useState<QueuedFindOperation[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const storage = getStorageManager();
        const ops = await storage.getAllOperations();
        const finds = ops
          .map((op) => toQueuedFindView(op))
          .filter((op): op is NonNullable<typeof op> => op !== null)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOperations(finds);
      } catch {
        setOperations([]);
      }
    };

    load();
    const onChange = () => load();
    window.addEventListener('sync-queue-changed', onChange);
    const interval = setInterval(load, 2000);
    return () => {
      window.removeEventListener('sync-queue-changed', onChange);
      clearInterval(interval);
    };
  }, []);

  const statusLabel = (status: string) => {
    if (status === 'DONE') return 'applied';
    if (status === 'PENDING' || status === 'RETRY_SCHEDULED') return 'pending';
    if (status === 'IN_FLIGHT') return 'accepted';
    if (status === 'FAILED_TERMINAL') return 'failed';
    return status.toLowerCase();
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          Field Sync Ledger
        </h3>
        <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-full font-bold">
          {pendingCount} Pending
        </span>
      </div>

      <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
        {operations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-white/30 italic">No local operations recorded.</p>
          </div>
        ) : (
          operations.map((op) => {
            const label = statusLabel(op.queue_status);
            return (
              <div
                key={op.client_operation_id}
                className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    Log Find: {op.payload.material_name}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase font-bold tracking-tight">
                    create • {new Date(op.created_at).toLocaleTimeString()}
                  </div>
                  {op.last_error_message && (
                    <div className="text-[10px] text-red-400 mt-1 font-mono max-w-[200px] truncate">
                      Error: {op.last_error_message}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                      label === 'applied'
                        ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                        : label === 'failed'
                          ? 'border-red-500/30 text-red-500 bg-red-500/10'
                          : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                    }`}
                  >
                    {label}
                  </span>
                  {(label === 'pending' || label === 'failed') && (
                    <button
                      onClick={() => triggerSync()}
                      className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all text-[10px] uppercase font-bold"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
