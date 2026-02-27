/**
 * Offline Storage & Caching - Integration Points
 * 
 * Integration with Sync Engine, Telemetry, and Dashboard
 */

import {
  StorageEntityType,
  CachedFieldSession,
  CachedFindLog,
  CachedSpecimen,
  CachedCaptureSession,
  CachedRawCapture,
  CachedProcessedCapture,
  CachedStorageLocation,
  CachedCollectionGroup,
  CachedTag,
  CachedAnalyticsCache,
  CachedTelemetryEvent,
  CachedSyncQueueItem,
} from '@rockhounding/shared';
import { getStorageManager } from '@/lib/storage/manager';
import { getBackgroundJobManager } from '@/lib/storage/background-jobs';

// ============================================================================
// Sync Engine Integration
// ============================================================================

export async function cacheFieldSessionForSync(
  session: CachedFieldSession,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'field_session',
    session.id,
    session,
    {
      priority: 9, // High priority
      syncStatus: 'pending',
    }
  );
}

export async function cacheFindLogForSync(
  findLog: CachedFindLog,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'find_log',
    findLog.id,
    findLog,
    {
      priority: 9,
      syncStatus: 'pending',
    }
  );
}

export async function cacheSpecimenForSync(
  specimen: CachedSpecimen,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'specimen',
    specimen.id,
    specimen,
    {
      priority: 8,
      syncStatus: 'pending',
    }
  );
}

export async function cacheSyncQueueItem(
  item: CachedSyncQueueItem
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'sync_queue',
    item.sync_id,
    item,
    {
      priority: 10, // Critical priority for sync items
      syncStatus: item.status,
    }
  );
}

export async function getSyncQueueFromCache(
  userId: string
): Promise<Map<string, CachedSyncQueueItem>> {
  const manager = getStorageManager();
  const items = await manager.getAllByType('sync_queue');
  const result = new Map<string, CachedSyncQueueItem>();

  for (const [id, data] of items) {
    const item = data as CachedSyncQueueItem;
    if (item.user_id === userId) {
      result.set(id, item);
    }
  }

  return result;
}

export async function markSyncItemAsSynced(
  syncId: string,
  userId: string
): Promise<void> {
  const manager = getStorageManager();
  const item = await manager.get<CachedSyncQueueItem>(
    'sync_queue',
    syncId
  );

  if (item && item.user_id === userId) {
    item.status = 'success';
    await manager.set(
      'sync_queue',
      syncId,
      item,
      { syncStatus: 'synced' }
    );
  }
}

export async function markSyncItemAsConflict(
  syncId: string,
  userId: string
): Promise<void> {
  const manager = getStorageManager();
  const item = await manager.get<CachedSyncQueueItem>(
    'sync_queue',
    syncId
  );

  if (item && item.user_id === userId) {
    item.status = 'conflict';
    await manager.set(
      'sync_queue',
      syncId,
      item,
      { syncStatus: 'conflict' }
    );
  }
}

// ============================================================================
// Telemetry Integration
// ============================================================================

export async function cacheTelemetryEvent(
  event: CachedTelemetryEvent
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'telemetry_event',
    event.event_id,
    event,
    {
      priority: 1, // Low priority
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  );
}

export async function getPendingTelemetryEvents(
  userId?: string,
  limit: number = 100
): Promise<CachedTelemetryEvent[]> {
  const manager = getStorageManager();
  const events = await manager.getAllByType('telemetry_event');
  const result: CachedTelemetryEvent[] = [];

  for (const [, data] of events) {
    const event = data as CachedTelemetryEvent;
    if (!userId || event.user_id === userId) {
      result.push(event);
      if (result.length >= limit) break;
    }
  }

  return result;
}

export async function clearTelemetryEvents(eventIds: string[]): Promise<void> {
  const manager = getStorageManager();
  for (const eventId of eventIds) {
    await manager.delete('telemetry_event', eventId);
  }
}

// ============================================================================
// Analytics Cache Integration
// ============================================================================

