/**
 * Rockhound FindLog Schema
 * 
 * Comprehensive schema for logging individual finds within a FieldSession.
 * Includes material identification, GPS coordinates, photos, environmental 
 * metadata, quality ratings, and relationships to Specimens and FieldSessions.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ==================== ENUMS ====================

/**
 * Material types found during sessions
 */
export enum MaterialType {
  MINERAL = 'MINERAL',
  ROCK = 'ROCK',
  CRYSTAL = 'CRYSTAL',
  FOSSIL = 'FOSSIL',
  GEODE = 'GEODE',
  SPECIMEN = 'SPECIMEN',
  ORE = 'ORE',
  METEORITE = 'METEORITE',
  GEMSTONE = 'GEMSTONE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Confidence levels for material identification
 */
export enum IdentificationConfidence {
  CERTAIN = 'CERTAIN',           // 95-100% confident
  VERY_LIKELY = 'VERY_LIKELY',   // 80-95% confident
  LIKELY = 'LIKELY',             // 65-80% confident
  POSSIBLE = 'POSSIBLE',         // 50-65% confident
  UNCERTAIN = 'UNCERTAIN',       // 25-50% confident
  GUESS = 'GUESS',               // <25% confident
  UNIDENTIFIED = 'UNIDENTIFIED', // No identification attempted
}

/**
 * Quality/condition ratings for finds
 */
export enum QualityRating {
  PRISTINE = 'PRISTINE',         // 95-100% condition
  EXCELLENT = 'EXCELLENT',       // 85-95% condition
  VERY_GOOD = 'VERY_GOOD',       // 75-85% condition
  GOOD = 'GOOD',                 // 60-75% condition
  FAIR = 'FAIR',                 // 45-60% condition
  POOR = 'POOR',                 // 25-45% condition
  FRAGMENTARY = 'FRAGMENTARY',   // <25% condition
}

/**
 * Environmental factors affecting the find
 */
export enum EnvironmentalFactor {
  WEATHERED = 'WEATHERED',
  OXIDIZED = 'OXIDIZED',
  WATER_WORN = 'WATER_WORN',
  FRACTURED = 'FRACTURED',
  COATED = 'COATED',
  PARTIALLY_BURIED = 'PARTIALLY_BURIED',
  IN_MATRIX = 'IN_MATRIX',
  SURFACE = 'SURFACE',
  EXCAVATED = 'EXCAVATED',
  POLISHED = 'POLISHED',
}

/**
 * Size classification
 */
export enum SizeClass {
  MICROSCOPIC = 'MICROSCOPIC',   // <1mm
  VERY_SMALL = 'VERY_SMALL',     // 1-5mm
  SMALL = 'SMALL',               // 5-20mm
  MEDIUM = 'MEDIUM',             // 20-100mm
  LARGE = 'LARGE',               // 100-500mm
  VERY_LARGE = 'VERY_LARGE',     // >500mm
}

/**
 * Find lifecycle states
 */
export enum FindLogState {
  DRAFT = 'DRAFT',               // Being recorded
  SUBMITTED = 'SUBMITTED',       // Ready for review
  VERIFIED = 'VERIFIED',         // Verified by expert
  ARCHIVED = 'ARCHIVED',         // Archived/historical
  DELETED = 'DELETED',           // Soft delete
}

/**
 * Sync status for server synchronization
 */
export enum FindLogSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
}

// ==================== SCHEMAS ====================

/**
 * Geographic point with coordinates
 */
export const GeoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  timestamp: z.string().datetime(),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

/**
 * Photo metadata
 */
export const PhotoMetadataSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().positive(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  exifData: z.record(z.any()).optional(),
  coordinates: GeoPointSchema.optional(),
  isReference: z.boolean().default(false), // Primary identification photo
});

export type PhotoMetadata = z.infer<typeof PhotoMetadataSchema>;

/**
 * Material identification details
 */
