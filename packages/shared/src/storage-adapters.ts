/**
 * Offline Storage & Caching - Storage Adapters
 * 
 * Adapters for serialization, deserialization, and type-specific storage
 * rules for all entity types.
 */

import {
  StorageEntityType,
  CachedFieldSessionSchema,
  CachedFindLogSchema,
  CachedSpecimenSchema,
  CachedCaptureSessionSchema,
  CachedRawCaptureSchema,
  CachedProcessedCaptureSchema,
  CachedStorageLocationSchema,
  CachedCollectionGroupSchema,
  CachedTagSchema,
  CachedAnalyticsCacheSchema,
  CachedTelemetryEventSchema,
  CachedSyncQueueItemSchema,
  StorageMetadataSchema,
  StorageMetadata,
  getSerializationRules,
  generateStorageKey,
  computeChecksum,
  ANALYTICS_CACHE_TTL_MS,
  TELEMETRY_TTL_MS,
  SYNC_QUEUE_TTL_MS,
  MAX_SINGLE_ENTITY_SIZE_BYTES,
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
} from './storage-schema';

// ============================================================================
// Storage Adapter Interface
// ============================================================================

export interface StorageAdapter<T> {
  // Schema validation
  schema: any;
  entityType: StorageEntityType;
  
  // Serialization
  serialize(data: T): Promise<{
    encoded: string;
    encoding: 'json' | 'compressed' | 'binary';
    size: number;
  }>;
  
  deserialize(encoded: string, encoding: 'json' | 'compressed' | 'binary'): Promise<T>;
  
  // Metadata
  createMetadata(
    entityId: string,
    data: T,
    userId: string,
    deviceId: string
  ): Promise<StorageMetadata>;
  
  // Validation
  validate(data: T): Promise<{ valid: boolean; errors?: string[] }>;
  
  // Transformation
  normalize(data: any): Promise<T>;
  denormalize(data: T): Promise<any>;
}

// ============================================================================
// Base Adapter Implementation
// ============================================================================

export class BaseStorageAdapter<T> implements StorageAdapter<T> {
  schema: any;
  entityType: StorageEntityType;

  constructor(entityType: StorageEntityType, schema: any) {
    this.entityType = entityType;
    this.schema = schema;
  }

  async serialize(data: T): Promise<{
    encoded: string;
    encoding: 'json' | 'compressed' | 'binary';
    size: number;
  }> {
    const rules = getSerializationRules(this.entityType);
    const jsonStr = JSON.stringify(data);
    const size = jsonStr.length;

    if (size > MAX_SINGLE_ENTITY_SIZE_BYTES) {
      throw new Error(
        `Entity exceeds maximum size: ${size} > ${MAX_SINGLE_ENTITY_SIZE_BYTES}`
      );
    }

    let encoded = jsonStr;
    let encoding: 'json' | 'compressed' | 'binary' = 'json';

    // Simple compression simulation (in production, use actual compression)
    if (rules.shouldCompress && size > 1024) {
      // Placeholder: In real implementation, use LZ-string or similar
      encoded = Buffer.from(jsonStr).toString('base64');
      encoding = 'compressed';
    }

    return { encoded, encoding, size };
  }

  async deserialize(
    encoded: string,
    encoding: 'json' | 'compressed' | 'binary'
  ): Promise<T> {
    let decoded: string;

    if (encoding === 'compressed') {
      // Placeholder: In real implementation, use actual decompression
      decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    } else {
      decoded = encoded;
    }

    return JSON.parse(decoded) as T;
  }

  async createMetadata(
    entityId: string,
    data: T,
    _userId: string,
    deviceId: string
  ): Promise<StorageMetadata> {
    const { encoding, size } = await this.serialize(data);
    const checksum = computeChecksum(data);
    const rules = getSerializationRules(this.entityType);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + rules.ttl).toISOString();

    return StorageMetadataSchema.parse({
      storage_key: generateStorageKey(this.entityType, entityId),
      entity_type: this.entityType,
      entity_id: entityId,
      version: 1,
      schema_version: 1,
      created_at: now,
      updated_at: now,
      accessed_at: now,
      expires_at: expiresAt,
      ttl_ms: rules.ttl,
      is_stale: false,
      encoding,
      size_bytes: size,
      checksum,
      last_write_by_device: deviceId,
      eviction_priority: rules.priority,
      access_count: 1,
    });
  }

  async validate(data: T): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      await this.schema.parseAsync(data);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, errors: [error.message] };
    }
  }

  async normalize(data: any): Promise<T> {
    return this.schema.parse(data);
  }

  async denormalize(data: T): Promise<any> {
    return data;
  }
}

