/**
 * Offline Storage & Caching - Data Model & Schemas
 * 
 * Complete schema for:
 * - IndexedDB structure
 * - Storage entity types
 * - Serialization rules
 * - Eviction policies
 * - TTL-based caching
 * - Integrity verification
 */

import { z } from 'zod';

// ============================================================================
// Storage Constants
// ============================================================================

export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SYNC_QUEUE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const TELEMETRY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ANALYTICS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const THUMBNAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const MAX_STORAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB total
export const MAX_SINGLE_ENTITY_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per entity
export const COMPACTION_THRESHOLD_BYTES = 40 * 1024 * 1024; // Compact when > 40MB

// ============================================================================
// Eviction Policies
// ============================================================================

export const EvictionPolicy = z.enum([
  'lru',        // Least Recently Used
  'lfu',        // Least Frequently Used
  'fifo',       // First In First Out
  'ttl',        // Time To Live
  'priority',   // By priority
  'none',       // No eviction
]);

export type EvictionPolicy = z.infer<typeof EvictionPolicy>;

// ============================================================================
// Storage Entity Type
// ============================================================================

export const StorageEntityType = z.enum([
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
  'telemetry_event',
  'sync_queue',
  'thumbnail',
  'attachment',
  'cache_metadata',
]);

export type StorageEntityType = z.infer<typeof StorageEntityType>;

// ============================================================================
// Storage Metadata
// ============================================================================

export const StorageMetadataSchema = z.object({
  // Storage identification
  storage_key: z.string().min(1),
  entity_type: StorageEntityType,
  entity_id: z.string().uuid(),
  
  // Versioning
  version: z.number().int().nonnegative(),
  schema_version: z.number().int().nonnegative(),
  
  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  accessed_at: z.string().datetime(),
  
  // Caching
  expires_at: z.string().datetime().optional(),
  ttl_ms: z.number().int().positive().optional(),
  is_stale: z.boolean().default(false),
  
  // Serialization
  encoding: z.enum(['json', 'compressed', 'binary']).default('json'),
  size_bytes: z.number().int().nonnegative(),
  checksum: z.string().max(64),
  
  // Sync tracking
  synced_at: z.string().datetime().optional(),
  sync_status: z.enum(['pending', 'syncing', 'synced', 'conflict']).optional(),
  
  // Access tracking
  access_count: z.number().int().nonnegative().default(0),
  last_write_by_device: z.string().uuid().optional(),
  
  // Eviction info
  eviction_priority: z.number().int().min(0).max(10).default(5),
});

export type StorageMetadata = z.infer<typeof StorageMetadataSchema>;

// ============================================================================
// Cached Entity
// ============================================================================

export const CachedEntitySchema = z.object({
  metadata: StorageMetadataSchema,
  data: z.record(z.unknown()),
  compression_ratio: z.number().min(0).max(1).optional(),
  computed_fields: z.record(z.unknown()).optional(),
});

export type CachedEntity = z.infer<typeof CachedEntitySchema>;

// ============================================================================
// Field Session Storage
// ============================================================================

export const CachedFieldSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  location_name: z.string().max(200),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  status: z.enum(['active', 'paused', 'completed']),
  weather_conditions: z.record(z.unknown()).optional(),
  notes: z.string().max(10000).optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
  // Local storage fields
  _find_logs_count: z.number().int().nonnegative().optional(),
  _captures_count: z.number().int().nonnegative().optional(),
});

export type CachedFieldSession = z.infer<typeof CachedFieldSessionSchema>;

// ============================================================================
// Find Log Storage
// ============================================================================

