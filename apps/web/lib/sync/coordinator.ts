/**
 * Sync Coordinator - Client-Side Sync Engine
 * 
 * Handles:
 * - Offline-first batching
 * - Exponential backoff
 * - Retry logic
 * - Dependency resolution
 * - Conflict detection
 * - Integrity verification
 */

import { openDB, type IDBPDatabase } from 'idb';
import {
  BaseSyncOperation,
  SyncBatch,
  SyncState,
  SyncStatus,
  SyncPriority,
  SyncEntityType,
  SyncOperationType,
  SyncDirection,
  BaseSyncOperationSchema,
  SyncBatchSchema,
  computeDelta,
  computeChecksum,
  calculateNextRetryTime,
  BackoffConfig,
  getDependencies,
  getSyncPriority,
  generateIdempotencyKey,
  isReplayedOperation,
  PRIORITY_VALUES,
} from '@rockhounding/shared';

// ============================================================================
// IndexedDB Schema
// ============================================================================

interface SyncDB {
  operations: {
    key: string; // sync_id
    value: BaseSyncOperation & {
      enqueued_at: string;
      last_attempt_at: string | null;
    };
    indexes: {
      'by-status': string;
      'by-priority': number;
      'by-entity': string;
      'by-retry': string;
    };
  };
  batches: {
    key: string; // batch_id
    value: SyncBatch & {
      sent: boolean;
      sent_at: string | null;
    };
    indexes: {
      'by-sent': boolean;
    };
  };
  state: {
    key: 'sync_state';
    value: SyncState;
  };
  idempotency: {
    key: string; // idempotency_key
    value: {
      sync_id: string;
      processed_at: string;
      expires_at: string;
    };
  };
}

// ============================================================================
// Sync Coordinator Configuration
// ============================================================================

export interface SyncCoordinatorConfig {
  // API endpoint
  api_endpoint: string;
  
  // Batching
  batch_size: number;
  batch_timeout_ms: number;
  
  // Retry configuration
  backoff: BackoffConfig;
  max_retries: number;
  
  // Offline behavior
  max_queue_size: number;
  persist_queue: boolean;
  queue_ttl_ms: number;
  
  // Network detection
  enable_network_detection: boolean;
  network_check_interval_ms: number;
  
  // Sync intervals
  auto_sync_interval_ms: number;
  enable_auto_sync: boolean;
  
  // Conflict resolution
  default_conflict_strategy: 'client_wins' | 'server_wins' | 'manual';
  
  // Telemetry
  enable_telemetry: boolean;
}

const DEFAULT_CONFIG: SyncCoordinatorConfig = {
  api_endpoint: '/api/sync',
  batch_size: 50,
  batch_timeout_ms: 5000,
  backoff: {
    initial_delay_ms: 1000,
    max_delay_ms: 60000,
    multiplier: 2,
    jitter: true,
  },
  max_retries: 5,
  max_queue_size: 10000,
  persist_queue: true,
  queue_ttl_ms: 7 * 24 * 60 * 60 * 1000, // 7 days
  enable_network_detection: true,
  network_check_interval_ms: 30000,
  auto_sync_interval_ms: 60000,
  enable_auto_sync: true,
  default_conflict_strategy: 'client_wins' as const,
  enable_telemetry: true,
};

// ============================================================================
// Sync Coordinator
// ============================================================================

export class SyncCoordinator {
  private config: SyncCoordinatorConfig;
  private db: IDBPDatabase<SyncDB> | null = null;
  private userId: string | null = null;
  private deviceId: string;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private networkCheckTimer: NodeJS.Timeout | null = null;
  private processedKeys: Set<string> = new Set();
  
  // Metrics
  private metrics = {
    queuedOperations: 0,
    syncedOperations: 0,
    failedOperations: 0,
    conflictedOperations: 0,
    lastSyncAt: null as string | null,
    lastError: null as string | null,
  };

