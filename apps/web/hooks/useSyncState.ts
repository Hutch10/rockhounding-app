/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/explicit-function-return-type */
/**
 * useSyncState Hook
 *
 * Truthful sync status from the StorageManager operations ledger.
 */

import { useState, useEffect, useCallback } from 'react';

import { getStorageManager } from '@/lib/storage/manager';
import { syncManager } from '@/lib/sync/orchestrator';

export function useSyncState() {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const updateStats = useCallback(async () => {
    try {
      const storage = getStorageManager();
      const ops = await storage.getAllOperations();

      setPendingCount(
        ops.filter((op) => op.queue_status === 'PENDING' || op.queue_status === 'RETRY_SCHEDULED')
          .length
      );
      setFailedCount(ops.filter((op) => op.queue_status === 'FAILED_TERMINAL').length);
      setIsSyncing(ops.some((op) => op.queue_status === 'IN_FLIGHT'));

      const doneOps = ops
        .filter((op) => op.queue_status === 'DONE')
        .sort(
          (a, b) => new Date(b.synced_at || 0).getTime() - new Date(a.synced_at || 0).getTime()
        );
      if (doneOps.length > 0) {
        setLastSyncAt(doneOps[0].synced_at);
      }

      if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
      }
    } catch (err) {
      console.error('Failed to update sync stats:', err);
    }
  }, []);

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 2000);
    const onQueueChange = () => updateStats();
    const onOnline = () => {
      setIsOnline(true);
      updateStats();
    };
    const onOffline = () => {
      setIsOnline(false);
      updateStats();
    };

    window.addEventListener('sync-queue-changed', onQueueChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-changed', onQueueChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [updateStats]);

  const triggerSync = async () => {
    setIsSyncing(true);
    await syncManager.flush();
    await updateStats();
    setIsSyncing(false);
  };

  return {
    pendingCount,
    failedCount,
    isSyncing,
    isOnline,
    lastSyncAt,
    triggerSync,
    refresh: updateStats,
  };
}
