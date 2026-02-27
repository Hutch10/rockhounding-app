/**
 * Offline Storage & Caching - React Hooks
 * 
 * 15+ hooks for offline reads/writes and cache management
 */

'use client';

import type { StorageEntityType, CachedFieldSession, CachedFindLog, CachedSpecimen } from '@rockhounding/shared';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStorageManager } from '@/lib/storage/manager';

// ============================================================================
// Query Keys
// ============================================================================

export const storageKeys = {
  all: ['storage'] as const,
  entity: (entityType: StorageEntityType, entityId: string) =>
    [...storageKeys.all, 'entity', entityType, entityId] as const,
  type: (entityType: StorageEntityType) =>
    [...storageKeys.all, 'type', entityType] as const,
  stats: () => [...storageKeys.all, 'stats'] as const,
  health: () => [...storageKeys.all, 'health'] as const,
  user: (userId: string) =>
    [...storageKeys.all, 'user', userId] as const,
};

// ============================================================================
// useStorageRead - Read from cache
// ============================================================================

export function useStorageRead<T>(
  entityType: StorageEntityType,
  entityId: string,
  options: {
    enabled?: boolean;
    skipExpiry?: boolean;
    staleTime?: number;
  } = {}
) {
  return useQuery({
    queryKey: storageKeys.entity(entityType, entityId),
    queryFn: async () => {
      const manager = getStorageManager();
      const data = await manager.get<T>(entityType, entityId, {
        skipExpiry: options.skipExpiry,
      });
      return data;
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime || 60000, // 1 minute
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ============================================================================
// useStorageWrite - Write to cache
// ============================================================================

export function useStorageWrite<T>(
  entityType: StorageEntityType,
  options: {
    onSuccess?: (key: string) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityId: string;
      data: T;
      ttl?: number;
      priority?: number;
    }) => {
      const manager = getStorageManager();
      const key = await manager.set(
        entityType,
        params.entityId,
        params.data,
        {
          ttl: params.ttl,
          priority: params.priority,
        }
      );
      return key;
    },
    onSuccess: (key) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: storageKeys.type(entityType),
      });
      options.onSuccess?.(key);
    },
    onError: (error: any) => {
      console.error(`Failed to write ${entityType}:`, error);
      options.onError?.(error);
    },
  });
}

// ============================================================================
// useStorageDelete - Delete from cache
// ============================================================================

export function useStorageDelete(
  entityType: StorageEntityType,
  options: {
    onSuccess?: (entityId: string) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityId: string) => {
      const manager = getStorageManager();
      await manager.delete(entityType, entityId);
      return entityId;
    },
    onSuccess: (entityId) => {
      queryClient.invalidateQueries({
        queryKey: storageKeys.entity(entityType, entityId),
      });
      queryClient.invalidateQueries({
        queryKey: storageKeys.type(entityType),
      });
      options.onSuccess?.(entityId);
    },
  });
}

// ============================================================================
// useStorageByType - Get all entities of a type
// ============================================================================

export function useStorageByType(
  entityType: StorageEntityType,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: storageKeys.type(entityType),
    queryFn: async () => {
      const manager = getStorageManager();
      const items = await manager.getAllByType(entityType);
      return Array.from(items.entries()).map(([id, data]) => ({
        id,
        data,
      }));
    },
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// useStorageStats - Get storage statistics
// ============================================================================

export function useStorageStats(options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: storageKeys.stats(),
    queryFn: async () => {
      const manager = getStorageManager();
      return await manager.getStats();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: options.refetchInterval || 60000,
  });
}

// ============================================================================
// useStorageHealth - Get storage health status
// ============================================================================

export function useStorageHealth(options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: storageKeys.health(),
    queryFn: async () => {
      const manager = getStorageManager();
      return await manager.getHealth();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: options.refetchInterval || 5 * 60 * 1000,
  });
}

// ============================================================================
// useStorageExist - Check if entity exists
// ============================================================================

export function useStorageExist(
  entityType: StorageEntityType,
  entityId: string,
  options: { enabled?: boolean } = {}
) {
  const [exists, setExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const manager = getStorageManager();
        const result = await manager.exists(entityType, entityId);
        if (mounted) {
          setExists(result);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    if (options.enabled !== false) {
      check();
    }

    return () => {
      mounted = false;
    };
  }, [entityType, entityId, options.enabled]);

  return { exists, isLoading };
}

// ============================================================================
// useOfflineStorage - Offline-first read/write with sync tracking
// ============================================================================

export function useOfflineStorage<T>(
  entityType: StorageEntityType,
  entityId: string
) {
  const [syncStatus, setSyncStatus] = useState<
    'pending' | 'syncing' | 'synced' | 'conflict' | 'error'
  >('pending');
  const readQuery = useStorageRead<T>(entityType, entityId);
  const writeQuery = useStorageWrite<T>(entityType);
  const deleteQuery = useStorageDelete(entityType);

  const save = useCallback(
    async (data: T) => {
      setSyncStatus('pending');
      try {
        await writeQuery.mutateAsync({
          entityId,
          data,
        } as any);
        setSyncStatus('pending');
      } catch (error) {
        setSyncStatus('error');
        throw error;
      }
    },
    [entityId, writeQuery]
  );

  const remove = useCallback(async () => {
    setSyncStatus('pending');
    try {
      await deleteQuery.mutateAsync(entityId);
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  }, [entityId, deleteQuery]);

  return {
    data: readQuery.data,
    isLoading: readQuery.isLoading,
    error: readQuery.error,
    save,
    remove,
    syncStatus,
    setSyncStatus,
  };
}

// ============================================================================
// useCachedFieldSession
// ============================================================================

export function useCachedFieldSession(fieldSessionId: string) {
  return useOfflineStorage<CachedFieldSession>('field_session', fieldSessionId);
}

// ============================================================================
// useCachedFindLog
// ============================================================================

export function useCachedFindLog(findLogId: string) {
  return useOfflineStorage<CachedFindLog>('find_log', findLogId);
}

// ============================================================================
// useCachedSpecimen
// ============================================================================

export function useCachedSpecimen(specimenId: string) {
  return useOfflineStorage<CachedSpecimen>('specimen', specimenId);
}

// ============================================================================
// useStorageCompact - Trigger storage compaction
// ============================================================================

export function useStorageCompact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const manager = getStorageManager();
      return await manager.compact();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: storageKeys.health() });
    },
  });
}

