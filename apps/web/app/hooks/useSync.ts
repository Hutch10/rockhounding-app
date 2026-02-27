/**
 * Sync Hooks - React integration for Sync Engine
 */

'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BaseSyncOperation,
  SyncState,
  SyncConflict,
  SyncMetrics,
  SyncStatus,
  SyncEntityType,
  SyncOperationType,
  SyncPriority,
  ConflictResolutionStrategy,
} from '@rockhounding/shared';
import { getSync, SyncCoordinator } from '@/lib/sync/coordinator';

// ============================================================================
// Query Keys
// ============================================================================

export const syncKeys = {
  all: ['sync'] as const,
  state: (userId: string) => [...syncKeys.all, 'state', userId] as const,
  queue: (userId: string) => [...syncKeys.all, 'queue', userId] as const,
  conflicts: (userId: string) => [...syncKeys.all, 'conflicts', userId] as const,
  history: (userId: string, filters?: any) => [...syncKeys.all, 'history', userId, filters] as const,
  metrics: (userId: string, period?: any) => [...syncKeys.all, 'metrics', userId, period] as const,
};

// ============================================================================
// Core Sync Hook
// ============================================================================

export interface UseSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

export function useSync(options: UseSyncOptions = {}) {
  const { autoSync = true, syncInterval = 60000 } = options;
  const [coordinator] = useState(() => getSync());
  const queryClient = useQueryClient();

  // Trigger sync
  const triggerSync = useCallback(async () => {
    try {
      await coordinator.sync();
      // Invalidate queries after sync
      queryClient.invalidateQueries({ queryKey: syncKeys.all });
    } catch (error) {
      console.error('[useSync] Sync failed:', error);
      throw error;
    }
  }, [coordinator, queryClient]);

  // Enqueue operation
  const enqueue = useCallback(
    async <T extends Record<string, any>>(
      entityType: SyncEntityType,
      entityId: string,
      operationType: SyncOperationType,
      original: T | null,
      modified: T,
      priority?: SyncPriority
    ) => {
      const syncId = await coordinator.enqueue(
        entityType,
        entityId,
        operationType,
        original,
        modified,
        priority
      );
      
      // Invalidate queue queries
      queryClient.invalidateQueries({ queryKey: syncKeys.all });
      
      return syncId;
    },
    [coordinator, queryClient]
  );

  // Cancel operation
  const cancel = useCallback(
    async (syncId: string) => {
      await coordinator.cancel(syncId);
      queryClient.invalidateQueries({ queryKey: syncKeys.all });
    },
    [coordinator, queryClient]
  );

  // Retry operation
  const retry = useCallback(
    async (syncId: string) => {
      await coordinator.retry(syncId);
      queryClient.invalidateQueries({ queryKey: syncKeys.all });
    },
    [coordinator, queryClient]
  );

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      triggerSync();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, syncInterval, triggerSync]);

  return {
    sync: triggerSync,
    enqueue,
    cancel,
    retry,
    coordinator,
  };
}

// ============================================================================
// Sync State Hook
// ============================================================================