  constructor(config: Partial<SyncCoordinatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deviceId = this.getOrCreateDeviceId();
    
    this.initDB();
    if (this.config.enable_network_detection) {
      this.setupNetworkListeners();
    }
    if (this.config.enable_auto_sync) {
      this.startAutoSync();
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private async initDB(): Promise<void> {
    try {
      this.db = await openDB<SyncDB>('rockhound-sync', 1, {
        upgrade(db) {
          // Operations store
          const operationsStore = db.createObjectStore('operations', {
            keyPath: 'sync_id',
          });
          operationsStore.createIndex('by-status', 'status');
          operationsStore.createIndex('by-priority', 'priority');
          operationsStore.createIndex('by-entity', ['entity_type', 'entity_id']);
          operationsStore.createIndex('by-retry', ['status', 'next_retry_at']);

          // Batches store
          const batchesStore = db.createObjectStore('batches', {
            keyPath: 'batch_id',
          });
          batchesStore.createIndex('by-sent', 'sent');

          // State store
          db.createObjectStore('state', { keyPath: 'user_id' });

          // Idempotency store
          db.createObjectStore('idempotency', { keyPath: 'idempotency_key' });
        },
      });

      // Load queued operations
      await this.loadQueuedOperations();
    } catch (error) {
      console.error('[SyncCoordinator] Failed to initialize IndexedDB:', error);
    }
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('rockhound_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('rockhound_device_id', deviceId);
    }
    return deviceId;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[SyncCoordinator] Network online');
      this.isOnline = true;
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncCoordinator] Network offline');
      this.isOnline = false;
    });

    this.isOnline = navigator.onLine;

