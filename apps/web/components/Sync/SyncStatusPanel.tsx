'use client';

import {
  CloudIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { usePathname } from 'next/navigation';

import { useSyncState } from '@/hooks/useSyncState';

export const SyncStatusPanel: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const { pendingCount, failedCount, isSyncing, lastSyncAt, triggerSync } = useSyncState();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Prevent duplicate floating panel on login page
  if (isLoginPage && !inline) {
    return null;
  }

  const containerClasses = inline
    ? 'w-full'
    : 'fixed bottom-4 right-4 z-50 p-4 md:p-0 pointer-events-none';

  const cardClasses = inline
    ? 'bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-xl w-full'
    : 'bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl w-full max-w-xs pointer-events-auto ml-auto';

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 flex items-center justify-center p-2 rounded-lg ${isSyncing ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}
            >
              {isSyncing ? (
                <CloudArrowUpIcon className="h-6 w-6 md:h-5 md:w-5 flex-shrink-0 animate-pulse" />
              ) : (
                <CloudIcon className="h-6 w-6 md:h-5 md:w-5 flex-shrink-0" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">Sync Engine</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium truncate">
                {isLoginPage
                  ? isSyncing
                    ? 'Synchronizing'
                    : 'Waiting for sign-in'
                  : isSyncing
                    ? 'Synchronizing Operations'
                    : 'Ledger Standby'}
              </p>
            </div>
          </div>
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex-shrink-0 p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Trigger Sync"
          >
            <ArrowPathIcon
              className={`h-5 w-5 md:h-4 md:w-4 text-slate-300 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        <div className="space-y-3">
          {/* Pending Items */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-xs text-slate-400 truncate">
                {isLoginPage ? 'Items waiting to sync' : 'Pending Ledger'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-200">{pendingCount}</span>
          </div>

          {/* Failed Items */}
          {failedCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 md:h-3 md:w-3 text-rose-500 flex-shrink-0" />
                <span className="text-xs text-rose-400 font-medium truncate">
                  Terminal Failures
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-rose-500 bg-rose-500/10 px-1.5 rounded">
                {failedCount}
              </span>
            </div>
          )}

          {/* Sync Integrity */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 md:h-3 md:w-3 text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-slate-400 truncate">Last Integrity Check</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono flex-shrink-0 ml-2">
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleTimeString()
                : isLoginPage
                  ? 'Not checked yet'
                  : 'NEVER'}
            </span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isSyncing ? 'bg-indigo-500 w-1/2 animate-shimmer' : 'bg-emerald-500 w-full'
            }`}
            style={{
              backgroundImage: isSyncing
                ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
                : 'none',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};