// ============================================================================
// Field Session Adapter
// ============================================================================

export class FieldSessionAdapter extends BaseStorageAdapter<CachedFieldSession> {
  constructor() {
    super('field_session', CachedFieldSessionSchema);
  }

  async normalize(data: any): Promise<CachedFieldSession> {
    return CachedFieldSessionSchema.parse({
      ...data,
      coordinates: data.coordinates || undefined,
    });
  }
}

// ============================================================================
// Find Log Adapter
// ============================================================================

export class FindLogAdapter extends BaseStorageAdapter<CachedFindLog> {
  constructor() {
    super('find_log', CachedFindLogSchema);
  }

  async normalize(data: any): Promise<CachedFindLog> {
    return CachedFindLogSchema.parse({
      ...data,
      photos: data.photos || [],
    });
  }
}

// ============================================================================
// Specimen Adapter
// ============================================================================

export class SpecimenAdapter extends BaseStorageAdapter<CachedSpecimen> {
  constructor() {
    super('specimen', CachedSpecimenSchema);
  }

  async normalize(data: any): Promise<CachedSpecimen> {
    return CachedSpecimenSchema.parse({
      ...data,
      tags: data.tags || [],
      photos: data.photos || [],
    });
  }
}

// ============================================================================
// Capture Session Adapter
// ============================================================================

export class CaptureSessionAdapter extends BaseStorageAdapter<CachedCaptureSession> {
  constructor() {
    super('capture_session', CachedCaptureSessionSchema);
  }

  async normalize(data: any): Promise<CachedCaptureSession> {
    return CachedCaptureSessionSchema.parse({
      ...data,
      camera_settings: data.camera_settings || {},
    });
  }
}

// ============================================================================
// Raw Capture Adapter
// ============================================================================

export class RawCaptureAdapter extends BaseStorageAdapter<CachedRawCapture> {
  constructor() {
    super('raw_capture', CachedRawCaptureSchema);
  }

  async normalize(data: any): Promise<CachedRawCapture> {
    return CachedRawCaptureSchema.parse({
      ...data,
      camera_metadata: data.camera_metadata || {},
      location_coordinates: data.location_coordinates || undefined,
    });
  }
}

// ============================================================================
// Processed Capture Adapter
// ============================================================================

export class ProcessedCaptureAdapter extends BaseStorageAdapter<CachedProcessedCapture> {
  constructor() {
    super('processed_capture', CachedProcessedCaptureSchema);
  }

  async normalize(data: any): Promise<CachedProcessedCapture> {
    return CachedProcessedCaptureSchema.parse({
      ...data,
      processing_metadata: data.processing_metadata || {},
    });
  }
}

// ============================================================================
// Storage Location Adapter
// ============================================================================

export class StorageLocationAdapter extends BaseStorageAdapter<CachedStorageLocation> {
  constructor() {
    super('storage_location', CachedStorageLocationSchema);
  }

  async normalize(data: any): Promise<CachedStorageLocation> {
    return CachedStorageLocationSchema.parse(data);
  }
}

// ============================================================================
// Collection Group Adapter
// ============================================================================

export class CollectionGroupAdapter extends BaseStorageAdapter<CachedCollectionGroup> {
  constructor() {
    super('collection_group', CachedCollectionGroupSchema);
  }

  async normalize(data: any): Promise<CachedCollectionGroup> {
    return CachedCollectionGroupSchema.parse({
      ...data,
      specimen_ids: data.specimen_ids || [],
    });
  }
}

// ============================================================================
// Tag Adapter
// ============================================================================

export class TagAdapter extends BaseStorageAdapter<CachedTag> {
  constructor() {
    super('tag', CachedTagSchema);
  }

  async normalize(data: any): Promise<CachedTag> {
    return CachedTagSchema.parse(data);
  }
}

// ============================================================================
// Analytics Cache Adapter
// ============================================================================

export class AnalyticsCacheAdapter extends BaseStorageAdapter<CachedAnalyticsCache> {
  constructor() {
    super('analytics_cache', CachedAnalyticsCacheSchema);
  }

  async createMetadata(
    entityId: string,
    data: CachedAnalyticsCache,
    userId: string,
    deviceId: string
  ): Promise<StorageMetadata> {
    const metadata = await super.createMetadata(entityId, data, userId, deviceId);
    // Analytics cache should use shorter TTL
    return {
      ...metadata,
      ttl_ms: ANALYTICS_CACHE_TTL_MS,
      expires_at: new Date(Date.now() + ANALYTICS_CACHE_TTL_MS).toISOString(),
    };
  }

  async normalize(data: any): Promise<CachedAnalyticsCache> {
    return CachedAnalyticsCacheSchema.parse({
      ...data,
      cache_data: data.cache_data || {},
    });
  }
}