export const MaterialIdentificationSchema = z.object({
  materialType: z.nativeEnum(MaterialType),
  primaryName: z.string().min(1).max(200), // e.g., "Quartz", "Hematite"
  secondaryName: z.string().optional(),     // e.g., "Rose Quartz"
  confidence: z.nativeEnum(IdentificationConfidence),
  notes: z.string().optional(),
  references: z.array(z.string()).default([]), // External references, papers, websites
  identifiedBy: z.string().optional(),     // Person or AI system that identified it
  identifiedAt: z.string().datetime().optional(),
});

export type MaterialIdentification = z.infer<typeof MaterialIdentificationSchema>;

/**
 * Specimen characteristics
 */
export const SpecimenCharacteristicsSchema = z.object({
  sizeClass: z.nativeEnum(SizeClass),
  estimatedSize: z.object({
    length_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    height_mm: z.number().positive().optional(),
    weight_g: z.number().positive().optional(),
  }).optional(),
  color: z.string().optional(),             // Color description
  luster: z.enum(['METALLIC', 'VITREOUS', 'SILKY', 'MATTE', 'PEARLY', 'ADAMANTINE']).optional(),
  transparency: z.enum(['TRANSPARENT', 'TRANSLUCENT', 'OPAQUE']).optional(),
  cleavage: z.string().optional(),
  hardness: z.number().min(1).max(10).optional(),
  streak: z.string().optional(),
  magnetism: z.boolean().optional(),
  fluorescence: z.string().optional(),
});

export type SpecimenCharacteristics = z.infer<typeof SpecimenCharacteristicsSchema>;

/**
 * Environmental metadata from the time of discovery
 */
export const EnvironmentalMetadataSchema = z.object({
  factors: z.array(z.nativeEnum(EnvironmentalFactor)).default([]),
  temperature_c: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  weatherCondition: z.string().optional(),
  soilType: z.string().optional(),
  hostRock: z.string().optional(),          // Rock the specimen was found in/on
  depth_cm: z.number().optional(),          // Depth below surface
  exposure: z.enum(['SURFACE', 'EXCAVATED', 'EXPOSED']).optional(),
});

export type EnvironmentalMetadata = z.infer<typeof EnvironmentalMetadataSchema>;

/**
 * Quality assessment
 */
export const QualityAssessmentSchema = z.object({
  rating: z.nativeEnum(QualityRating),
  conditionNotes: z.string().optional(),
  damageDescription: z.string().optional(),
  repairPotential: z.boolean().optional(),
  collectionValue: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).optional(),
});

export type QualityAssessment = z.infer<typeof QualityAssessmentSchema>;

/**
 * Main FindLog entity schema
 */
export const FindLogSchema = z.object({
  // Identifiers
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  field_session_id: z.string().uuid(),
  
  // Material Identification
  identification: MaterialIdentificationSchema,
  characteristics: SpecimenCharacteristicsSchema,
  quality: QualityAssessmentSchema,
  
  // Location & Environment
  location: GeoPointSchema,
  coordinates_polygon: z.string().optional(), // GeoJSON polygon for area
  environmental_metadata: EnvironmentalMetadataSchema,
  
  // Photos
  photo_ids: z.array(z.string().uuid()).default([]),
  photos: z.array(PhotoMetadataSchema).default([]),
  
  // Related Data
  specimen_ids: z.array(z.string().uuid()).default([]), // Linked Specimen entities
  notes: z.string().optional(),
  field_notes: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    addedAt: z.string().datetime(),
  })).default([]),
  
  // State & Status
  state: z.nativeEnum(FindLogState).default(FindLogState.DRAFT),
  sync_status: z.nativeEnum(FindLogSyncStatus).default(FindLogSyncStatus.PENDING),
  is_private: z.boolean().default(false),    // Private finds (not shared)
  is_favorite: z.boolean().default(false),   // User marked as favorite
  
  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  submitted_at: z.string().datetime().optional(),
  verified_at: z.string().datetime().optional(),
  verified_by: z.string().optional(),        // Verifier user ID
  
  // Sync Tracking
  synced_at: z.string().datetime().optional(),
  last_sync_error: z.string().optional(),
  checksum_hash: z.string().optional(),
  is_offline: z.boolean().default(false),
  
  // Versioning
  version: z.number().default(1),
  schema_version: z.number().default(1),
});

export type FindLog = z.infer<typeof FindLogSchema>;