export const CachedFindLogSchema = z.object({
  id: z.string().uuid(),
  field_session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  specimen_type: z.string().min(1).max(100),
  location_coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  find_time: z.string().datetime(),
  quantity: z.number().int().positive(),
  quality_rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
  photos: z.array(z.string().url()).optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedFindLog = z.infer<typeof CachedFindLogSchema>;

// ============================================================================
// Specimen Storage
// ============================================================================

export const CachedSpecimenSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  material_type: z.string().min(1).max(100),
  storage_location_id: z.string().uuid().optional(),
  find_log_id: z.string().uuid().optional(),
  acquisition_date: z.string().datetime().optional(),
  description: z.string().max(10000).optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string().url()).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  estimated_value: z.number().nonnegative().optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedSpecimen = z.infer<typeof CachedSpecimenSchema>;

// ============================================================================
// Capture Session Storage
// ============================================================================

export const CachedCaptureSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  field_session_id: z.string().uuid().optional(),
  session_name: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  camera_settings: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'processing', 'completed']),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
  // Local fields
  _captures_count: z.number().int().nonnegative().optional(),
});

export type CachedCaptureSession = z.infer<typeof CachedCaptureSessionSchema>;

// ============================================================================
// Capture Storage
// ============================================================================

export const CachedRawCaptureSchema = z.object({
  id: z.string().uuid(),
  capture_session_id: z.string().uuid(),
  user_id: z.string().uuid(),
  file_path: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  capture_time: z.string().datetime(),
  camera_metadata: z.record(z.unknown()).optional(),
  location_coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  thumbnail_url: z.string().url().optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedRawCapture = z.infer<typeof CachedRawCaptureSchema>;

export const CachedProcessedCaptureSchema = z.object({
  id: z.string().uuid(),
  raw_capture_id: z.string().uuid(),
  user_id: z.string().uuid(),
  processed_file_path: z.string().min(1),
  processing_pipeline: z.string().min(1),
  processing_metadata: z.record(z.unknown()).optional(),
  quality_score: z.number().min(0).max(1).optional(),
  thumbnail_url: z.string().url().optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedProcessedCapture = z.infer<typeof CachedProcessedCaptureSchema>;

// ============================================================================
// Collection Management Storage
// ============================================================================

export const CachedStorageLocationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  location_type: z.string().min(1).max(100),
  parent_location_id: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().positive().optional(),
  current_count: z.number().int().nonnegative().optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedStorageLocation = z.infer<typeof CachedStorageLocationSchema>;

export const CachedCollectionGroupSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  specimen_ids: z.array(z.string().uuid()),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedCollectionGroup = z.infer<typeof CachedCollectionGroupSchema>;

export const CachedTagSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedTag = z.infer<typeof CachedTagSchema>;

// ============================================================================
// Analytics Cache Storage
// ============================================================================

export const CachedAnalyticsCacheSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  cache_key: z.string().min(1).max(200),
  cache_data: z.record(z.unknown()),
  computed_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  version: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

export type CachedAnalyticsCache = z.infer<typeof CachedAnalyticsCacheSchema>;

// ============================================================================
// Telemetry Events Storage
// ============================================================================

export const CachedTelemetryEventSchema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  category: z.string().min(1),
  event_name: z.string().min(1),
  severity: z.enum(['debug', 'info', 'warning', 'error', 'critical']),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()).optional(),
  version: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});

export type CachedTelemetryEvent = z.infer<typeof CachedTelemetryEventSchema>;

// ============================================================================
// Sync Queue Storage
// ============================================================================

export const CachedSyncQueueItemSchema = z.object({
  sync_id: z.string().uuid(),
  user_id: z.string().uuid(),
  device_id: z.string().uuid(),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  operation_type: z.enum(['create', 'update', 'delete', 'soft_delete']),
  priority: z.enum(['critical', 'high', 'normal', 'low', 'background']),
  status: z.enum(['pending', 'syncing', 'success', 'conflict', 'error', 'retry']),
  client_version: z.number().int().nonnegative(),
  retry_count: z.number().int().nonnegative(),
  max_retries: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().nonnegative(),
});

export type CachedSyncQueueItem = z.infer<typeof CachedSyncQueueItemSchema>;

// ============================================================================
// Storage Configuration
// ============================================================================

export const StorageConfigSchema = z.object({
  // Size limits
  max_storage_bytes: z.number().int().positive().default(MAX_STORAGE_SIZE_BYTES),
  max_entity_bytes: z.number().int().positive().default(MAX_SINGLE_ENTITY_SIZE_BYTES),
  
  // TTL settings
  default_ttl_ms: z.number().int().positive().default(DEFAULT_TTL_MS),
  field_session_ttl_ms: z.number().int().positive().default(DEFAULT_TTL_MS),
  telemetry_ttl_ms: z.number().int().positive().default(TELEMETRY_TTL_MS),
  analytics_ttl_ms: z.number().int().positive().default(ANALYTICS_CACHE_TTL_MS),
  sync_queue_ttl_ms: z.number().int().positive().default(SYNC_QUEUE_TTL_MS),
  
  // Eviction
  eviction_policy: EvictionPolicy.default('lru'),
  compaction_threshold_bytes: z.number().int().positive().default(COMPACTION_THRESHOLD_BYTES),
  compaction_interval_ms: z.number().int().positive().default(60 * 60 * 1000), // 1 hour
  
  // Compression
  enable_compression: z.boolean().default(true),
  compression_threshold_bytes: z.number().int().positive().default(1024), // 1KB
  
  // Versioning
  schema_version: z.number().int().nonnegative().default(1),
  enable_migrations: z.boolean().default(true),
  
  // Integrity
  enable_checksums: z.boolean().default(true),
  verify_on_read: z.boolean().default(true),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

// ============================================================================
// Storage Statistics
// ============================================================================

export const StorageStatsSchema = z.object({
  total_entities: z.number().int().nonnegative(),
  total_size_bytes: z.number().int().nonnegative(),
  available_bytes: z.number().int().nonnegative(),
  
  // By entity type
  entities_by_type: z.record(z.number().int().nonnegative()),
  size_by_type: z.record(z.number().int().nonnegative()),
  
  // Cache stats
  cached_entities: z.number().int().nonnegative(),
  stale_entities: z.number().int().nonnegative(),
  expired_entities: z.number().int().nonnegative(),
  
  // Sync stats
  pending_sync: z.number().int().nonnegative(),
  synced_entities: z.number().int().nonnegative(),
  
  // Performance
  avg_access_time_ms: z.number().nonnegative(),
  cache_hit_rate: z.number().min(0).max(1),
  
  // Timestamps
  measured_at: z.string().datetime(),
  last_compaction_at: z.string().datetime().optional(),
  last_cleanup_at: z.string().datetime().optional(),
});

export type StorageStats = z.infer<typeof StorageStatsSchema>;

// ============================================================================
// Storage Health Check
// ============================================================================

export const StorageHealthSchema = z.object({
  status: z.enum(['healthy', 'warning', 'critical']),
  checks: z.object({
    storage_capacity: z.object({
      passed: z.boolean(),
      message: z.string(),
      usage_percent: z.number().min(0).max(100),
    }),
    checksum_verification: z.object({
      passed: z.boolean(),
      message: z.string(),
      errors_found: z.number().int().nonnegative(),
    }),
    expiration_cleanup: z.object({
      passed: z.boolean(),
      message: z.string(),
      expired_count: z.number().int().nonnegative(),
    }),
    sync_integrity: z.object({
      passed: z.boolean(),
      message: z.string(),
      conflicts: z.number().int().nonnegative(),
    }),
  }),
  recommendations: z.array(z.string()),
  timestamp: z.string().datetime(),
});

export type StorageHealth = z.infer<typeof StorageHealthSchema>;

// ============================================================================
// Serialization & Deserialization
// ============================================================================

export interface SerializationRule {
  entityType: StorageEntityType;
  shouldCompress: boolean;
  maxSize: number;
  ttl: number;
  priority: number;
}

export function getSerializationRules(entityType: StorageEntityType): SerializationRule {
  const rules: Record<StorageEntityType, SerializationRule> = {
    field_session: {
      entityType: 'field_session',
      shouldCompress: false,
      maxSize: 512 * 1024, // 512KB
      ttl: DEFAULT_TTL_MS,
      priority: 9,
    },
    find_log: {
      entityType: 'find_log',
      shouldCompress: false,
      maxSize: 256 * 1024, // 256KB
      ttl: DEFAULT_TTL_MS,
      priority: 9,
    },
    specimen: {
      entityType: 'specimen',
      shouldCompress: false,
      maxSize: 256 * 1024, // 256KB
      ttl: DEFAULT_TTL_MS,
      priority: 8,
    },
    capture_session: {
      entityType: 'capture_session',
      shouldCompress: false,
      maxSize: 128 * 1024, // 128KB
      ttl: DEFAULT_TTL_MS,
      priority: 8,
    },
    raw_capture: {
      entityType: 'raw_capture',
      shouldCompress: true,
      maxSize: 512 * 1024, // 512KB
      ttl: DEFAULT_TTL_MS,
      priority: 6,
    },
    processed_capture: {
      entityType: 'processed_capture',
      shouldCompress: true,
      maxSize: 512 * 1024, // 512KB
      ttl: DEFAULT_TTL_MS,
      priority: 6,
    },
    storage_location: {
      entityType: 'storage_location',
      shouldCompress: false,
      maxSize: 64 * 1024, // 64KB
      ttl: DEFAULT_TTL_MS,
      priority: 7,
    },
    collection_group: {
      entityType: 'collection_group',
      shouldCompress: false,
      maxSize: 256 * 1024, // 256KB
      ttl: DEFAULT_TTL_MS,
      priority: 7,
    },
    tag: {
      entityType: 'tag',
      shouldCompress: false,
      maxSize: 8 * 1024, // 8KB
      ttl: DEFAULT_TTL_MS,
      priority: 5,
    },
    export_job: {
      entityType: 'export_job',
      shouldCompress: false,
      maxSize: 128 * 1024, // 128KB
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 3,
    },
    analytics_cache: {
      entityType: 'analytics_cache',
      shouldCompress: true,
      maxSize: 512 * 1024, // 512KB
      ttl: ANALYTICS_CACHE_TTL_MS,
      priority: 2,
    },
    telemetry_event: {
      entityType: 'telemetry_event',
      shouldCompress: true,
      maxSize: 64 * 1024, // 64KB
      ttl: TELEMETRY_TTL_MS,
      priority: 1,
    },
    sync_queue: {
      entityType: 'sync_queue',
      shouldCompress: true,
      maxSize: 256 * 1024, // 256KB
      ttl: SYNC_QUEUE_TTL_MS,
      priority: 10,
    },
    thumbnail: {
      entityType: 'thumbnail',
      shouldCompress: true,
      maxSize: 256 * 1024, // 256KB
      ttl: THUMBNAIL_TTL_MS,
      priority: 4,
    },
    attachment: {
      entityType: 'attachment',
      shouldCompress: true,
      maxSize: 1024 * 1024, // 1MB
      ttl: DEFAULT_TTL_MS,
      priority: 3,
    },
    cache_metadata: {
      entityType: 'cache_metadata',
      shouldCompress: false,
      maxSize: 32 * 1024, // 32KB
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 1,
    },
  };

  return rules[entityType];
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateStorageKey(
  entityType: StorageEntityType,
  entityId: string
): string {
  return `${entityType}:${entityId}`;
}

export function parseStorageKey(key: string): {
  entityType: StorageEntityType;
  entityId: string;
} {
  const [entityType, entityId] = key.split(':');
  if (!entityType || !entityId) {
    throw new Error(`Invalid storage key format: ${key}`);
  }
  return { entityType: entityType as StorageEntityType, entityId };
}

export function calculateTTLExpiry(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}

export function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function isStale(accessedAt: string, staleAfterMs: number = 60 * 60 * 1000): boolean {
  return Date.now() - new Date(accessedAt).getTime() > staleAfterMs;
}

export function computeChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function verifyChecksum(data: any, checksum: string): boolean {
  return computeChecksum(data) === checksum;
}
