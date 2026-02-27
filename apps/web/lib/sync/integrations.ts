/**
 * Sync Engine Integration Points
 * 
 * Connects sync engine with all Rockhound subsystems:
 * - Field Sessions
 * - Find Logs
 * - Camera Pipeline
 * - Collection Management
 * - Collection Analytics
 * - Telemetry
 */

import { getSync } from '@/lib/sync/coordinator';
import { SyncEntityType, SyncOperationType } from '@rockhounding/shared';

// ============================================================================
// Field Session Integration
// ============================================================================

export interface FieldSession {
  id: string;
  user_id: string;
  title: string;
  location_name: string;
  coordinates?: { lat: number; lng: number };
  start_time: string;
  end_time?: string;
  status: 'active' | 'paused' | 'completed';
  weather_conditions?: Record<string, any>;
  notes?: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncFieldSession(
  operation: 'create' | 'update' | 'delete',
  original: FieldSession | null,
  modified: FieldSession
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'field_session',
    modified.id,
    operation,
    original,
    modified,
    'high' // Field sessions are high priority
  );
}

export async function syncFieldSessionBatch(
  sessions: Array<{
    operation: SyncOperationType;
    original: FieldSession | null;
    modified: FieldSession;
  }>
): Promise<string[]> {
  const sync = getSync();
  
  return Promise.all(
    sessions.map(({ operation, original, modified }) =>
      sync.enqueue('field_session', modified.id, operation, original, modified, 'high')
    )
  );
}

// ============================================================================
// Find Log Integration
// ============================================================================

export interface FindLog {
  id: string;
  field_session_id: string;
  user_id: string;
  specimen_type: string;
  location_coordinates: { lat: number; lng: number };
  find_time: string;
  quantity: number;
  quality_rating?: number;
  notes?: string;
  photos?: string[];
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncFindLog(
  operation: 'create' | 'update' | 'delete',
  original: FindLog | null,
  modified: FindLog
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'find_log',
    modified.id,
    operation,
    original,
    modified,
    'high' // Find logs are high priority (field data)
  );
}

export async function syncFindLogBatch(
  logs: Array<{
    operation: SyncOperationType;
    original: FindLog | null;
    modified: FindLog;
  }>
): Promise<string[]> {
  const sync = getSync();
  
  return Promise.all(
    logs.map(({ operation, original, modified }) =>
      sync.enqueue('find_log', modified.id, operation, original, modified, 'high')
    )
  );
}

// ============================================================================
// Specimen Integration
// ============================================================================

export interface Specimen {
  id: string;
  user_id: string;
  name: string;
  material_type: string;
  storage_location_id?: string;
  find_log_id?: string;
  acquisition_date?: string;
  description?: string;
  tags?: string[];
  photos?: string[];
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncSpecimen(
  operation: 'create' | 'update' | 'delete',
  original: Specimen | null,
  modified: Specimen
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'specimen',
    modified.id,
    operation,
    original,
    modified,
    'normal' // Normal priority for collection management
  );
}

// ============================================================================
// Camera Pipeline Integration
// ============================================================================

export interface CaptureSession {
  id: string;
  user_id: string;
  field_session_id?: string;
  session_name: string;
  start_time: string;
  end_time?: string;
  camera_settings?: Record<string, any>;
  status: 'active' | 'processing' | 'completed';
  version: number;
  updated_at: string;
  created_at: string;
}

export interface RawCapture {
  id: string;
  capture_session_id: string;
  user_id: string;
  file_path: string;
  file_size_bytes: number;
  capture_time: string;
  camera_metadata?: Record<string, any>;
  location_coordinates?: { lat: number; lng: number };
  version: number;
  updated_at: string;
  created_at: string;
}

export interface ProcessedCapture {
  id: string;
  raw_capture_id: string;
  user_id: string;
  processed_file_path: string;
  processing_pipeline: string;
  processing_metadata?: Record<string, any>;
  quality_score?: number;
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncCaptureSession(
  operation: 'create' | 'update' | 'delete',
  original: CaptureSession | null,
  modified: CaptureSession
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'capture_session',
    modified.id,
    operation,
    original,
    modified,
    'high' // High priority for active field work
  );
}

export async function syncRawCapture(
  operation: 'create' | 'update' | 'delete',
  original: RawCapture | null,
  modified: RawCapture
): Promise<string> {
  const sync = getSync();
  
  // Note: Actual file upload should be handled separately
  // This only syncs metadata
  
  return sync.enqueue(
    'raw_capture',
    modified.id,
    operation,
    original,
    modified,
    'normal'
  );
}

export async function syncProcessedCapture(
  operation: 'create' | 'update' | 'delete',
  original: ProcessedCapture | null,
  modified: ProcessedCapture
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'processed_capture',
    modified.id,
    operation,
    original,
    modified,
    'normal'
  );
}

// ============================================================================
// Collection Management Integration
// ============================================================================

export interface StorageLocation {
  id: string;
  user_id: string;
  name: string;
  location_type: string;
  parent_location_id?: string;
  description?: string;
  capacity?: number;
  current_count?: number;
  version: number;
  updated_at: string;
  created_at: string;
}