/**
 * Create FindLog input
 */
export const CreateFindLogInput = FindLogSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
  synced_at: true,
  last_sync_error: true,
  checksum_hash: true,
  sync_status: true,
  state: true,
  submitted_at: true,
  verified_at: true,
  verified_by: true,
}).partial({
  photos: true,
  field_notes: true,
  notes: true,
});

export type CreateFindLogInput = z.infer<typeof CreateFindLogInput>;

/**
 * Update FindLog input
 */
export const UpdateFindLogInput = FindLogSchema.omit({
  id: true,
  user_id: true,
  field_session_id: true,
  created_at: true,
  updated_at: true,
  synced_at: true,
  sync_status: true,
  checksum_hash: true,
}).partial();

export type UpdateFindLogInput = z.infer<typeof UpdateFindLogInput>;

/**
 * Query filter for FindLogs
 */
export const FindLogQueryFilterSchema = z.object({
  userId: z.string().uuid(),
  fieldSessionId: z.string().uuid().optional(),
  materialTypes: z.array(z.nativeEnum(MaterialType)).optional(),
  confidenceFilter: z.array(z.nativeEnum(IdentificationConfidence)).optional(),
  qualityFilter: z.array(z.nativeEnum(QualityRating)).optional(),
  sizeClass: z.nativeEnum(SizeClass).optional(),
  hasPhotos: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  state: z.array(z.nativeEnum(FindLogState)).optional(),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }).optional(),
  nearbyLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().positive(),
  }).optional(),
  sortBy: z.enum(['CREATED', 'QUALITY', 'CONFIDENCE', 'DISTANCE']).default('CREATED'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  pagination: z.object({
    page: z.number().positive().default(1),
    pageSize: z.number().positive().max(100).default(20),
  }).optional(),
});

export type FindLogQueryFilter = z.infer<typeof FindLogQueryFilterSchema>;

/**
 * FindLog list response
 */