export function useSyncState(userId: string): UseQueryResult<SyncState> {
  const supabase = createClient();
  const coordinator = getSync();

  return useQuery({
    queryKey: syncKeys.state(userId),
    queryFn: async () => {
      // Get state from coordinator first (includes offline state)
      const localState = await coordinator.getState();
      
      // Try to get server state if online
      try {
        const { data, error } = await supabase.rpc('get_sync_state', {
          p_user_id: userId,
        });

        if (error) throw error;

        // Merge local and server state
        if (data && data.length > 0) {
          return {
            ...localState,
            ...data[0],
          };
        }
      } catch (error) {
        console.error('[useSyncState] Failed to fetch server state:', error);
      }

      return localState;
    },
    staleTime: 5000, // 5 seconds
    gcTime: 30000, // 30 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// ============================================================================
// Sync Queue Hook
// ============================================================================

export interface SyncQueueFilters {
  status?: SyncStatus[];
  entity_type?: SyncEntityType[];
  priority?: SyncPriority[];
}

export function useSyncQueue(
  userId: string,
  filters?: SyncQueueFilters
): UseQueryResult<BaseSyncOperation[]> {
  const supabase = createClient();

  return useQuery({
    queryKey: syncKeys.queue(userId),
    queryFn: async () => {
      let query = supabase
        .from('sync_queue')
        .select('*')
        .eq('user_id', userId)
        .order('priority')
        .order('created_at');

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.entity_type && filters.entity_type.length > 0) {
        query = query.in('entity_type', filters.entity_type);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as BaseSyncOperation[];
    },
    staleTime: 5000,
    gcTime: 30000,
  });
}

// ============================================================================
// Conflicts Hook
// ============================================================================

export function useSyncConflicts(
  userId: string,
  resolved: boolean = false
): UseQueryResult<SyncConflict[]> {
  const supabase = createClient();

  return useQuery({
    queryKey: syncKeys.conflicts(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_conflicts')
        .select(`
          *,
          sync_queue!inner(user_id)
        `)
        .eq('sync_queue.user_id', userId)
        .eq('resolved', resolved)
        .order('detected_at', { ascending: false });

      if (error) throw error;

      return data as SyncConflict[];
    },
    staleTime: 10000,
    gcTime: 60000,
  });
}

// ============================================================================
// Resolve Conflict Mutation
// ============================================================================

export function useResolveConflict() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conflictId,
      resolvedBy,
      resolutionData,
    }: {
      conflictId: string;
      resolvedBy: string;
      resolutionData: Record<string, any>;
    }) => {
      const { error } = await supabase.rpc('resolve_sync_conflict', {
        p_conflict_id: conflictId,
        p_resolved_by: resolvedBy,
        p_resolution_data: resolutionData,
      });

      if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: syncKeys.all });
    },
  });
}

// ============================================================================
// Sync History Hook
// ============================================================================

export interface SyncHistoryFilters {
  entity_type?: SyncEntityType;
  status?: SyncStatus;
  limit?: number;
  days?: number;
}