export interface CollectionGroup {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  specimen_ids: string[];
  version: number;
  updated_at: string;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  description?: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncStorageLocation(
  operation: 'create' | 'update' | 'delete',
  original: StorageLocation | null,
  modified: StorageLocation
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'storage_location',
    modified.id,
    operation,
    original,
    modified,
    'normal'
  );
}

export async function syncCollectionGroup(
  operation: 'create' | 'update' | 'delete',
  original: CollectionGroup | null,
  modified: CollectionGroup
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'collection_group',
    modified.id,
    operation,
    original,
    modified,
    'normal'
  );
}

export async function syncTag(
  operation: 'create' | 'update' | 'delete',
  original: Tag | null,
  modified: Tag
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'tag',
    modified.id,
    operation,
    original,
    modified,
    'low' // Tags are lower priority
  );
}

// ============================================================================
// Export Job Integration
// ============================================================================

export interface ExportJob {
  id: string;
  user_id: string;
  export_type: string;
  filters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  error_message?: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncExportJob(
  operation: 'create' | 'update' | 'delete',
  original: ExportJob | null,
  modified: ExportJob
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'export_job',
    modified.id,
    operation,
    original,
    modified,
    'low' // Exports are lower priority
  );
}

// ============================================================================
// Analytics Cache Integration
// ============================================================================

export interface AnalyticsCache {
  id: string;
  user_id: string;
  cache_key: string;
  cache_data: Record<string, any>;
  computed_at: string;
  expires_at?: string;
  version: number;
  updated_at: string;
  created_at: string;
}

export async function syncAnalyticsCache(
  operation: 'create' | 'update' | 'delete',
  original: AnalyticsCache | null,
  modified: AnalyticsCache
): Promise<string> {
  const sync = getSync();
  
  return sync.enqueue(
    'analytics_cache',
    modified.id,
    operation,
    original,
    modified,
    'background' // Analytics cache is background priority
  );
}

// ============================================================================
// Telemetry Integration
// ============================================================================

/**
 * Records sync events to telemetry system
 */
export function recordSyncTelemetry(
  eventName: string,
  data: Record<string, any>
): void {
  try {
    if (typeof window !== 'undefined' && (window as any).telemetry) {
      (window as any).telemetry.recordEvent({
        category: 'sync',
        event_name: eventName,
        severity: 'info',
        ...data,
      });
    }
  } catch (error) {
    console.error('[Sync Integration] Failed to record telemetry:', error);
  }
}

/**
 * Tracks sync operation lifecycle
 */
export async function trackSyncOperation<T>(
  entityType: SyncEntityType,
  operation: SyncOperationType,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  recordSyncTelemetry('sync_operation_start', {
    entity_type: entityType,
    operation_type: operation,
  });

  try {
    const result = await fn();
    
    const duration = Date.now() - startTime;
    recordSyncTelemetry('sync_operation_success', {
      entity_type: entityType,
      operation_type: operation,
      duration_ms: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordSyncTelemetry('sync_operation_error', {
      entity_type: entityType,
      operation_type: operation,
      duration_ms: duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Syncs multiple entities across different types in a single batch
 */
export async function syncMixedBatch(
  operations: Array<{
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperationType;
    original: any;
    modified: any;
    priority?: 'critical' | 'high' | 'normal' | 'low' | 'background';
  }>
): Promise<string[]> {
  const sync = getSync();
  
  recordSyncTelemetry('sync_mixed_batch_start', {
    operation_count: operations.length,
    entity_types: [...new Set(operations.map(op => op.entityType))],
  });

  try {
    const syncIds = await Promise.all(
      operations.map(op =>
        sync.enqueue(
          op.entityType,
          op.entityId,
          op.operation,
          op.original,
          op.modified,
          op.priority
        )
      )
    );

    recordSyncTelemetry('sync_mixed_batch_success', {
      operation_count: operations.length,
      sync_ids: syncIds,
    });

    return syncIds;
  } catch (error) {
    recordSyncTelemetry('sync_mixed_batch_error', {
      operation_count: operations.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if an entity has pending sync operations
 */
export async function hasPendingSync(
  entityType: SyncEntityType,
  entityId: string
): Promise<boolean> {
  const sync = getSync();
  const state = await sync.getState();
  
  // This is a simplified check - in production, you'd query the actual queue
  return state.pending_count > 0;
}

/**
 * Gets sync status for a specific entity
 */
export async function getEntitySyncStatus(
  entityType: SyncEntityType,
  entityId: string
): Promise<{
  isPending: boolean;
  isSyncing: boolean;
  hasConflict: boolean;
  hasError: boolean;
  lastSyncAt: string | null;
}> {
  // This would typically query the database
  // For now, returning a basic status
  return {
    isPending: false,
    isSyncing: false,
    hasConflict: false,
    hasError: false,
    lastSyncAt: null,
  };
}

/**
 * Syncs all pending changes for a user
 */
export async function syncAllPending(): Promise<void> {
  const sync = getSync();
  await sync.sync();
  
  recordSyncTelemetry('sync_all_pending', {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clears all sync data (use with caution!)
 */
export async function clearSyncQueue(): Promise<void> {
  // This would clear the sync queue
  // Implementation depends on your requirements
  console.warn('[Sync Integration] clearSyncQueue not implemented');
}