export const FindLogListResponseSchema = z.object({
  finds: z.array(FindLogSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});

export type FindLogListResponse = z.infer<typeof FindLogListResponseSchema>;

// ==================== CONSTANTS ====================

export const FIND_LOG_STORAGE_KEY = 'find_log';
export const FIND_LOG_ENTITY_TYPE = 'find_log';
export const CURRENT_FIND_LOG_VERSION = 1;

/**
 * Valid state transitions for FindLog lifecycle
 */
export const FIND_LOG_STATE_TRANSITIONS: Record<FindLogState, FindLogState[]> = {
  [FindLogState.DRAFT]: [FindLogState.SUBMITTED, FindLogState.DELETED],
  [FindLogState.SUBMITTED]: [FindLogState.VERIFIED, FindLogState.DRAFT, FindLogState.DELETED],
  [FindLogState.VERIFIED]: [FindLogState.ARCHIVED, FindLogState.DELETED],
  [FindLogState.ARCHIVED]: [FindLogState.DELETED],
  [FindLogState.DELETED]: [],
};

/**
 * Confidence to numeric value mapping for sorting
 */
export const CONFIDENCE_SCORES: Record<IdentificationConfidence, number> = {
  [IdentificationConfidence.CERTAIN]: 100,
  [IdentificationConfidence.VERY_LIKELY]: 90,
  [IdentificationConfidence.LIKELY]: 72,
  [IdentificationConfidence.POSSIBLE]: 57,
  [IdentificationConfidence.UNCERTAIN]: 37,
  [IdentificationConfidence.GUESS]: 12,
  [IdentificationConfidence.UNIDENTIFIED]: 0,
};

/**
 * Quality to numeric value mapping for sorting
 */
export const QUALITY_SCORES: Record<QualityRating, number> = {
  [QualityRating.PRISTINE]: 97,
  [QualityRating.EXCELLENT]: 90,
  [QualityRating.VERY_GOOD]: 80,
  [QualityRating.GOOD]: 67,
  [QualityRating.FAIR]: 52,
  [QualityRating.POOR]: 35,
  [QualityRating.FRAGMENTARY]: 12,
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create new FindLog
 */
export function createNewFindLog(
  userId: string,
  fieldSessionId: string,
  input: Omit<CreateFindLogInput, 'field_session_id'>
): FindLog {
  const now = new Date().toISOString();
  
  return {
    id: uuidv4(),
    user_id: userId,
    field_session_id: fieldSessionId,
    created_at: now,
    updated_at: now,
    state: FindLogState.DRAFT,
    sync_status: FindLogSyncStatus.PENDING,
    ...input,
    photos: input.photos ?? [],
    field_notes: input.field_notes ?? [],
    version: CURRENT_FIND_LOG_VERSION,
    schema_version: CURRENT_FIND_LOG_VERSION,
  };
}

/**
 * Validate FindLog
 */
export function validateFindLog(findLog: unknown): { valid: boolean; errors?: string[] } {
  const result = FindLogSchema.safeParse(findLog);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
  
  return { valid: true };
}

/**
 * Check if state transition is valid
 */
export function isValidFindLogStateTransition(
  fromState: FindLogState,
  toState: FindLogState
): boolean {
  return FIND_LOG_STATE_TRANSITIONS[fromState]?.includes(toState) ?? false;
}

/**
 * Calculate Haversine distance between two points
 */
export function calculateDistance(
  point1: GeoPoint,
  point2: GeoPoint
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate combined score for find (confidence + quality)
 */
export function calculateFindScore(
  confidenceLevel: IdentificationConfidence,
  qualityRating: QualityRating
): number {
  const confidenceScore = CONFIDENCE_SCORES[confidenceLevel];
  const qualityScore = QUALITY_SCORES[qualityRating];
  
  // Weighted average: 60% confidence, 40% quality
  return Math.round((confidenceScore * 0.6 + qualityScore * 0.4));
}

/**
 * Get display name for material type
 */
export function getMaterialTypeDisplay(type: MaterialType): string {
  const display: Record<MaterialType, string> = {
    [MaterialType.MINERAL]: '💎 Mineral',
    [MaterialType.ROCK]: '🪨 Rock',
    [MaterialType.CRYSTAL]: '✨ Crystal',
    [MaterialType.FOSSIL]: '🦴 Fossil',
    [MaterialType.GEODE]: '🔮 Geode',
    [MaterialType.SPECIMEN]: '📦 Specimen',
    [MaterialType.ORE]: '⛏️ Ore',
    [MaterialType.METEORITE]: '☄️ Meteorite',
    [MaterialType.GEMSTONE]: '💍 Gemstone',
    [MaterialType.UNKNOWN]: '❓ Unknown',
  };
  
  return display[type] || type;
}

/**
 * Get display name for confidence level
 */
export function getConfidenceDisplay(confidence: IdentificationConfidence): string {
  const display: Record<IdentificationConfidence, string> = {
    [IdentificationConfidence.CERTAIN]: '✓✓ Certain',
    [IdentificationConfidence.VERY_LIKELY]: '✓ Very Likely',
    [IdentificationConfidence.LIKELY]: 'Likely',
    [IdentificationConfidence.POSSIBLE]: '? Possible',
    [IdentificationConfidence.UNCERTAIN]: '?? Uncertain',
    [IdentificationConfidence.GUESS]: '??? Guess',
    [IdentificationConfidence.UNIDENTIFIED]: 'Not ID\'d',
  };
  
  return display[confidence] || confidence;
}

/**
 * Get display name for quality rating
 */
export function getQualityDisplay(rating: QualityRating): string {
  const display: Record<QualityRating, string> = {
    [QualityRating.PRISTINE]: '⭐⭐⭐⭐⭐ Pristine',
    [QualityRating.EXCELLENT]: '⭐⭐⭐⭐ Excellent',
    [QualityRating.VERY_GOOD]: '⭐⭐⭐ Very Good',
    [QualityRating.GOOD]: '⭐⭐ Good',
    [QualityRating.FAIR]: '⭐ Fair',
    [QualityRating.POOR]: 'Poor',
    [QualityRating.FRAGMENTARY]: 'Fragmentary',
  };
  
  return display[rating] || rating;
}

/**
 * Compute checksum for find integrity checking
 */
export function computeFindLogChecksum(find: FindLog): string {
  const data = JSON.stringify({
    id: find.id,
    identification: find.identification,
    characteristics: find.characteristics,
    quality: find.quality,
    location: find.location,
    photo_ids: find.photo_ids,
    specimen_ids: find.specimen_ids,
    state: find.state,
  });
  
  // Simple hash (in production, use crypto.sha256)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Check if find is near a location
 */
export function isFindNearLocation(
  find: FindLog,
  location: GeoPoint,
  radiusKm: number
): boolean {
  const distance = calculateDistance(find.location, location);
  return distance <= radiusKm * 1000;
}

/**
 * Filter finds by material type
 */
export function filterFindsByMaterial(
  finds: FindLog[],
  materials: MaterialType[]
): FindLog[] {
  return finds.filter(f => materials.includes(f.identification.materialType));
}

/**
 * Filter finds by quality range
 */
export function filterFindsByQuality(
  finds: FindLog[],
  qualities: QualityRating[]
): FindLog[] {
  return finds.filter(f => qualities.includes(f.quality.rating));
}

/**
 * Filter finds by confidence level
 */
export function filterFindsByConfidence(
  finds: FindLog[],
  confidences: IdentificationConfidence[]
): FindLog[] {
  return finds.filter(f => confidences.includes(f.identification.confidence));
}

/**
 * Sort finds by field
 */
export function sortFinds(
  finds: FindLog[],
  sortBy: 'CREATED' | 'QUALITY' | 'CONFIDENCE' | 'DISTANCE',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): FindLog[] {
  const sorted = [...finds];
  const isAsc = sortOrder === 'ASC';
  
  switch (sortBy) {
    case 'CREATED':
      sorted.sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return isAsc ? diff : -diff;
      });
      break;
    
    case 'QUALITY':
      sorted.sort((a, b) => {
        const diff = QUALITY_SCORES[b.quality.rating] - QUALITY_SCORES[a.quality.rating];
        return isAsc ? -diff : diff;
      });
      break;
    
    case 'CONFIDENCE':
      sorted.sort((a, b) => {
        const diff = CONFIDENCE_SCORES[b.identification.confidence] - CONFIDENCE_SCORES[a.identification.confidence];
        return isAsc ? -diff : diff;
      });
      break;
    
    case 'DISTANCE':
      // This requires a reference point, usually handled at query level
      break;
  }
  
  return sorted;
}

/**
 * Get find status display
 */
export function getFindStatusDisplay(state: FindLogState): string {
  const display: Record<FindLogState, string> = {
    [FindLogState.DRAFT]: '✏️ Draft',
    [FindLogState.SUBMITTED]: '📤 Submitted',
    [FindLogState.VERIFIED]: '✅ Verified',
    [FindLogState.ARCHIVED]: '📦 Archived',
    [FindLogState.DELETED]: '🗑️ Deleted',
  };
  
  return display[state] || state;
}

/**
 * Calculate total specimens from finds
 */
export function calculateTotalSpecimens(finds: FindLog[]): number {
  return finds.reduce((sum, f) => sum + f.specimen_ids.length, 0);
}

/**
 * Calculate specimen distribution by material
 */
export function getSpecimenDistributionByMaterial(
  finds: FindLog[]
): Record<MaterialType, number> {
  const distribution: Record<MaterialType, number> = {} as any;
  
  finds.forEach(find => {
    const material = find.identification.materialType;
    distribution[material] = (distribution[material] || 0) + find.specimen_ids.length;
  });
  
  return distribution;
}

/**
 * Calculate average quality score
 */
export function calculateAverageQuality(finds: FindLog[]): number {
  if (finds.length === 0) return 0;
  
  const sum = finds.reduce((acc, f) => acc + QUALITY_SCORES[f.quality.rating], 0);
  return Math.round(sum / finds.length);
}

/**
 * Calculate average confidence score
 */
export function calculateAverageConfidence(finds: FindLog[]): number {
  if (finds.length === 0) return 0;
  
  const sum = finds.reduce((acc, f) => acc + CONFIDENCE_SCORES[f.identification.confidence], 0);
  return Math.round(sum / finds.length);
}
