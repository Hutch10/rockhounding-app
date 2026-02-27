/**
 * Sync Engine - Data Model & Protocol
 * 
 * Complete sync protocol with:
 * - Deterministic sync operations
 * - Conflict resolution rules
 * - Priority-based queues
 * - Delta computation
 * - Multi-entity dependency graph
 */

import { z } from 'zod';

// ============================================================================
// Sync Entity Types
// ============================================================================

export const SyncEntityType = z.enum([
  'field_session',
  'find_log',
  'specimen',
  'capture_session',
  'raw_capture',
  'processed_capture',
  'storage_location',
  'collection_group',
  'tag',
  'export_job',
  'analytics_cache',
]);

export type SyncEntityType = z.infer<typeof SyncEntityType>;

// ============================================================================
// Sync Operation Types
// ============================================================================

export const SyncOperationType = z.enum([
  'create',
  'update',
  'delete',
  'soft_delete',
]);

export type SyncOperationType = z.infer<typeof SyncOperationType>;

// ============================================================================
// Sync Status
// ============================================================================

export const SyncStatus = z.enum([
  'pending',      // Queued, waiting to sync
  'syncing',      // Currently syncing
  'success',      // Successfully synced
  'conflict',     // Conflict detected, needs resolution
  'error',        // Failed to sync
  'retry',        // Waiting for retry
  'cancelled',    // Cancelled by user
]);

export type SyncStatus = z.infer<typeof SyncStatus>;

// ============================================================================
// Conflict Resolution Strategy
// ============================================================================

export const ConflictResolutionStrategy = z.enum([
  'client_wins',      // Client version overwrites server
  'server_wins',      // Server version overwrites client
  'manual',           // Require user intervention
  'merge',            // Attempt automatic merge
  'latest_timestamp', // Use most recent timestamp
  'field_level',      // Merge at field level
]);

export type ConflictResolutionStrategy = z.infer<typeof ConflictResolutionStrategy>;

// ============================================================================
// Sync Priority
// ============================================================================

export const SyncPriority = z.enum([
  'critical',   // 0 - User-initiated, blocking operations
  'high',       // 1 - Field session data, captures
  'normal',     // 2 - Regular CRUD operations
  'low',        // 3 - Analytics, non-critical updates
  'background', // 4 - Cleanup, maintenance
]);

export type SyncPriority = z.infer<typeof SyncPriority>;

export const PRIORITY_VALUES: Record<SyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
};

// ============================================================================
// Sync Direction
// ============================================================================

export const SyncDirection = z.enum([
  'outbound',     // Client → Server
  'inbound',      // Server → Client
  'bidirectional', // Both directions
]);

export type SyncDirection = z.infer<typeof SyncDirection>;

// ============================================================================
// Base Sync Operation
// ============================================================================

export const BaseSyncOperationSchema = z.object({
  sync_id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().uuid(),
  
  // Entity information
  entity_type: SyncEntityType,
  entity_id: z.string().uuid(),
  operation_type: SyncOperationType,
  
  // Sync metadata
  priority: SyncPriority,
  direction: SyncDirection,
  status: SyncStatus,
  
  // Versioning
  client_version: z.number().int().nonnegative(),
  server_version: z.number().int().nonnegative().nullable(),
  
  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  synced_at: z.string().datetime().nullable(),
  
  // Data payload
  delta: z.record(z.unknown()).nullable(), // Changed fields only
  full_entity: z.record(z.unknown()).nullable(), // Complete entity (for creates)
  
  // Dependencies
  depends_on: z.array(z.string().uuid()).default([]),
  blocks: z.array(z.string().uuid()).default([]),
  
  // Retry information
  retry_count: z.number().int().nonnegative().default(0),
  max_retries: z.number().int().positive().default(5),
  next_retry_at: z.string().datetime().nullable(),
  
  // Error tracking
  error_message: z.string().max(1000).nullable(),
  error_code: z.string().max(50).nullable(),
  
  // Integrity
  checksum: z.string().max(64).nullable(),
});

export type BaseSyncOperation = z.infer<typeof BaseSyncOperationSchema>;

// ============================================================================
// Conflict Information
// ============================================================================