// ============================================================================
// Telemetry Event Adapter
// ============================================================================

export class TelemetryEventAdapter extends BaseStorageAdapter<CachedTelemetryEvent> {
  constructor() {
    super('telemetry_event', CachedTelemetryEventSchema);
  }

  async createMetadata(
    entityId: string,
    data: CachedTelemetryEvent,
    userId: string,
    deviceId: string
  ): Promise<StorageMetadata> {
    const metadata = await super.createMetadata(entityId, data, userId, deviceId);
    // Telemetry events should use longer TTL
    return {
      ...metadata,
      ttl_ms: TELEMETRY_TTL_MS,
      expires_at: new Date(Date.now() + TELEMETRY_TTL_MS).toISOString(),
    };
  }

  async normalize(data: any): Promise<CachedTelemetryEvent> {
    return CachedTelemetryEventSchema.parse({
      ...data,
      data: data.data || {},
    });
  }
}

// ============================================================================
// Sync Queue Item Adapter
// ============================================================================

export class SyncQueueItemAdapter extends BaseStorageAdapter<CachedSyncQueueItem> {
  constructor() {
    super('sync_queue', CachedSyncQueueItemSchema);
  }

  async createMetadata(
    entityId: string,
    data: CachedSyncQueueItem,
    userId: string,
    deviceId: string
  ): Promise<StorageMetadata> {
    const metadata = await super.createMetadata(entityId, data, userId, deviceId);
    // Sync queue items should use longest TTL
    return {
      ...metadata,
      ttl_ms: SYNC_QUEUE_TTL_MS,
      expires_at: new Date(Date.now() + SYNC_QUEUE_TTL_MS).toISOString(),
    };
  }

  async normalize(data: any): Promise<CachedSyncQueueItem> {
    return CachedSyncQueueItemSchema.parse(data);
  }
}

// ============================================================================
// Adapter Factory
// ============================================================================

export class StorageAdapterFactory {
  private adapters: Map<StorageEntityType, StorageAdapter<any>> = new Map();

  constructor() {
    this.registerAdapters();
  }

  private registerAdapters() {
    this.adapters.set('field_session', new FieldSessionAdapter());
    this.adapters.set('find_log', new FindLogAdapter());
    this.adapters.set('specimen', new SpecimenAdapter());
    this.adapters.set('capture_session', new CaptureSessionAdapter());
    this.adapters.set('raw_capture', new RawCaptureAdapter());
    this.adapters.set('processed_capture', new ProcessedCaptureAdapter());
    this.adapters.set('storage_location', new StorageLocationAdapter());
    this.adapters.set('collection_group', new CollectionGroupAdapter());
    this.adapters.set('tag', new TagAdapter());
    this.adapters.set('analytics_cache', new AnalyticsCacheAdapter());
    this.adapters.set('telemetry_event', new TelemetryEventAdapter());
    this.adapters.set('sync_queue', new SyncQueueItemAdapter());
  }

  getAdapter<T>(entityType: StorageEntityType): StorageAdapter<T> {
    const adapter = this.adapters.get(entityType);
    if (!adapter) {
      throw new Error(`No adapter registered for entity type: ${entityType}`);
    }
    return adapter as StorageAdapter<T>;
  }

  registerAdapter<T>(
    entityType: StorageEntityType,
    adapter: StorageAdapter<T>
  ) {
    this.adapters.set(entityType, adapter);
  }

  getAdapters(): Map<StorageEntityType, StorageAdapter<any>> {
    return new Map(this.adapters);
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

export class BulkStorageOperations {
  constructor(private factory: StorageAdapterFactory) {}

  async normalizeArray<T>(
    entityType: StorageEntityType,
    items: any[]
  ): Promise<T[]> {
    const adapter = this.factory.getAdapter<T>(entityType);
    return Promise.all(items.map((item) => adapter.normalize(item)));
  }

  async serializeArray<T>(items: T[]): Promise<Array<string>> {
    if (items.length === 0) return [];
    const adapter = this.factory.getAdapter(items[0] as any);
    return Promise.all(items.map((item) => adapter.serialize(item as any).then(r => r.encoded)));
  }

  async validateBatch<T>(
    entityType: StorageEntityType,
    items: T[]
  ): Promise<{ valid: boolean; errors: Record<string, string[]> }> {
    const adapter = this.factory.getAdapter<T>(entityType);
    const errors: Record<string, string[]> = {};
    let valid = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const result = await adapter.validate(item);
      if (!result.valid) {
        valid = false;
        errors[`item_${i}`] = result.errors || [];
      }
    }

    return { valid, errors };
  }
}