export async function cacheAnalyticsData(
  userId: string,
  cacheKey: string,
  data: Record<string, any>,
  ttl?: number
): Promise<string> {
  const manager = getStorageManager();

  const cacheEntry: CachedAnalyticsCache = {
    id: `${userId}-${cacheKey}`,
    user_id: userId,
    cache_key: cacheKey,
    cache_data: data,
    computed_at: new Date().toISOString(),
    expires_at: ttl
      ? new Date(Date.now() + ttl).toISOString()
      : undefined,
    version: 1,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  return await manager.set(
    'analytics_cache',
    cacheEntry.id,
    cacheEntry,
    {
      ttl: ttl || 24 * 60 * 60 * 1000, // Default 24 hours
      priority: 2,
    }
  );
}

export async function getAnalyticsCache(
  userId: string,
  cacheKey: string
): Promise<Record<string, any> | null> {
  const manager = getStorageManager();
  const cacheId = `${userId}-${cacheKey}`;

  const entry = await manager.get<CachedAnalyticsCache>(
    'analytics_cache',
    cacheId
  );

  if (entry && entry.cache_data) {
    return entry.cache_data;
  }

  return null;
}

export async function invalidateAnalyticsCache(
  userId: string,
  pattern?: string
): Promise<number> {
  const manager = getStorageManager();
  const allCache = await manager.getAllByType('analytics_cache');

  let invalidatedCount = 0;

  for (const [id, data] of allCache) {
    const entry = data as CachedAnalyticsCache;

    if (entry.user_id === userId) {
      if (!pattern || entry.cache_key.includes(pattern)) {
        await manager.delete('analytics_cache', id);
        invalidatedCount++;
      }
    }
  }

  return invalidatedCount;
}

// ============================================================================
// Collection Management Integration
// ============================================================================

export async function cacheStorageLocation(
  location: CachedStorageLocation,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'storage_location',
    location.id,
    location,
    { priority: 7 }
  );
}

export async function cacheCollectionGroup(
  group: CachedCollectionGroup,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'collection_group',
    group.id,
    group,
    { priority: 7 }
  );
}

export async function cacheTag(
  tag: CachedTag,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'tag',
    tag.id,
    tag,
    { priority: 5 }
  );
}

export async function getUserCollectionItems(
  userId: string,
  entityType: StorageEntityType
): Promise<Map<string, any>> {
  const manager = getStorageManager();
  const allItems = await manager.getAllByType(entityType);
  const userItems = new Map<string, any>();

  for (const [id, data] of allItems) {
    const item = data as any;
    if (item.user_id === userId) {
      userItems.set(id, data);
    }
  }

  return userItems;
}

// ============================================================================
// Camera Pipeline Integration
// ============================================================================

export async function cacheCaptureSession(
  session: CachedCaptureSession,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'capture_session',
    session.id,
    session,
    { priority: 8 }
  );
}

export async function cacheRawCapture(
  capture: CachedRawCapture,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'raw_capture',
    capture.id,
    capture,
    { priority: 6 }
  );
}

export async function cacheProcessedCapture(
  capture: CachedProcessedCapture,
  userId: string
): Promise<string> {
  const manager = getStorageManager();
  return await manager.set(
    'processed_capture',
    capture.id,
    capture,
    { priority: 6 }
  );
}

export async function getCapturesBySession(
  sessionId: string,
  entityType: 'raw_capture' | 'processed_capture'
): Promise<Map<string, any>> {
  const manager = getStorageManager();
  const allCaptures = await manager.getAllByType(entityType);
  const sessionCaptures = new Map<string, any>();

  for (const [id, data] of allCaptures) {
    const capture = data as any;
    if (capture.capture_session_id === sessionId) {
      sessionCaptures.set(id, data);
    }
  }

  return sessionCaptures;
}

// ============================================================================
// Dashboard Integration
// ============================================================================

export async function getDashboardCacheMetrics(): Promise<{
  totalEntities: number;
  totalSize: number;
  cacheHitRate: number;
  pendingSyncs: number;
  storageStatus: 'healthy' | 'warning' | 'critical';
}> {
  const manager = getStorageManager();
  const stats = await manager.getStats();
  const health = await manager.getHealth();

  return {
    totalEntities: stats.total_entities,
    totalSize: stats.total_size_bytes,
    cacheHitRate: stats.cache_hit_rate,
    pendingSyncs: stats.pending_sync,
    storageStatus: health.status as any,
  };
}

