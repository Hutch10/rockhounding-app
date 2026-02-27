/**
 * Shared contracts for Rockhounding App
 * Single source of truth for enums, types, and validators
 */

// Export TypeScript enums
export { LegalTag, SourceTier, Status, Visibility } from './enums';

// Export Zod schemas and type inference helpers
export {
  LegalTagSchema,
  SourceTierSchema,
  StatusSchema,
  VisibilitySchema,
  type LegalTagType,
  type SourceTierType,
  type StatusType,
  type VisibilityType,
} from './schemas';

// Export FieldSession schema and related types
export {
  // Enums
  SessionState,
  SyncStatus,
  WeatherCondition,
  SessionVisibility,
  // Interfaces
  type FieldSession,
  type FindLog,
  type GeoJSONPoint,
  type GeoJSONLineString,
  // Event types
  type SessionEvent,
  type BaseSessionEvent,
  type SessionCreatedEvent,
  type SessionStartedEvent,
  type SessionPausedEvent,
  type SessionResumedEvent,
  type SessionEndedEvent,
  type SessionCancelledEvent,
  type SessionSyncedEvent,
  type SessionConflictEvent,
  type FindLogAddedEvent,
  type FindLogUpdatedEvent,
  type FindLogDeletedEvent,
  type MetricsRecalculatedEvent,
  // Validation schemas
  SessionStateSchema,
  SyncStatusSchema,
  WeatherConditionSchema,
  SessionVisibilitySchema,
  GeoJSONPointSchema,
  GeoJSONLineStringSchema,
  CreateFieldSessionSchema,
  UpdateFieldSessionSchema,
  CreateFindLogSchema,
  UpdateFindLogSchema,
  SessionStateTransitionSchema,
  // Type inference helpers
  type CreateFieldSessionInput,
  type UpdateFieldSessionInput,
  type CreateFindLogInput,
  type UpdateFindLogInput,
  type SessionStateTransition,
  // Business logic functions
  isValidStateTransition,
  canAddFindLog,
  canFinalizeSession,
  canCancelSession,
  calculateSessionDuration,
  aggregateSessionMetrics,
  validateSessionForSync,
  // Sync queue
  type SyncQueueEntry,
  getSyncPriority,
  calculateNextRetry,
  SYNC_PRIORITIES,
  VALID_STATE_TRANSITIONS,
} from './field-session-schema';

// Export Specimen Identification Pipeline schema and types
export {
  // Enums
  CaptureState,
  PreprocessingStatus,
  ClassificationStatus,
  ImageQuality,
  LightingCondition,
  CameraMode,
  ValidationAction,
  ConfidenceLevel,
  // Interfaces
  type IdentificationCaptureSession,
  type RawCapture,
  type ProcessedCapture,
  type ClassificationResult,
  type ValidationEvent,
  type EXIFMetadata,
  type PreprocessingStep,
  type ImageQualityMetrics,
  type DetectedFeatures,
  type RGB,
  type ColorHistogram,
  type TextureFeatures,
  type AlternativePrediction,
  type AttentionRegion,
  type SimilarSpecimen,
  type ConfidenceBreakdown,
  type CreateFindLogFromCapture,
  // Event types
  type PipelineEvent,
  type BasePipelineEvent,
  type CaptureSessionCreatedEvent,
  type RawCaptureAddedEvent,
  type PreprocessingCompletedEvent,
  type ClassificationCompletedEvent,
  type ValidationSubmittedEvent,
  type FindLogCreatedFromCaptureEvent,
  // Validation schemas
  CreateCaptureSessionSchema,
  CreateRawCaptureSchema,
  CreateClassificationResultSchema,
  CreateValidationEventSchema,
  // Type inference helpers
  type CreateCaptureSessionInput,
  type CreateRawCaptureInput,
  type CreateClassificationResultInput,
  type CreateValidationEventInput,
  // Business logic functions
  getConfidenceLevel,
  shouldAutoAccept,
  requiresManualIdentification,
  calculateImageQualityScore,
  assessImageQuality,
  determineNextState,
  validateCaptureForSync,
  buildFindLogFromCapture,
  // Sync integration
  getPipelineSyncPriority,
  PIPELINE_SYNC_PRIORITIES,
} from './specimen-identification-schema';