export function useSyncHistory(
  userId: string,
  filters?: SyncHistoryFilters
): UseQueryResult<any[]> {
  const supabase = createClient();

  return useQuery({
    queryKey: syncKeys.history(userId, filters),
    queryFn: async () => {
      let query = supabase
        .from('sync_history')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.days) {
        const since = new Date();
        since.setDate(since.getDate() - filters.days);
        query = query.gte('completed_at', since.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    },
    staleTime: 30000,
    gcTime: 300000,
  });
}

// ============================================================================
// Sync Metrics Hook
// ============================================================================

export function useSyncMetrics(
  userId: string,
  days: number = 7
): UseQueryResult<SyncMetrics[]> {
  const supabase = createClient();

  return useQuery({
    queryKey: syncKeys.metrics(userId, { days }),
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('sync_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('period_start', since.toISOString())
        .order('period_start', { ascending: false });

      if (error) throw error;

      return data as SyncMetrics[];
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

// ============================================================================
// Real-time Sync State Hook
// ============================================================================

export function useRealtimeSyncState(userId: string) {
  const [state, setState] = useState<SyncState | null>(null);
  const coordinator = getSync();

  useEffect(() => {
    const updateState = async () => {
      const newState = await coordinator.getState();
      setState(newState);
    };

    // Initial state
    updateState();

    // Update every 2 seconds
    const interval = setInterval(updateState, 2000);

    return () => clearInterval(interval);
  }, [userId, coordinator]);

  return state;
}

// ============================================================================
// Sync Monitoring Hook
// ============================================================================

export interface SyncMonitor {
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  errorCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

export function useSyncMonitor(userId: string): SyncMonitor {
  const { data: state } = useSyncState(userId);
  const coordinator = getSync();
  const [metrics, setMetrics] = useState(coordinator.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(coordinator.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [coordinator]);

  return {
    isSyncing: state?.is_syncing || false,
    isOnline: state?.is_online || true,
    pendingCount: state?.pending_count || 0,
    errorCount: state?.error_count || 0,
    conflictCount: state?.conflict_count || 0,
    lastSyncAt: state?.last_sync_at || null,
    connectionQuality: state?.connection_quality || 'good',
  };
}

// ============================================================================
// Entity Sync Hook
// ============================================================================

export function useEntitySync<T extends Record<string, any>>(
  entityType: SyncEntityType,
  entityId: string | null,
  entity: T | null
) {
  const { enqueue } = useSync({ autoSync: false });
  const [isSyncing, setIsSyncing] = useState(false);

  const syncCreate = useCallback(
    async (data: T) => {
      if (!entityId) return;
      
      setIsSyncing(true);
      try {
        await enqueue(entityType, entityId, 'create', null, data, 'high');
      } finally {
        setIsSyncing(false);
      }
    },
    [entityType, entityId, enqueue]
  );

  const syncUpdate = useCallback(
    async (original: T, modified: T) => {
      if (!entityId) return;
      
      setIsSyncing(true);
      try {
        await enqueue(entityType, entityId, 'update', original, modified, 'normal');
      } finally {
        setIsSyncing(false);
      }
    },
    [entityType, entityId, enqueue]
  );

  const syncDelete = useCallback(
    async (data: T) => {
      if (!entityId) return;
      
      setIsSyncing(true);
      try {
        await enqueue(entityType, entityId, 'delete', data, data, 'critical');
      } finally {
        setIsSyncing(false);
      }
    },
    [entityType, entityId, enqueue]
  );

  return {
    syncCreate,
    syncUpdate,
    syncDelete,
    isSyncing,
  };
}

// ============================================================================
// Batch Sync Hook
// ============================================================================

export function useBatchSync() {
  const { enqueue } = useSync({ autoSync: false });
  const [isSyncing, setIsSyncing] = useState(false);

  const syncBatch = useCallback(
    async <T extends Record<string, any>>(
      operations: Array<{
        entityType: SyncEntityType;
        entityId: string;
        operationType: SyncOperationType;
        original: T | null;
        modified: T;
        priority?: SyncPriority;
      }>
    ) => {
      setIsSyncing(true);
      try {
        const syncIds = await Promise.all(
          operations.map(op =>
            enqueue(
              op.entityType,
              op.entityId,
              op.operationType,
              op.original,
              op.modified,
              op.priority
            )
          )
        );
        return syncIds;
      } finally {
        setIsSyncing(false);
      }
    },
    [enqueue]
  );

  return {
    syncBatch,
    isSyncing,
  };
}

// ============================================================================
// Conflict Resolution Hook
// ============================================================================

export function useConflictResolution(conflictId: string) {
  const supabase = createClient();
  const { mutate: resolve } = useResolveConflict();
  const queryClient = useQueryClient();

  const resolveWithStrategy = useCallback(
    async (
      strategy: ConflictResolutionStrategy,
      userId: string
    ) => {
      // Get conflict
      const { data: conflict, error } = await supabase
        .from('sync_conflicts')
        .select('*')
        .eq('conflict_id', conflictId)
        .single();

      if (error) throw error;

      let resolutionData: Record<string, any>;

      switch (strategy) {
        case 'client_wins':
          resolutionData = conflict.client_data;
          break;
        case 'server_wins':
          resolutionData = conflict.server_data;
          break;
        case 'latest_timestamp':
          const clientTime = new Date(conflict.client_data.updated_at || 0).getTime();
          const serverTime = new Date(conflict.server_data.updated_at || 0).getTime();
          resolutionData = clientTime > serverTime ? conflict.client_data : conflict.server_data;
          break;
        case 'field_level':
          // Merge at field level
          resolutionData = { ...conflict.server_data };
          for (const field of conflict.conflicting_fields) {
            const clientTime = new Date(conflict.client_data[`${field}_updated_at`] || conflict.client_data.updated_at || 0).getTime();
            const serverTime = new Date(conflict.server_data[`${field}_updated_at`] || conflict.server_data.updated_at || 0).getTime();
            if (clientTime > serverTime) {
              resolutionData[field] = conflict.client_data[field];
            }
          }
          break;
        default:
          throw new Error(`Unsupported strategy: ${strategy}`);
      }

      resolve({
        conflictId,
        resolvedBy: userId,
        resolutionData,
      });
    },
    [conflictId, supabase, resolve]
  );

  const resolveManually = useCallback(
    async (resolutionData: Record<string, any>, userId: string) => {
      resolve({
        conflictId,
        resolvedBy: userId,
        resolutionData,
      });
    },
    [conflictId, resolve]
  );

  return {
    resolveWithStrategy,
    resolveManually,
  };
}

// ============================================================================
// Offline Status Hook
// ============================================================================

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
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
