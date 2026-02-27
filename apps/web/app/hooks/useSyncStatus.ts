/**
 * Sync Status Hook
 * 
 * Monitors online status, sync state, and handles background sync
 */

'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  syncError?: string;
  pendingChanges: number;
}

export function useSyncStatus() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingChanges: 0,
  });

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, syncError: undefined }));
      // Trigger sync when back online
      triggerSync();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false, isSyncing: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending changes periodically
    const checkInterval = setInterval(() => {
      const pendingCount = getPendingChangesCount();
      setStatus(prev => ({ ...prev, pendingChanges: pendingCount }));
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, []);

  const triggerSync = async () => {
    if (!status.isOnline || status.isSyncing) return;

    setStatus(prev => ({ ...prev, isSyncing: true, syncError: undefined }));

    try {
      // Process pending analytics events
      await fetch('/api/analytics/sync', { method: 'POST' });
      
      // Invalidate all analytics caches
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingChanges: 0,
      }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  };

  return {
    ...status,
    triggerSync,
  };
}

function getPendingChangesCount(): number {
  // Check IndexedDB for pending changes
  // This is a placeholder - implement actual check
  return 0;
}