export async function getDashboardStorageBreakdown(): Promise<
  Record<StorageEntityType, { count: number; size: number }>
> {
  const manager = getStorageManager();
  const stats = await manager.getStats();

  const breakdown: Record<string, any> = {};

  for (const [entityType, count] of Object.entries(stats.entities_by_type)) {
    const size = stats.size_by_type[entityType] || 0;
    breakdown[entityType] = { count, size };
  }

  return breakdown as Record<StorageEntityType, { count: number; size: number }>;
}

// ============================================================================
// Telemetry Tracking
// ============================================================================

export async function recordStorageOperation(
  operationType: 'read' | 'write' | 'delete',
  entityType: StorageEntityType,
  duration: number,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const jobManager = getBackgroundJobManager();

    jobManager.setTelemetryCallback((event) => {
      // Forward to telemetry system if available
      if ((window as any).telemetry?.recordEvent) {
        (window as any).telemetry.recordEvent(event);
      }
    });

    const telemetryEvent: CachedTelemetryEvent = {
      event_id: crypto.randomUUID(),
      user_id: undefined,
      category: 'storage',
      event_name: `storage_${operationType}`,
      severity: success ? 'info' : 'error',
      timestamp: new Date().toISOString(),
      data: {
        entity_type: entityType,
        duration_ms: duration,
        success,
        error,
      },
      version: 1,
      created_at: new Date().toISOString(),
    };

    await cacheTelemetryEvent(telemetryEvent);
  } catch (error) {
    console.error('Failed to record storage operation:', error);
  }
}

export async function recordCacheHitMiss(
  entityType: StorageEntityType,
  isHit: boolean
): Promise<void> {
  try {
    const jobManager = getBackgroundJobManager();

    const telemetryEvent: CachedTelemetryEvent = {
      event_id: crypto.randomUUID(),
      user_id: undefined,
      category: 'cache',
      event_name: isHit ? 'cache_hit' : 'cache_miss',
      severity: 'debug',
      timestamp: new Date().toISOString(),
      data: {
        entity_type: entityType,
      },
      version: 1,
      created_at: new Date().toISOString(),
    };

    await cacheTelemetryEvent(telemetryEvent);
  } catch (error) {
    console.error('Failed to record cache hit/miss:', error);
  }
}

// ============================================================================
// Utilities
// ============================================================================

export async function getSyncReadyItems(
  userId: string,
  limit: number = 50
): Promise<Array<{ type: StorageEntityType; id: string; data: any }>> {
  const manager = getStorageManager();
  const results: Array<{ type: StorageEntityType; id: string; data: any }> = [];

  const entityTypes: StorageEntityType[] = [
    'field_session',
    'find_log',
    'specimen',
    'capture_session',
    'raw_capture',
    'processed_capture',
  ];

  for (const entityType of entityTypes) {
    if (results.length >= limit) break;

    const items = await manager.getAllByType(entityType);
    for (const [id, data] of items) {
      if (results.length >= limit) break;

      const item = data as any;
      if (item.user_id === userId) {
        results.push({ type: entityType, id, data: item });
      }
    }
  }

  return results;
}

export async function clearUserCache(userId: string): Promise<number> {
  const manager = getStorageManager();
  const entityTypes: StorageEntityType[] = [
    'field_session',
    'find_log',
    'specimen',
    'capture_session',
    'raw_capture',
    'processed_capture',
    'storage_location',
    'collection_group',
    'tag',
    'analytics_cache',
  ];

  let clearedCount = 0;

  for (const entityType of entityTypes) {
    const items = await manager.getAllByType(entityType);

    for (const [id, data] of items) {
      const item = data as any;
      if (item.user_id === userId) {
        await manager.delete(entityType, id);
        clearedCount++;
      }
    }
  }

  return clearedCount;
}
