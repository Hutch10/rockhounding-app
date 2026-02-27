/**
 * Analytics Data Hooks
 * 
 * React Query hooks with offline-first caching for all analytics levels
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserAnalytics,
  StorageLocationAnalytics,
  TagAnalytics,
  CollectionGroupAnalytics,
  MaterialAnalytics,
  CacheStatus,
} from '@rockhounding/shared';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// QUERY KEYS
// =====================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  user: (userId: string) => ['analytics', 'user', userId] as const,
  storage: (locationId: string) => ['analytics', 'storage', locationId] as const,
  storageList: (userId: string) => ['analytics', 'storage-list', userId] as const,
  tag: (tagId: string) => ['analytics', 'tag', tagId] as const,
  tagList: (userId: string) => ['analytics', 'tag-list', userId] as const,
  collectionGroup: (groupId: string) => ['analytics', 'collection-group', groupId] as const,
  collectionGroupList: (userId: string) => ['analytics', 'collection-group-list', userId] as const,
  material: (materialId: string) => ['analytics', 'material', materialId] as const,
  materialList: (userId: string) => ['analytics', 'material-list', userId] as const,
  timePeriod: (userId: string, granularity: string, start: string, end: string) => 
    ['analytics', 'time-period', userId, granularity, start, end] as const,
};

// =====================================================
// CACHE CONFIGURATION
// =====================================================

const CACHE_CONFIG = {
  user: {
    staleTime: 5 * 60 * 1000,        // 5 minutes
    cacheTime: 30 * 60 * 1000,       // 30 minutes
    refetchOnWindowFocus: true,
  },
  storage: {
    staleTime: 10 * 60 * 1000,       // 10 minutes
    cacheTime: 60 * 60 * 1000,       // 1 hour
    refetchOnWindowFocus: false,
  },
  tag: {
    staleTime: 10 * 60 * 1000,       // 10 minutes
    cacheTime: 60 * 60 * 1000,       // 1 hour
    refetchOnWindowFocus: false,
  },
  collectionGroup: {
    staleTime: 10 * 60 * 1000,       // 10 minutes
    cacheTime: 60 * 60 * 1000,       // 1 hour
    refetchOnWindowFocus: false,
  },
  material: {
    staleTime: 15 * 60 * 1000,       // 15 minutes
    cacheTime: 2 * 60 * 60 * 1000,   // 2 hours
    refetchOnWindowFocus: false,
  },
  timePeriod: {
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
  },
};

// =====================================================
// USER ANALYTICS
// =====================================================

export function useUserAnalytics(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.user(userId),
    queryFn: async () => {
      // Try to get from cache first
      const { data: cached } = await supabase
        .from('analytics_cache')
        .select('data, status, expires_at, calculated_at')
        .eq('user_id', userId)
        .eq('cache_key', 'USER')
        .eq('status', 'FRESH')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        return {
          ...cached.data as UserAnalytics,
          cache_status: cached.status as CacheStatus,
          calculated_at: new Date(cached.calculated_at),
        };
      }

      // Get from materialized view
      const { data, error } = await supabase.rpc('get_user_analytics', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as UserAnalytics;
    },
    ...CACHE_CONFIG.user,
    enabled: !!userId,
  });
}

// =====================================================
// STORAGE LOCATION ANALYTICS
// =====================================================

export function useStorageLocationAnalytics(locationId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.storage(locationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_location_analytics_mv')
        .select('*')
        .eq('storage_location_id', locationId)
        .single();

      if (error) throw error;
      return data as StorageLocationAnalytics;
    },
    ...CACHE_CONFIG.storage,
    enabled: !!locationId,
  });
}

export function useStorageLocationAnalyticsList(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.storageList(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_location_analytics_mv')
        .select('*')
        .eq('user_id', userId)
        .order('utilization_percentage', { ascending: false });

      if (error) throw error;
      return data as StorageLocationAnalytics[];
    },
    ...CACHE_CONFIG.storage,
    enabled: !!userId,
  });
}

// =====================================================
// TAG ANALYTICS
// =====================================================

export function useTagAnalytics(tagId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.tag(tagId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_analytics_mv')
        .select('*')
        .eq('tag_id', tagId)
        .single();

      if (error) throw error;
      return data as TagAnalytics;
    },
    ...CACHE_CONFIG.tag,
    enabled: !!tagId,
  });
}

export function useTagAnalyticsList(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.tagList(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_analytics_mv')
        .select('*')
        .eq('user_id', userId)
        .order('specimen_count', { ascending: false });

      if (error) throw error;
      return data as TagAnalytics[];
    },
    ...CACHE_CONFIG.tag,
    enabled: !!userId,
  });
}

// =====================================================
// COLLECTION GROUP ANALYTICS
// =====================================================

export function useCollectionGroupAnalytics(groupId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.collectionGroup(groupId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_group_analytics_mv')
        .select('*')
        .eq('collection_group_id', groupId)
        .single();

      if (error) throw error;
      return data as CollectionGroupAnalytics;
    },
    ...CACHE_CONFIG.collectionGroup,
    enabled: !!groupId,
  });
}

export function useCollectionGroupAnalyticsList(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.collectionGroupList(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_group_analytics_mv')
        .select('*')
        .eq('user_id', userId)
        .order('specimen_count', { ascending: false });

      if (error) throw error;
      return data as CollectionGroupAnalytics[];
    },
    ...CACHE_CONFIG.collectionGroup,
    enabled: !!userId,
  });
}

// =====================================================
// MATERIAL ANALYTICS
// =====================================================

export function useMaterialAnalytics(materialId: string, userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.material(materialId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_analytics_mv')
        .select('*')
        .eq('material_id', materialId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as MaterialAnalytics;
    },
    ...CACHE_CONFIG.material,
    enabled: !!materialId && !!userId,
  });
}

export function useMaterialAnalyticsList(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: analyticsKeys.materialList(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_analytics_mv')
        .select('*')
        .eq('user_id', userId)
        .order('specimen_count', { ascending: false });

      if (error) throw error;
      return data as MaterialAnalytics[];
    },
    ...CACHE_CONFIG.material,
    enabled: !!userId,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useRefreshAnalytics() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (_userId: string) => {
      // Trigger materialized view refresh
      const { error } = await supabase.rpc('refresh_analytics_views');
      if (error) throw error;

      // Process pending events
      const { data } = await supabase.rpc('process_analytics_update_events');
      return data as number;
    },
    onSuccess: (processedCount, _userId) => {
      // Invalidate all analytics caches
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      console.log(`Refreshed analytics, processed ${processedCount} events`);
    },
  });
}

export function useInvalidateCache() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ userId, level, entityId }: {
      userId: string;
      level: string;
      entityId?: string;
    }) => {
      const { error } = await supabase.rpc('invalidate_analytics_cache', {
        p_user_id: userId,
        p_level: level,
        p_entity_id: entityId || null,
      });
      if (error) throw error;
    },
  });
}

// =====================================================
// OFFLINE SUPPORT
// =====================================================

/**
 * Hook to persist analytics to IndexedDB for offline access
 */
export function useOfflineAnalytics() {
  const persistToIndexedDB = async (key: string, data: unknown) => {
    if (typeof window === 'undefined') return;

    try {
      const db = await openAnalyticsDB();
      const tx = db.transaction(['analytics'], 'readwrite');
      const store = tx.objectStore('analytics');
      
      await store.put({
        key,
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    } catch (error) {
      console.error('Failed to persist to IndexedDB:', error);
    }
  };

  const getFromIndexedDB = async (key: string) => {
    if (typeof window === 'undefined') return null;

    try {
      const db = await openAnalyticsDB();
      const tx = db.transaction(['analytics'], 'readonly');
      const store = tx.objectStore('analytics');
      const request = store.get(key);
      const result = await new Promise<any>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result && result.expiresAt > Date.now()) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get from IndexedDB:', error);
      return null;
    }
  };

  return { persistToIndexedDB, getFromIndexedDB };
}

async function openAnalyticsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RockhoundAnalytics', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('analytics')) {
        db.createObjectStore('analytics', { keyPath: 'key' });
      }
    };
  });
}