    // Periodic network check
    this.networkCheckTimer = setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (!wasOnline && this.isOnline) {
        console.log('[SyncCoordinator] Network reconnected');
        this.sync();
      }
    }, this.config.network_check_interval_ms);
  }

  private startAutoSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, this.config.auto_sync_interval_ms);
  }

  private async loadQueuedOperations(): Promise<void> {
    if (!this.db) return;

    try {
      const operations = await this.db.getAll('operations');
      
      // Remove expired operations
      const now = Date.now();
      for (const op of operations) {
        const age = now - new Date(op.enqueued_at).getTime();
        if (age > this.config.queue_ttl_ms) {
          await this.db.delete('operations', op.sync_id);
        }
      }

      // Update metrics
      const validOperations = await this.db.getAll('operations');
      this.metrics.queuedOperations = validOperations.length;

      console.log(`[SyncCoordinator] Loaded ${validOperations.length} queued operations`);
    } catch (error) {
      console.error('[SyncCoordinator] Failed to load queued operations:', error);
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async enqueue<T extends Record<string, any>>(
    entityType: SyncEntityType,
    entityId: string,
    operationType: SyncOperationType,
    original: T | null,
    modified: T,
    priority?: SyncPriority
  ): Promise<string> {
    if (!this.userId) {
      throw new Error('[SyncCoordinator] User ID not set');
    }

    // Compute delta or use full entity
    let delta: Partial<T> | null = null;
    let fullEntity: T | null = null;

    if (operationType === 'create') {
      fullEntity = modified;
    } else if (operationType === 'update' && original) {
      const deltaComputation = computeDelta(original, modified);
      delta = deltaComputation.delta;
    } else {
      fullEntity = modified;
    }

    // Determine priority
    // TODO: getSyncPriority seems to have overloading issues, using workaround
    const finalPriority: SyncPriority = priority || ('high' as SyncPriority);

    // Get dependencies
    const dependencies = getDependencies(entityType, entityId);

    // Create sync operation
    const operation: BaseSyncOperation = {
      sync_id: crypto.randomUUID(),
      user_id: this.userId,
      device_id: this.deviceId,
      entity_type: entityType,
      entity_id: entityId,
      operation_type: operationType,
      priority: finalPriority,
      direction: 'outbound',
      status: 'pending',
      client_version: modified.version || 0,
      server_version: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: null,
      delta: delta as any,
      full_entity: fullEntity as any,
      depends_on: [],
      blocks: [],
      retry_count: 0,
      max_retries: this.config.max_retries,
      next_retry_at: null,
      error_message: null,
      error_code: null,
      checksum: computeChecksum(modified),
    };

    // Validate
    const validation = BaseSyncOperationSchema.safeParse(operation);
    if (!validation.success) {
      throw new Error(`[SyncCoordinator] Invalid operation: ${validation.error.message}`);
    }

    // Check idempotency
    const idempotencyKey = generateIdempotencyKey(operation);
    if (this.processedKeys.has(idempotencyKey)) {
      console.log('[SyncCoordinator] Duplicate operation detected, skipping');
      return operation.sync_id;
    }

    // Persist to IndexedDB
    if (this.db && this.config.persist_queue) {
      await this.db.put('operations', {
        ...operation,
        enqueued_at: new Date().toISOString(),
        last_attempt_at: null,
      });
    }

    this.metrics.queuedOperations++;

    // Trigger sync if online
    if (this.isOnline && !this.isSyncing) {
      // Use timeout to allow batching
      setTimeout(() => this.sync(), 100);
    }

    return operation.sync_id;
  }

  async sync(): Promise<void> {
    if (this.isSyncing || !this.isOnline || !this.db) {
      return;
    }

    this.isSyncing = true;

    try {
      // Get pending operations
      const pending = await this.getPendingOperations();
      
      if (pending.length === 0) {
        console.log('[SyncCoordinator] No pending operations');
        return;
      }

      // Sort by priority and dependencies
      const sorted = this.sortByDependencies(pending);

      // Create batches
      const batches = this.createBatches(sorted);

      console.log(`[SyncCoordinator] Syncing ${sorted.length} operations in ${batches.length} batches`);

      // Process each batch
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      this.metrics.lastSyncAt = new Date().toISOString();
      this.metrics.lastError = null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncCoordinator] Sync failed:', errorMessage);
      this.metrics.lastError = errorMessage;
      
      if (this.config.enable_telemetry) {
        this.recordTelemetry('sync_error', { error: errorMessage });
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async cancel(syncId: string): Promise<void> {
    if (!this.db) return;

    const operation = await this.db.get('operations', syncId);
    if (operation && operation.status === 'pending') {
      await this.db.put('operations', {
        ...operation,
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      });
      
      this.metrics.queuedOperations--;
    }
  }

  async retry(syncId: string): Promise<void> {
    if (!this.db) return;

    const operation = await this.db.get('operations', syncId);
    if (operation && operation.status === 'error') {
      await this.db.put('operations', {
        ...operation,
        status: 'pending',
        retry_count: 0,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      });
      
      this.sync();
    }
  }

  async getState(): Promise<SyncState> {
    if (!this.db || !this.userId) {
      throw new Error('[SyncCoordinator] Not initialized');
    }

    const operations = await this.db.getAll('operations');
    
    const pendingCount = operations.filter(op => op.status === 'pending').length;
    const syncingCount = operations.filter(op => op.status === 'syncing').length;
    const conflictCount = operations.filter(op => op.status === 'conflict').length;
    const errorCount = operations.filter(op => op.status === 'error').length;

    return {
      user_id: this.userId,
      device_id: this.deviceId,
      is_syncing: this.isSyncing,
      is_online: this.isOnline,
      pending_count: pendingCount,
      syncing_count: syncingCount,
      conflict_count: conflictCount,
      error_count: errorCount,
      last_sync_at: this.metrics.lastSyncAt,
      last_successful_sync_at: this.metrics.lastSyncAt,
      last_error: this.metrics.lastError,
      current_batch_id: null,
      operations_completed: this.metrics.syncedOperations,
      operations_total: this.metrics.queuedOperations + this.metrics.syncedOperations,
      connection_quality: this.getConnectionQuality(),
      updated_at: new Date().toISOString(),
    };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async destroy(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    if (this.networkCheckTimer) {
      clearInterval(this.networkCheckTimer);
    }
    
    // Final sync attempt
    if (this.isOnline) {
      await this.sync();
    }

    if (this.db) {
      this.db.close();
    }
  }

  // ==========================================================================
  // Internal Methods
  // ==========================================================================

  private async getPendingOperations(): Promise<BaseSyncOperation[]> {
    if (!this.db) return [];

    const operations = await this.db.getAll('operations');
    
    // Get operations that are pending or ready to retry
    const now = new Date().toISOString();
    
    return operations.filter(op => {
      if (op.status === 'pending') return true;
      if (op.status === 'retry' && op.next_retry_at && op.next_retry_at <= now) {
        return true;
      }
      return false;
    });
  }

  private sortByDependencies(operations: BaseSyncOperation[]): BaseSyncOperation[] {
    // Sort by priority first
    const sorted = [...operations].sort((a, b) => {
      const priorityDiff = PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // TODO: Implement full dependency graph resolution
    // For now, simple priority-based sorting
    
    return sorted;
  }

  private createBatches(operations: BaseSyncOperation[]): SyncBatch[] {
    const batches: SyncBatch[] = [];
    
    for (let i = 0; i < operations.length; i += this.config.batch_size) {
      const batchOps = operations.slice(i, i + this.config.batch_size);
      
      if (batchOps.length === 0) continue; // Skip empty batches
      
      const batch: SyncBatch = {
        batch_id: crypto.randomUUID(),
        user_id: this.userId!,
        device_id: this.deviceId,
        direction: 'outbound',
        priority: batchOps[0]!.priority, // Use highest priority
        operations: batchOps,
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        total_operations: batchOps.length,
        successful_operations: 0,
        failed_operations: 0,
        conflicted_operations: 0,
        batch_checksum: computeChecksum(batchOps),
      };
      
      batches.push(batch);
    }
    
    return batches;
  }

  private async processBatch(batch: SyncBatch): Promise<void> {
    batch.started_at = new Date().toISOString();

    try {
      // Mark operations as syncing
      if (this.db) {
        for (const op of batch.operations) {
          await this.db.put('operations', {
            ...op,
            status: 'syncing',
            last_attempt_at: new Date().toISOString(),
            enqueued_at: op.created_at,
          });
        }
      }

      // Send to server
      const response = await fetch(`${this.config.api_endpoint}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`Batch sync failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Process results
      await this.processBatchResults(batch, result);

      batch.completed_at = new Date().toISOString();

      if (this.config.enable_telemetry) {
        this.recordTelemetry('sync_batch_success', {
          batch_id: batch.batch_id,
          operations: batch.total_operations,
          duration_ms: new Date(batch.completed_at).getTime() - new Date(batch.started_at!).getTime(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncCoordinator] Batch processing failed:', errorMessage);
      
      // Mark operations for retry
      await this.handleBatchError(batch, errorMessage);
      
      if (this.config.enable_telemetry) {
        this.recordTelemetry('sync_batch_error', {
          batch_id: batch.batch_id,
          error: errorMessage,
        });
      }
    }
  }

  private async processBatchResults(batch: SyncBatch, result: any): Promise<void> {
    if (!this.db) return;

    for (const opResult of result.results || []) {
      const operation = batch.operations.find(op => op.sync_id === opResult.sync_id);
      if (!operation) continue;

      if (opResult.status === 'success') {
        // Mark as successful and remove from queue
        await this.db.delete('operations', operation.sync_id);
        
        // Add to idempotency cache
        const idempotencyKey = generateIdempotencyKey(operation);
        await this.db.put('idempotency', {
          idempotency_key: idempotencyKey,
          sync_id: operation.sync_id,
          processed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        this.processedKeys.add(idempotencyKey);
        
        batch.successful_operations++;
        this.metrics.syncedOperations++;
        this.metrics.queuedOperations--;
      } else if (opResult.status === 'conflict') {
        // Mark as conflict
        await this.db.put('operations', {
          ...operation,
          status: 'conflict',
          updated_at: new Date().toISOString(),
          enqueued_at: operation.created_at,
          last_attempt_at: new Date().toISOString(),
        });
        
        batch.conflicted_operations++;
        this.metrics.conflictedOperations++;
      } else {
        // Mark as error with retry
        const nextRetry = calculateNextRetryTime(operation.retry_count, this.config.backoff);
        
        await this.db.put('operations', {
          ...operation,
          status: operation.retry_count < operation.max_retries ? 'retry' : 'error',
          retry_count: operation.retry_count + 1,
          next_retry_at: nextRetry.toISOString(),
          error_message: opResult.error_message,
          error_code: opResult.error_code,
          updated_at: new Date().toISOString(),
          enqueued_at: operation.created_at,
          last_attempt_at: new Date().toISOString(),
        });
        
        batch.failed_operations++;
        this.metrics.failedOperations++;
      }
    }
  }

  private async handleBatchError(batch: SyncBatch, errorMessage: string): Promise<void> {
    if (!this.db) return;

    // Mark all operations in batch for retry
    for (const operation of batch.operations) {
      const nextRetry = calculateNextRetryTime(operation.retry_count, this.config.backoff);
      
      await this.db.put('operations', {
        ...operation,
        status: operation.retry_count < operation.max_retries ? 'retry' : 'error',
        retry_count: operation.retry_count + 1,
        next_retry_at: nextRetry.toISOString(),
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
        enqueued_at: operation.created_at,
        last_attempt_at: new Date().toISOString(),
      });
      
      batch.failed_operations++;
    }
  }

  private getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.isOnline) return 'offline';
    
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) return 'good';
    
    const effectiveType = connection.effectiveType;
    
    switch (effectiveType) {
      case '4g': return 'excellent';
      case '3g': return 'good';
      case '2g': return 'fair';
      case 'slow-2g': return 'poor';
      default: return 'good';
    }
  }

  private recordTelemetry(event: string, data: any): void {
    // Integration with telemetry system
    try {
      if (typeof window !== 'undefined' && (window as any).telemetry) {
        (window as any).telemetry.recordEvent({
          category: 'sync',
          event_name: event,
          severity: 'info',
          ...data,
        });
      }
    } catch (error) {
      console.error('[SyncCoordinator] Failed to record telemetry:', error);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncCoordinator: SyncCoordinator | null = null;

export function initSync(config?: Partial<SyncCoordinatorConfig>): SyncCoordinator {
  if (!syncCoordinator) {
    syncCoordinator = new SyncCoordinator(config);
  }
  return syncCoordinator;
}

export function getSync(): SyncCoordinator {
  if (!syncCoordinator) {
    throw new Error('[SyncCoordinator] Not initialized. Call initSync() first.');
  }
  return syncCoordinator;
}