// ============================================================================
// useStorageCleanup - Trigger cleanup of expired items
// ============================================================================

export function useStorageCleanup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const manager = getStorageManager();
      return await manager.cleanupExpired();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.stats() });
      queryClient.invalidateQueries({ queryKey: storageKeys.health() });
    },
  });
}

// ============================================================================
// useStorageBulkWrite - Write multiple entities at once
// ============================================================================

export function useStorageBulkWrite<T>(entityType: StorageEntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Array<{ id: string; data: T }>) => {
      const manager = getStorageManager();
      return await manager.bulkSet(entityType, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.type(entityType) });
      queryClient.invalidateQueries({ queryKey: storageKeys.stats() });
    },
  });
}

// ============================================================================
// useStorageBulkDelete - Delete multiple entities at once
// ============================================================================

export function useStorageBulkDelete(entityType: StorageEntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityIds: string[]) => {
      const manager = getStorageManager();
      await manager.bulkDelete(entityType, entityIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.type(entityType) });
      queryClient.invalidateQueries({ queryKey: storageKeys.stats() });
    },
  });
}

// ============================================================================
// useOfflineStatus - Track offline status
// ============================================================================

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

// ============================================================================
// useStorageSearch - Search storage by pattern
// ============================================================================

export function useStorageSearch(pattern: RegExp, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...storageKeys.all, 'search', pattern.source],
    queryFn: async () => {
      const manager = getStorageManager();
      const results = await manager.searchByPattern(pattern);
      return Array.from(results.entries()).map(([key, data]) => ({
        key,
        data,
      }));
    },
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// useStorageSync - Track sync status for cached entities
// ============================================================================

export function useStorageSync(
  entityType: StorageEntityType,
  entityId: string
) {
  const [syncStatus, setSyncStatus] = useState<'pending' | 'syncing' | 'synced' | 'error'>(
    'pending'
  );
  const [error, setError] = useState<string | null>(null);

  const updateSyncStatus = useCallback(
    async (status: 'pending' | 'syncing' | 'synced' | 'error', errorMsg?: string) => {
      try {
        const manager = getStorageManager();
        await manager.set(entityType, entityId, {}, { syncStatus: status });
        setSyncStatus(status);
        if (errorMsg) setError(errorMsg);
      } catch (err: any) {
        setError(err.message);
        setSyncStatus('error');
      }
    },
    [entityType, entityId]
  );

  return { syncStatus, error, updateSyncStatus };
}

// ============================================================================
// useStorageMonitor - Real-time storage monitoring
// ============================================================================

export function useStorageMonitor(options: { pollInterval?: number } = {}) {
  const statsQuery = useStorageStats({
    refetchInterval: options.pollInterval || 30000,
  });
  const healthQuery = useStorageHealth({
    refetchInterval: options.pollInterval || 60000,
  });

  return {
    stats: statsQuery.data,
    health: healthQuery.data,
    isLoading: statsQuery.isLoading || healthQuery.isLoading,
    error: statsQuery.error || healthQuery.error,
  };
}

// ============================================================================
// usePersistentState - useState with storage persistence
// ============================================================================

export function usePersistentState<T>(
  entityType: StorageEntityType,
  entityId: string,
  initialValue: T,
  options: { ttl?: number } = {}
): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(initialValue);
  const writeQuery = useStorageWrite<T>(entityType);
  const readQuery = useStorageRead<T>(entityType, entityId);

  // Load from storage on mount
  useEffect(() => {
    if (readQuery.data !== undefined && readQuery.data !== null) {
      setValue(readQuery.data as T);
    }
  }, [readQuery.data]);

  const persistValue = useCallback(
    async (newValue: T) => {
      setValue(newValue);
      await writeQuery.mutateAsync({
        entityId,
        data: newValue,
        ttl: options.ttl,
      });
    },
    [entityId, options.ttl, writeQuery]
  );

  return [value, persistValue];
}

// ============================================================================
// useAutosave - Auto-save data to storage
// ============================================================================

export function useAutosave<T>(
  entityType: StorageEntityType,
  entityId: string,
  data: T,
  options: {
    delay?: number;
    enabled?: boolean;
    onSave?: () => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const writeQuery = useStorageWrite<T>(entityType);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (options.enabled === false) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    setIsSaving(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        await writeQuery.mutateAsync({
          entityId,
          data,
        });
        options.onSave?.();
      } catch (error) {
        options.onError?.(error as Error);
      } finally {
        setIsSaving(false);
      }
    }, options.delay || 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [entityType, entityId, data, options.delay, options.enabled, writeQuery]);

  return { isSaving };
}
