/**
 * Offline Storage & Caching - Storage Manager
 * 
 * Main storage manager with eviction, TTL, migrations, integrity verification
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  StorageEntityType,
  StorageConfig,
  StorageMetadata,
  CachedEntity,
  StorageConfigSchema,
  StorageStatsSchema,
  StorageHealthSchema,
  generateStorageKey,
  isExpired,
  isStale,
  verifyChecksum,
  StorageAdapterFactory,
  type StorageAdapter,
} from '@rockhounding/shared';

// ============================================================================
// IndexedDB Schema
// ============================================================================

interface StorageDB extends DBSchema {
  entities: {
    key: string;
    value: CachedEntity;
    indexes: {
      'by-type': string;
      'by-expired': string;
      'by-stale': string;
      'by-sync-status': string;
      'by-priority': number;
    };
  };
  metadata: {
    key: string;
    value: StorageMetadata;
    indexes: {
      'by-type': string;
      'by-user': string;
    };
  };
  stats: {
    key: string;
    value: any;
  };
  migrations: {
    key: number;
    value: {
      version: number;
      completed_at: string;
      status: 'pending' | 'completed' | 'failed';
      error?: string;
    };
  };
  operations: {
    key: string; // client_operation_id
    value: any; // BaseSyncOperation
    indexes: {
      'by-queue-status': string;
      'by-priority': string;
      'by-depends-on': string;
      'by-record': string;
    };
  };
  mappings: {
    key: string; // client_id
    value: {
      client_id: string;
      server_id: string;
      entity_type: string;
      remote_path?: string;
      synced_at: string;
    };
    indexes: {
      'by-server-id': string;
      'by-entity-type': string;
    };
  };
}

// ============================================================================
// Storage Manager
// ============================================================================

export class StorageManager {
  private db: IDBPDatabase<StorageDB> | null = null;
  private config: StorageConfig;
  private factory: StorageAdapterFactory;
  private userId: string | null = null;
  private deviceId: string;
  private compactionInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    checksumErrors: 0,
    evictions: 0,
    compactions: 0,
  };

  constructor(config: Partial<StorageConfig> = {}, deviceId: string) {
    this.config = StorageConfigSchema.parse(config);
    this.factory = new StorageAdapterFactory();
    this.deviceId = deviceId;
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<StorageDB>('rockhound-storage', 2, {
        upgrade(db, oldVersion) {
          // Entities store
          if (!db.objectStoreNames.contains('entities')) {
            const entityStore = db.createObjectStore('entities', { keyPath: 'metadata.storage_key' });
            entityStore.createIndex('by-type', 'metadata.entity_type');
            entityStore.createIndex('by-expired', 'metadata.expires_at');
            entityStore.createIndex('by-stale', 'metadata.accessed_at');
            entityStore.createIndex('by-sync-status', 'metadata.sync_status');
            entityStore.createIndex('by-priority', 'metadata.eviction_priority');
          }

          // Metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            const metadataStore = db.createObjectStore('metadata', { keyPath: 'storage_key' });
            metadataStore.createIndex('by-type', 'entity_type');
            metadataStore.createIndex('by-user', 'storage_key');
          }

          // Stats store
          if (!db.objectStoreNames.contains('stats')) {
            db.createObjectStore('stats', { keyPath: 'key' });
          }

          // Migrations store
          if (!db.objectStoreNames.contains('migrations')) {
            db.createObjectStore('migrations', { keyPath: 'version' });
          }

          // Operations store (v2)
          if (!db.objectStoreNames.contains('operations')) {
            const opStore = db.createObjectStore('operations', { keyPath: 'client_operation_id' });
            opStore.createIndex('by-queue-status', 'queue_status');
            opStore.createIndex('by-priority', 'priority');
            opStore.createIndex('by-depends-on', 'depends_on_operation_id');
            opStore.createIndex('by-record', 'client_record_id');
          }

          // Mappings store (v2)
          if (!db.objectStoreNames.contains('mappings')) {
            const mapStore = db.createObjectStore('mappings', { keyPath: 'client_id' });
            mapStore.createIndex('by-server-id', 'server_id');
            mapStore.createIndex('by-entity-type', 'entity_type');
          }
        },
      });

      // Run pending migrations
      await this.runMigrations();

      // Crash recovery: Reconcile in-flight operations
      await this.reconcileInFlightOperations();

      // Start background jobs
      this.startCompactionJob();
      this.startCleanupJob();
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      throw error;
    }
  }

  // ========================================================================
  // User & Device Management
  // ========================================================================

  setUserId(userId: string): void {
    this.userId = userId;
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  // ========================================================================
  // Core Storage Operations
  // ========================================================================

  async set<T>(
    entityType: StorageEntityType,
    entityId: string,
    data: T,
    options: { ttl?: number; priority?: number; syncStatus?: string } = {}
  ): Promise<string> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const adapter = this.factory.getAdapter<T>(entityType);

    // Validate data
    const validation = await adapter.validate(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Normalize data
    const normalized = await adapter.normalize(data);

    // Serialize
    const { encoded, encoding, size } = await adapter.serialize(normalized);

    // Create metadata
    const metadata = await adapter.createMetadata(
      entityId,
      normalized,
      this.userId || 'anonymous',
      this.deviceId
    );

    // Override options
    if (options.ttl) {
      metadata.ttl_ms = options.ttl;
      metadata.expires_at = new Date(Date.now() + options.ttl).toISOString();
    }
    if (options.priority) {
      metadata.eviction_priority = options.priority;
    }
    if (options.syncStatus) {
      metadata.sync_status = options.syncStatus as any;
    }

    // Check storage capacity
    await this.ensureCapacity(size);

    // Create cached entity
    const cachedEntity: CachedEntity = {
      metadata,
      data: encoded, // Store the encoded string
    };

    // Store in IndexedDB
    await this.db.put('entities', cachedEntity);
    await this.db.put('metadata', metadata);

    return metadata.storage_key;
  }

  async get<T>(
    entityType: StorageEntityType,
    entityId: string,
    options: { skipExpiry?: boolean; verify?: boolean } = {}
  ): Promise<T | null> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const key = generateStorageKey(entityType, entityId);
    const cached = await this.db.get('entities', key);

    if (!cached) {
      this.stats.cacheMisses++;
      return null;
    }

    // Check expiry
    if (!options.skipExpiry && isExpired(cached.metadata.expires_at)) {
      await this.delete(entityType, entityId);
      this.stats.cacheMisses++;
      return null;
    }

    // Verify checksum if enabled
    if (this.config.verify_on_read && options.verify !== false) {
      const valid = verifyChecksum(cached.data, cached.metadata.checksum);
      if (!valid) {
        console.warn(`Checksum verification failed for ${key}`);
        this.stats.checksumErrors++;
        if (this.config.enable_checksums) {
          await this.delete(entityType, entityId);
          return null;
        }
      }
    }

    // Update access metadata
    const now = new Date().toISOString();
    cached.metadata.accessed_at = now;
    cached.metadata.access_count = (cached.metadata.access_count || 0) + 1;
    await this.db.put('entities', cached);

    this.stats.cacheHits++;
    const adapter = this.factory.getAdapter<T>(entityType);
    
    // Deserialize payloads from either legacy object form or serialized string form.
    const serializedData =
      typeof cached.data === 'string'
        ? cached.data
        : JSON.stringify(cached.data);
    const deserialized = await adapter.deserialize(serializedData, cached.metadata.encoding);
    return await adapter.denormalize(deserialized);
  }

  async delete(
    entityType: StorageEntityType,
    entityId: string
  ): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const key = generateStorageKey(entityType, entityId);
    await this.db.delete('entities', key);
    await this.db.delete('metadata', key);
  }

  async exists(
    entityType: StorageEntityType,
    entityId: string
  ): Promise<boolean> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const key = generateStorageKey(entityType, entityId);
    const cached = await this.db.get('entities', key);
    return cached !== undefined && !isExpired(cached.metadata.expires_at);
  }

  async bulkSet<T>(
    entityType: StorageEntityType,
    items: Array<{ id: string; data: T }>
  ): Promise<string[]> {
    const keys: string[] = [];
    for (const { id, data } of items) {
      const key = await this.set(entityType, id, data);
      keys.push(key);
    }
    return keys;
  }

  async bulkGet<T>(
    entityType: StorageEntityType,
    entityIds: string[]
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const entityId of entityIds) {
      const data = await this.get<T>(entityType, entityId);
      if (data) {
        results.set(entityId, data);
      }
    }

    return results;
  }

  async bulkDelete(
    entityType: StorageEntityType,
    entityIds: string[]
  ): Promise<void> {
    for (const entityId of entityIds) {
      await this.delete(entityType, entityId);
    }
  }

  // ========================================================================
  // Querying
  // ========================================================================

  async getAllByType(entityType: StorageEntityType): Promise<Map<string, any>> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const results = new Map<string, any>();
    const index = this.db.transaction('entities').objectStore('entities').index('by-type');
    const items = await index.getAll(entityType);

    for (const item of items) {
      if (!isExpired(item.metadata.expires_at)) {
        results.set(item.metadata.entity_id, item.data);
      }
    }

    return results;
  }

  async getAllByUser(userId: string): Promise<Map<string, any>> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const results = new Map<string, any>();
    const allMetadata = await this.db.getAll('metadata');

    for (const metadata of allMetadata) {
      if (
        metadata.storage_key.startsWith(`${userId}:`) &&
        !isExpired(metadata.expires_at)
      ) {
        const entityType = metadata.entity_type as StorageEntityType;
        const entityId = metadata.entity_id;
        const data = await this.get(entityType, entityId);
        if (data) {
          results.set(metadata.storage_key, data);
        }
      }
    }

    return results;
  }

  async searchByPattern(pattern: RegExp): Promise<Map<string, any>> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const results = new Map<string, any>();
    const allMetadata = await this.db.getAll('metadata');

    for (const metadata of allMetadata) {
      if (pattern.test(metadata.storage_key) && !isExpired(metadata.expires_at)) {
        const entityType = metadata.entity_type as StorageEntityType;
        const entityId = metadata.entity_id;
        const data = await this.get(entityType, entityId);
        if (data) {
          results.set(metadata.storage_key, data);
        }
      }
    }

    return results;
  }

  // ========================================================================
  // Eviction & Capacity Management
  // ========================================================================

  async ensureCapacity(requiredBytes: number): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    let currentSize = await this.calculateTotalSize();

    if (currentSize + requiredBytes > this.config.max_storage_bytes) {
      const targetSize =
        this.config.max_storage_bytes - requiredBytes;

      switch (this.config.eviction_policy) {
        case 'lru':
          await this.evictByLRU(currentSize - targetSize);
          break;
        case 'lfu':
          await this.evictByLFU(currentSize - targetSize);
          break;
        case 'fifo':
          await this.evictByFIFO(currentSize - targetSize);
          break;
        case 'ttl':
          await this.evictByTTL();
          break;
        case 'priority':
          await this.evictByPriority(currentSize - targetSize);
          break;
        case 'none':
          throw new Error('Storage capacity exceeded and eviction disabled');
      }
    }
  }

  private async evictByLRU(bytesToFree: number): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const allMetadata = await this.db.getAll('metadata');
    const sortedByAccess = allMetadata.sort(
      (a, b) =>
        new Date(a.accessed_at).getTime() - new Date(b.accessed_at).getTime()
    );

    let freedBytes = 0;
    for (const metadata of sortedByAccess) {
      if (freedBytes >= bytesToFree) break;

      // Skip critical items
      if (metadata.eviction_priority > 8) continue;

      freedBytes += metadata.size_bytes;
      await this.delete(metadata.entity_type, metadata.entity_id);
      this.stats.evictions++;
    }
  }

  private async evictByLFU(bytesToFree: number): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const allMetadata = await this.db.getAll('metadata');
    const sortedByAccessCount = allMetadata.sort(
      (a, b) => (a.access_count || 0) - (b.access_count || 0)
    );

    let freedBytes = 0;
    for (const metadata of sortedByAccessCount) {
      if (freedBytes >= bytesToFree) break;

      if (metadata.eviction_priority > 8) continue;

      freedBytes += metadata.size_bytes;
      await this.delete(metadata.entity_type, metadata.entity_id);
      this.stats.evictions++;
    }
  }

  private async evictByFIFO(bytesToFree: number): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const allMetadata = await this.db.getAll('metadata');
    const sortedByCreation = allMetadata.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let freedBytes = 0;
    for (const metadata of sortedByCreation) {
      if (freedBytes >= bytesToFree) break;

      if (metadata.eviction_priority > 8) continue;

      freedBytes += metadata.size_bytes;
      await this.delete(metadata.entity_type, metadata.entity_id);
      this.stats.evictions++;
    }
  }

  private async evictByTTL(): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const allMetadata = await this.db.getAll('metadata');
    const now = new Date();

    for (const metadata of allMetadata) {
      if (metadata.expires_at && new Date(metadata.expires_at) < now) {
        await this.delete(metadata.entity_type, metadata.entity_id);
        this.stats.evictions++;
      }
    }
  }

  private async evictByPriority(bytesToFree: number): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    const allMetadata = await this.db.getAll('metadata');
    const sortedByPriority = allMetadata.sort(
      (a, b) => a.eviction_priority - b.eviction_priority
    );

    let freedBytes = 0;
    for (const metadata of sortedByPriority) {
      if (freedBytes >= bytesToFree) break;

      if (metadata.eviction_priority > 7) continue;

      freedBytes += metadata.size_bytes;
      await this.delete(metadata.entity_type, metadata.entity_id);
      this.stats.evictions++;
    }
  }

  private async calculateTotalSize(): Promise<number> {
    if (!this.db) return 0;

    const allMetadata = await this.db.getAll('metadata');
    return allMetadata.reduce((sum, m) => sum + m.size_bytes, 0);
  }

  // ========================================================================
  // Migrations
  // ========================================================================

  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    // Check current schema version
    const currentVersion = this.config.schema_version;

    // Add more migrations as schema evolves
    if (currentVersion >= 1) {
      // v1 is current
    }

    // Contract Alignment: Normalize legacy synced status in existing records
    try {
      const allMetadata = await this.db.getAll('metadata');
      const tx = this.db.transaction('metadata', 'readwrite');
      let migratedCount = 0;
      
      for (const meta of allMetadata) {
        let needsUpdate = false;
        if (meta.sync_status === 'synced' as any) {
          meta.sync_status = 'applied';
          needsUpdate = true;
        } else if (meta.sync_status === 'SYNCED' as any) {
          meta.sync_status = 'applied';
          needsUpdate = true;
        } else if (meta.sync_status === 'METADATA_SYNCED_MEDIA_PENDING' as any) {
          meta.sync_status = 'METADATA_APPLIED_MEDIA_PENDING' as any;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await tx.store.put(meta);
          migratedCount++;
        }
      }
      
      await tx.done;
      if (migratedCount > 0) {
        console.log(`[StorageManager] Migrated ${migratedCount} legacy sync statuses to V1 contract`);
      }
    } catch (error) {
      console.warn('[StorageManager] Failed to migrate legacy sync statuses', error);
    }
  }

  async recordMigration(
    version: number,
    status: 'pending' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');

    await this.db.put('migrations', {
      version,
      completed_at: new Date().toISOString(),
      status,
      error,
    });
  }

  // ========================================================================
  // Compaction & Maintenance
  // ========================================================================

  private startCompactionJob(): void {
    this.compactionInterval = setInterval(async () => {
      try {
        const currentSize = await this.calculateTotalSize();
        if (currentSize > this.config.compaction_threshold_bytes) {
          await this.compact();
        }
      } catch (error) {
        console.error('Compaction job failed:', error);
      }
    }, this.config.compaction_interval_ms);
  }

  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (error) {
        console.error('Cleanup job failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  async compact(): Promise<number> {
    if (!this.db) throw new Error('Storage manager not initialized');

    let compactedCount = 0;
    const allMetadata = await this.db.getAll('metadata');

    for (const metadata of allMetadata) {
      if (isStale(metadata.accessed_at, 7 * 24 * 60 * 60 * 1000)) {
        // Stale for 7+ days
        await this.delete(metadata.entity_type, metadata.entity_id);
        compactedCount++;
      }
    }

    this.stats.compactions++;
    return compactedCount;
  }

  async cleanupExpired(): Promise<number> {
    if (!this.db) throw new Error('Storage manager not initialized');

    let cleanedCount = 0;
    const allMetadata = await this.db.getAll('metadata');

    for (const metadata of allMetadata) {
      if (isExpired(metadata.expires_at)) {
        await this.delete(metadata.entity_type, metadata.entity_id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // ========================================================================
  // Statistics & Health
  // ========================================================================

  async getStats() {
    const totalSize = await this.calculateTotalSize();
    const allMetadata = await this.db?.getAll('metadata') || [];

    const entitiesByType: Record<string, number> = {};
    const sizeByType: Record<string, number> = {};

    for (const metadata of allMetadata) {
      entitiesByType[metadata.entity_type] = (entitiesByType[metadata.entity_type] || 0) + 1;
      sizeByType[metadata.entity_type] = (sizeByType[metadata.entity_type] || 0) + metadata.size_bytes;
    }

    return StorageStatsSchema.parse({
      total_entities: allMetadata.length,
      total_size_bytes: totalSize,
      available_bytes: this.config.max_storage_bytes - totalSize,
      entities_by_type: entitiesByType,
      size_by_type: sizeByType,
      cached_entities: allMetadata.filter(m => !isExpired(m.expires_at)).length,
      stale_entities: allMetadata.filter(m => isStale(m.accessed_at)).length,
      expired_entities: allMetadata.filter(m => isExpired(m.expires_at)).length,
      pending_sync: allMetadata.filter(m => m.sync_status === 'pending').length,
      synced_entities: allMetadata.filter(m => m.sync_status === 'applied').length,
      avg_access_time_ms: 5,
      cache_hit_rate:
        this.stats.cacheHits /
        (this.stats.cacheHits + this.stats.cacheMisses || 1),
      measured_at: new Date().toISOString(),
    });
  }

  async getHealth() {
    const stats = await this.getStats();
    const usagePercent = (stats.total_size_bytes / this.config.max_storage_bytes) * 100;

    const checks = {
      storage_capacity: {
        passed: usagePercent < 90,
        message: `Storage at ${usagePercent.toFixed(1)}%`,
        usage_percent: usagePercent,
      },
      checksum_verification: {
        passed: this.stats.checksumErrors === 0,
        message: `${this.stats.checksumErrors} checksum errors`,
        errors_found: this.stats.checksumErrors,
      },
      expiration_cleanup: {
        passed: stats.expired_entities < 100,
        message: `${stats.expired_entities} expired entities`,
        errors_found: stats.expired_entities,
      },
      sync_integrity: {
        passed: stats.pending_sync < 1000,
        message: `${stats.pending_sync} pending syncs`,
        errors_found: stats.pending_sync,
      },
    };

    const allChecksPassed = Object.values(checks).every(c => c.passed);
    const status = allChecksPassed ? 'healthy' : usagePercent > 95 ? 'critical' : 'warning';

    return StorageHealthSchema.parse({
      status,
      checks: checks as any,
      recommendations: [
        usagePercent > 80 && 'Enable storage compaction',
        this.stats.checksumErrors > 0 && 'Verify corrupted entities',
        stats.expired_entities > 100 && 'Run cleanup job',
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
    });
  }

  // ========================================================================
  // Operation Queue Management (Phase 1C)
  // ========================================================================

  /**
   * Write-Ahead Logic: Persist operation to ledger before network attempt.
   */
  async pushOperation(operation: any): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');
    await this.db.put('operations', operation);
  }

  async getPendingOperations(): Promise<any[]> {
    if (!this.db) throw new Error('Storage manager not initialized');
    return await this.db.getAllFromIndex('operations', 'by-queue-status', 'PENDING');
  }

  async getReadyOperations(): Promise<any[]> {
    if (!this.db) throw new Error('Storage manager not initialized');
    const pending = await this.getPendingOperations();
    const retrying = await this.db.getAllFromIndex('operations', 'by-queue-status', 'RETRY_SCHEDULED');
    
    // Combine and sort by priority/created_at
    const ready = [...pending, ...retrying].filter(op => {
      if (op.queue_status === 'RETRY_SCHEDULED') {
        return new Date(op.next_retry_at) <= new Date();
      }
      return true;
    });

    return ready.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  async updateOperationStatus(
    clientOperationId: string, 
    status: string, 
    updates: Partial<any> = {}
  ): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');
    const op = await this.db.get('operations', clientOperationId);
    if (!op) return;

    await this.db.put('operations', {
      ...op,
      queue_status: status,
      ...updates,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Crash Recovery: Reset stale IN_FLIGHT items to RETRY_SCHEDULED.
   */
  async reconcileInFlightOperations(): Promise<void> {
    if (!this.db) return;
    const inFlight = await this.db.getAllFromIndex('operations', 'by-queue-status', 'IN_FLIGHT');
    
    for (const op of inFlight) {
      await this.updateOperationStatus(op.client_operation_id, 'RETRY_SCHEDULED', {
        next_retry_at: new Date().toISOString(),
        last_error_message: 'Operation interrupted (Crash Recovery)'
      });
    }
  }

  async getOperationsByRecordId(clientRecordId: string): Promise<any[]> {
    if (!this.db) throw new Error('Storage manager not initialized');
    return await this.db.getAllFromIndex('operations', 'by-record', clientRecordId);
  }

  // ========================================================================
  // ID Mapping & Reconciliation (Phase 1C)
  // ========================================================================

  async setMapping(
    clientId: string, 
    serverId: string, 
    entityType: string, 
    remotePath?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');
    await this.db.put('mappings', {
      client_id: clientId,
      server_id: serverId,
      entity_type: entityType,
      remote_path: remotePath,
      synced_at: new Date().toISOString()
    });
  }

  async getMapping(clientId: string) {
    if (!this.db) throw new Error('Storage manager not initialized');
    return await this.db.get('mappings', clientId);
  }

  async getServerId(clientId: string): Promise<string | null> {
    const mapping = await this.getMapping(clientId);
    return mapping?.server_id || null;
  }

  async getClientId(serverId: string): Promise<string | null> {
    if (!this.db) throw new Error('Storage manager not initialized');
    const mapping = await this.db.getFromIndex('mappings', 'by-server-id', serverId);
    return mapping?.client_id || null;
  }

  async updateEntitySyncStatus(
    entityType: StorageEntityType, 
    entityId: string, 
    status: string
  ): Promise<void> {
    if (!this.db) throw new Error('Storage manager not initialized');
    const key = generateStorageKey(entityType, entityId);
    
    // Update both entities and metadata stores
    const tx = this.db.transaction(['entities', 'metadata'], 'readwrite');
    const entity = await tx.objectStore('entities').get(key);
    const metadata = await tx.objectStore('metadata').get(key);

    if (entity) {
      entity.metadata.sync_status = status as any;
      await tx.objectStore('entities').put(entity);
    }

    if (metadata) {
      metadata.sync_status = status as any;
      if (status === 'applied') {
        metadata.synced_at = new Date().toISOString();
      }
      await tx.objectStore('metadata').put(metadata);
    }

    await tx.done;
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  async destroy(): Promise<void> {
    if (this.compactionInterval) clearInterval(this.compactionInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let storageManagerInstance: StorageManager | null = null;

export async function initStorageManager(
  config?: Partial<StorageConfig>,
  deviceId?: string
): Promise<StorageManager> {
  if (storageManagerInstance) {
    return storageManagerInstance;
  }

  const id = deviceId || (typeof localStorage !== 'undefined'
    ? localStorage.getItem('rockhound-device-id') ||
      crypto.randomUUID()
    : crypto.randomUUID());

  storageManagerInstance = new StorageManager(config, id);
  await storageManagerInstance.initialize();
  return storageManagerInstance;
}

export function getStorageManager(): StorageManager {
  if (!storageManagerInstance) {
    throw new Error('Storage manager not initialized. Call initStorageManager first.');
  }
  return storageManagerInstance;
}