export const SyncConflictSchema = z.object({
  conflict_id: z.string().uuid(),
  sync_id: z.string().uuid(),
  
  // Conflict details
  entity_type: SyncEntityType,
  entity_id: z.string().uuid(),
  
  // Versions
  client_version: z.number().int().nonnegative(),
  server_version: z.number().int().nonnegative(),
  
  // Conflicting data
  client_data: z.record(z.unknown()),
  server_data: z.record(z.unknown()),
  conflicting_fields: z.array(z.string()),
  
  // Resolution
  resolution_strategy: ConflictResolutionStrategy,
  resolved: z.boolean().default(false),
  resolved_at: z.string().datetime().nullable(),
  resolved_by: z.string().uuid().nullable(),
  resolution_data: z.record(z.unknown()).nullable(),
  
  // Timestamps
  detected_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type SyncConflict = z.infer<typeof SyncConflictSchema>;

// ============================================================================
// Sync Batch
// ============================================================================

export const SyncBatchSchema = z.object({
  batch_id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().uuid(),
  
  // Batch metadata
  direction: SyncDirection,
  priority: SyncPriority,
  
  // Operations in batch
  operations: z.array(BaseSyncOperationSchema).min(1).max(100),
  
  // Timestamps
  created_at: z.string().datetime(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  
  // Status
  total_operations: z.number().int().positive(),
  successful_operations: z.number().int().nonnegative().default(0),
  failed_operations: z.number().int().nonnegative().default(0),
  conflicted_operations: z.number().int().nonnegative().default(0),
  
  // Integrity
  batch_checksum: z.string().max(64).nullable(),
});

export type SyncBatch = z.infer<typeof SyncBatchSchema>;

// ============================================================================
// Sync State
// ============================================================================

export const SyncStateSchema = z.object({
  user_id: z.string().uuid(),
  device_id: z.string().uuid(),
  
  // Current sync status
  is_syncing: z.boolean().default(false),
  is_online: z.boolean().default(true),
  
  // Queue statistics
  pending_count: z.number().int().nonnegative().default(0),
  syncing_count: z.number().int().nonnegative().default(0),
  conflict_count: z.number().int().nonnegative().default(0),
  error_count: z.number().int().nonnegative().default(0),
  
  // Last sync info
  last_sync_at: z.string().datetime().nullable(),
  last_successful_sync_at: z.string().datetime().nullable(),
  last_error: z.string().max(500).nullable(),
  
  // Sync progress
  current_batch_id: z.string().uuid().nullable(),
  operations_completed: z.number().int().nonnegative().default(0),
  operations_total: z.number().int().nonnegative().default(0),
  
  // Network status
  connection_quality: z.enum(['excellent', 'good', 'fair', 'poor', 'offline']),
  
  // Timestamps
  updated_at: z.string().datetime(),
});

export type SyncState = z.infer<typeof SyncStateSchema>;

// ============================================================================
// Entity Dependency Graph
// ============================================================================

export const EntityDependencySchema = z.object({
  entity_type: SyncEntityType,
  entity_id: z.string().uuid(),
  
  // Parent dependencies (must sync before this)
  parent_dependencies: z.array(z.object({
    entity_type: SyncEntityType,
    entity_id: z.string().uuid(),
  })),
  
  // Child dependencies (must sync after this)
  child_dependencies: z.array(z.object({
    entity_type: SyncEntityType,
    entity_id: z.string().uuid(),
  })),
  
  // Sync requirements
  requires_online: z.boolean().default(true),
  can_batch: z.boolean().default(true),
  priority: SyncPriority,
});

export type EntityDependency = z.infer<typeof EntityDependencySchema>;

// ============================================================================
// Delta Computation
// ============================================================================

export interface DeltaComputation<T = any> {
  original: T;
  modified: T;
  delta: Partial<T>;
  changed_fields: string[];
  checksum_original: string;
  checksum_modified: string;
}

export function computeDelta<T extends Record<string, any>>(
  original: T,
  modified: T
): DeltaComputation<T> {
  const delta: Partial<T> = {};
  const changed_fields: string[] = [];

  for (const key in modified) {
    if (JSON.stringify(original[key]) !== JSON.stringify(modified[key])) {
      delta[key] = modified[key];
      changed_fields.push(key);
    }
  }

  return {
    original,
    modified,
    delta,
    changed_fields,
    checksum_original: computeChecksum(original),
    checksum_modified: computeChecksum(modified),
  };
}

export function applyDelta<T extends Record<string, any>>(
  original: T,
  delta: Partial<T>
): T {
  return { ...original, ...delta };
}

export function computeChecksum(data: any): string {
  // Simple checksum using JSON string
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export interface ConflictResolution<T = any> {
  strategy: ConflictResolutionStrategy;
  client_data: T;
  server_data: T;
  resolved_data: T;
  conflicting_fields: string[];
  resolution_notes?: string;
}

export function detectConflicts<T extends Record<string, any>>(
  client: T,
  server: T,
  clientVersion: number,
  serverVersion: number
): string[] {
  const conflicts: string[] = [];

  // Version mismatch indicates potential conflict
  if (clientVersion !== serverVersion) {
    for (const key in client) {
      if (key in server && JSON.stringify(client[key]) !== JSON.stringify(server[key])) {
        conflicts.push(key);
      }
    }
  }

  return conflicts;
}

export function resolveConflict<T extends Record<string, any>>(
  client: T,
  server: T,
  strategy: ConflictResolutionStrategy,
  conflictingFields: string[]
): ConflictResolution<T> {
  let resolved_data: T;
  let resolution_notes: string;

  switch (strategy) {
    case 'client_wins':
      resolved_data = { ...client };
      resolution_notes = 'Client version selected';
      break;

    case 'server_wins':
      resolved_data = { ...server };
      resolution_notes = 'Server version selected';
      break;

    case 'latest_timestamp':
      const clientTime = new Date(client.updated_at || 0).getTime();
      const serverTime = new Date(server.updated_at || 0).getTime();
      resolved_data = clientTime > serverTime ? { ...client } : { ...server };
      resolution_notes = `Latest timestamp: ${clientTime > serverTime ? 'client' : 'server'}`;
      break;

    case 'field_level':
      const mergedData: Record<string, any> = { ...server };
      for (const field of conflictingFields) {
        const clientTime = new Date(client[`${field}_updated_at`] || client.updated_at || 0).getTime();
        const serverTime = new Date(server[`${field}_updated_at`] || server.updated_at || 0).getTime();
        if (clientTime > serverTime) {
          mergedData[field] = client[field];
        }
      }
      resolved_data = mergedData as T;
      resolution_notes = 'Field-level merge based on timestamps';
      break;

    case 'merge':
      // Attempt to merge non-conflicting fields
      resolved_data = { ...server, ...client };
      resolution_notes = 'Automatic merge attempted';
      break;

    case 'manual':
      // Leave unresolved for manual intervention
      resolved_data = { ...server };
      resolution_notes = 'Requires manual resolution';
      break;

    default:
      resolved_data = { ...server };
      resolution_notes = 'Default: server wins';
  }

  return {
    strategy,
    client_data: client,
    server_data: server,
    resolved_data,
    conflicting_fields: conflictingFields,
    resolution_notes,
  };
}

// ============================================================================
// Exponential Backoff
// ============================================================================

export const BackoffConfigSchema = z.object({
  initial_delay_ms: z.number().int().positive().default(1000),
  max_delay_ms: z.number().int().positive().default(60000),
  multiplier: z.number().positive().default(2),
  jitter: z.boolean().default(true),
});

export type BackoffConfig = z.infer<typeof BackoffConfigSchema>;

export function calculateBackoff(
  retryCount: number,
  config: BackoffConfig = {
    initial_delay_ms: 1000,
    max_delay_ms: 60000,
    multiplier: 2,
    jitter: true,
  }
): number {
  const delay = Math.min(
    config.initial_delay_ms * Math.pow(config.multiplier, retryCount),
    config.max_delay_ms
  );

  if (config.jitter) {
    // Add random jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  return delay;
}

export function calculateNextRetryTime(
  retryCount: number,
  config?: BackoffConfig
): Date {
  const delay = calculateBackoff(retryCount, config);
  return new Date(Date.now() + delay);
}

// ============================================================================
// Sync Queue Management
// ============================================================================

export interface SyncQueueEntry extends BaseSyncOperation {
  enqueued_at: string;
  attempts: number;
  last_attempt_at: string | null;
}

export function getSyncPriority(entityType: SyncEntityType, operationType: SyncOperationType): SyncPriority {
  // Critical: User-initiated blocking operations
  if (operationType === 'delete') {
    return 'critical';
  }

  // High: Real-time field data
  if (entityType === 'field_session' || entityType === 'find_log' || entityType === 'capture_session') {
    return 'high';
  }

  // Normal: Regular CRUD
  if (entityType === 'specimen' || entityType === 'storage_location' || entityType === 'tag') {
    return 'normal';
  }

  // Low: Analytics and derived data
  if (entityType === 'analytics_cache' || entityType === 'export_job') {
    return 'low';
  }

  return 'normal';
}

export function getDependencies(entityType: SyncEntityType, entityId: string): EntityDependency {
  // Define dependency rules
  const dependencies: Record<SyncEntityType, Partial<EntityDependency>> = {
    field_session: {
      parent_dependencies: [],
      child_dependencies: [
        { entity_type: 'find_log', entity_id: '*' },
        { entity_type: 'capture_session', entity_id: '*' },
      ],
      priority: 'high',
    },
    find_log: {
      parent_dependencies: [
        { entity_type: 'field_session', entity_id: '*' },
      ],
      child_dependencies: [
        { entity_type: 'specimen', entity_id: '*' },
      ],
      priority: 'high',
    },
    specimen: {
      parent_dependencies: [],
      child_dependencies: [],
      priority: 'normal',
    },
    capture_session: {
      parent_dependencies: [
        { entity_type: 'field_session', entity_id: '*' },
      ],
      child_dependencies: [
        { entity_type: 'raw_capture', entity_id: '*' },
      ],
      priority: 'high',
    },
    raw_capture: {
      parent_dependencies: [
        { entity_type: 'capture_session', entity_id: '*' },
      ],
      child_dependencies: [
        { entity_type: 'processed_capture', entity_id: '*' },
      ],
      priority: 'normal',
    },
    processed_capture: {
      parent_dependencies: [
        { entity_type: 'raw_capture', entity_id: '*' },
      ],
      child_dependencies: [
        { entity_type: 'specimen', entity_id: '*' },
      ],
      priority: 'normal',
    },
    storage_location: {
      parent_dependencies: [],
      child_dependencies: [
        { entity_type: 'specimen', entity_id: '*' },
      ],
      priority: 'normal',
    },
    collection_group: {
      parent_dependencies: [],
      child_dependencies: [],
      priority: 'normal',
    },
    tag: {
      parent_dependencies: [],
      child_dependencies: [],
      priority: 'normal',
    },
    export_job: {
      parent_dependencies: [],
      child_dependencies: [],
      priority: 'low',
      requires_online: true,
      can_batch: false,
    },
    analytics_cache: {
      parent_dependencies: [],
      child_dependencies: [],
      priority: 'background',
      requires_online: false,
      can_batch: true,
    },
  };

  const base = dependencies[entityType] || {};
  
  return {
    entity_type: entityType,
    entity_id: entityId,
    parent_dependencies: base.parent_dependencies || [],
    child_dependencies: base.child_dependencies || [],
    requires_online: base.requires_online ?? true,
    can_batch: base.can_batch ?? true,
    priority: base.priority || 'normal',
  };
}

// ============================================================================
// Sync Metrics
// ============================================================================

export const SyncMetricsSchema = z.object({
  // Counts
  total_operations: z.number().int().nonnegative(),
  successful_operations: z.number().int().nonnegative(),
  failed_operations: z.number().int().nonnegative(),
  conflicted_operations: z.number().int().nonnegative(),
  
  // Timings
  avg_sync_duration_ms: z.number().nonnegative(),
  total_sync_time_ms: z.number().nonnegative(),
  
  // Network
  bytes_uploaded: z.number().int().nonnegative(),
  bytes_downloaded: z.number().int().nonnegative(),
  
  // Errors
  error_rate: z.number().min(0).max(1),
  conflict_rate: z.number().min(0).max(1),
  
  // Timestamps
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
});

export type SyncMetrics = z.infer<typeof SyncMetricsSchema>;

// ============================================================================
// Integrity Verification
// ============================================================================

export interface IntegrityCheck {
  entity_type: SyncEntityType;
  entity_id: string;
  local_checksum: string;
  remote_checksum: string;
  is_valid: boolean;
  discrepancies: string[];
}

export function verifyIntegrity<T extends Record<string, any>>(
  local: T,
  remote: T,
  entityType: SyncEntityType,
  entityId: string
): IntegrityCheck {
  const localChecksum = computeChecksum(local);
  const remoteChecksum = computeChecksum(remote);
  const discrepancies: string[] = [];

  if (localChecksum !== remoteChecksum) {
    for (const key in local) {
      if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
        discrepancies.push(key);
      }
    }
  }

  return {
    entity_type: entityType,
    entity_id: entityId,
    local_checksum: localChecksum,
    remote_checksum: remoteChecksum,
    is_valid: localChecksum === remoteChecksum,
    discrepancies,
  };
}

// ============================================================================
// Replay Safety
// ============================================================================

export interface ReplayProtection {
  operation_id: string;
  idempotency_key: string;
  processed_at: string | null;
  is_duplicate: boolean;
}

export function generateIdempotencyKey(operation: BaseSyncOperation): string {
  return computeChecksum({
    entity_type: operation.entity_type,
    entity_id: operation.entity_id,
    operation_type: operation.operation_type,
    client_version: operation.client_version,
    user_id: operation.user_id,
  });
}

export function isReplayedOperation(
  operation: BaseSyncOperation,
  processedKeys: Set<string>
): boolean {
  const key = generateIdempotencyKey(operation);
  return processedKeys.has(key);
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSyncable(entity: any): boolean {
  return (
    entity &&
    typeof entity === 'object' &&
    'id' in entity &&
    'updated_at' in entity
  );
}

export function requiresSync(
  localVersion: number,
  remoteVersion: number | null
): boolean {
  return remoteVersion === null || localVersion > remoteVersion;
}

export function canRetry(operation: BaseSyncOperation): boolean {
  return operation.retry_count < operation.max_retries &&
         operation.status !== 'success' &&
         operation.status !== 'cancelled';
}