// Export Collection Management schema and types
export {
  // Enums
  SpecimenState,
  SpecimenCondition,
  AcquisitionMethod,
  StorageLocationType,
  TagType,
  CollectionGroupType,
  // Interfaces
  type Specimen,
  type StorageLocation,
  type Tag,
  type CollectionGroup,
  type SpecimenTag,
  type CollectionGroupSpecimen,
  // Event types
  type CollectionEvent,
  type BaseCollectionEvent,
  type SpecimenCreatedFromFindLogEvent,
  type SpecimenStateChangedEvent,
  type SpecimenStoredEvent,
  type SpecimenAddedToGroupEvent,
  type SpecimenTaggedEvent,
  type SpecimenSentToStudioEvent,
  type StorageLocationCreatedEvent,
  type CollectionGroupCreatedEvent,
  type TagCreatedEvent,
  // Validation schemas
  SpecimenSchema,
  StorageLocationSchema,
  TagSchema,
  CollectionGroupSchema,
  // Business logic functions
  isValidSpecimenTransition,
  getAllowedNextStates,
  generateSpecimenNumber,
  parseSpecimenNumber,
  buildSpecimenFromFindLog,
  calculateCollectionGroupValue,
  generateStorageLocationCode,
  buildStorageLocationPath,
  isStorageLocationFull,
  getAvailableCapacity,
  // CRUD operations
  createSpecimenFromFindLog,
  changeSpecimenState,
  moveSpecimenToStorage,
  addSpecimenToGroup,
  tagSpecimen,
  sendSpecimenToStudio,
  // Sync integration
  COLLECTION_SYNC_PRIORITIES,
} from './collection-management-schema';

// Export Collection Analytics schema and types
export {
  // Enums
  AnalyticsLevel,
  TimePeriodGranularity,
  CacheStatus,
  // Core analytics interfaces
  type UserAnalytics,
  type StorageLocationAnalytics,
  type TagAnalytics,
  type CollectionGroupAnalytics,
  type MaterialAnalytics,
  type TimePeriodAnalytics,
  type AnalyticsCache,
  type AnalyticsUpdateEvent,
  // Supporting types
  type MaterialCount,
  type VarietyCount,
  type HistogramBin,
  type StorageUtilization,
  type TagCooccurrence,
  type StorageLocationCount,
  type TagCount,
  type CollectionGroupCount,
  type LocationCount,
  type AcquisitionSource,
  type GrowthDataPoint,
  // Validation schemas
  MaterialCountSchema,
  HistogramBinSchema,
  StorageUtilizationSchema,
  UserAnalyticsSchema,
  // Aggregation functions
  calculateUserAnalytics,
  calculateMaterialDiversity,
  calculateCompletenessScore,
  calculateConditionQualityScore,
  // Cache functions
  generateCacheKey,
  isCacheFresh,
  calculateCacheTTL,
  getInvalidationDependencies,
  // Constants
  DEFAULT_WEIGHT_BINS,
  DEFAULT_VALUE_BINS,
} from './collection-analytics-schema';

// Export Storage, Caching and Offline-First types
export {
  // Enums
  EvictionPolicy,
  StorageEntityType,
  // Storage metadata
  StorageMetadataSchema,
  type StorageMetadata,
  // Cached entity types
  CachedEntitySchema,
  type CachedEntity,
  CachedFieldSessionSchema,
  type CachedFieldSession,
  CachedFindLogSchema,
  type CachedFindLog,
  CachedSpecimenSchema,
  type CachedSpecimen,
  CachedCaptureSessionSchema,
  type CachedCaptureSession,
  CachedRawCaptureSchema,
  type CachedRawCapture,
  CachedProcessedCaptureSchema,
  type CachedProcessedCapture,
  CachedStorageLocationSchema,
  type CachedStorageLocation,
  CachedCollectionGroupSchema,
  type CachedCollectionGroup,
  CachedTagSchema,
  type CachedTag,
  CachedAnalyticsCacheSchema,
  type CachedAnalyticsCache,
  CachedTelemetryEventSchema,
  type CachedTelemetryEvent,
  CachedSyncQueueItemSchema,
  type CachedSyncQueueItem,
  // Storage configuration
  StorageConfigSchema,
  type StorageConfig,
  // Storage stats and health
  StorageStatsSchema,
  type StorageStats,
  StorageHealthSchema,
  type StorageHealth,
  // Storage utility functions
  getSerializationRules,
  generateStorageKey,
  parseStorageKey,
  calculateTTLExpiry,
  isExpired,
  isStale,
  computeChecksum,
  verifyChecksum,
  // Constants
  DEFAULT_TTL_MS,
  SYNC_QUEUE_TTL_MS,
  TELEMETRY_TTL_MS,
  ANALYTICS_CACHE_TTL_MS,
  THUMBNAIL_TTL_MS,
  MAX_STORAGE_SIZE_BYTES,
  MAX_SINGLE_ENTITY_SIZE_BYTES,
  COMPACTION_THRESHOLD_BYTES,
} from './storage-schema';

// Export Storage Adapter types and factory
export {
  type StorageAdapter,
  StorageAdapterFactory,
} from './storage-adapters';

// Export Telemetry types and schemas
export * from './telemetry';

// Export Sync Engine types and schemas
export * from './sync-engine';
