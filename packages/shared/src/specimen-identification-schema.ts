/**
 * Specimen Identification Pipeline Schema
 * 
 * Complete architecture for camera-based specimen identification with:
 * - Camera capture flow with metadata extraction
 * - Multi-stage preprocessing pipeline
 * - ML-based classification with confidence scoring
 * - User validation loop for ground truth collection
 * - Deterministic event model for offline replay
 * - Integration with FindLog and FieldSession
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Capture session state
 * Tracks progress through identification pipeline
 */
export enum CaptureState {
  /** Camera initialized, ready to capture */
  READY = 'READY',
  
  /** Image captured, awaiting processing */
  CAPTURED = 'CAPTURED',
  
  /** Preprocessing in progress */
  PREPROCESSING = 'PREPROCESSING',
  
  /** Classification in progress */
  CLASSIFYING = 'CLASSIFYING',
  
  /** Classification complete, awaiting user validation */
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  
  /** User validated classification */
  VALIDATED = 'VALIDATED',
  
  /** User rejected classification, requires reclassification */
  REJECTED = 'REJECTED',
  
  /** Manual identification required (no confident prediction) */
  MANUAL_REQUIRED = 'MANUAL_REQUIRED',
  
  /** Capture cancelled or discarded */
  CANCELLED = 'CANCELLED',
  
  /** Processing failed */
  FAILED = 'FAILED',
}

/**
 * Image preprocessing status
 */
export enum PreprocessingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Classification status
 */
export enum ClassificationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
}

/**
 * Image quality assessment
 */
export enum ImageQuality {
  /** High quality, suitable for classification */
  EXCELLENT = 'EXCELLENT',
  
  /** Good quality, suitable for classification */
  GOOD = 'GOOD',
  
  /** Acceptable quality, may reduce confidence */
  ACCEPTABLE = 'ACCEPTABLE',
  
  /** Poor quality, classification unreliable */
  POOR = 'POOR',
  
  /** Unusable, requires retake */
  UNUSABLE = 'UNUSABLE',
}

/**
 * Lighting conditions
 */
export enum LightingCondition {
  NATURAL_BRIGHT = 'NATURAL_BRIGHT',
  NATURAL_CLOUDY = 'NATURAL_CLOUDY',
  NATURAL_SHADE = 'NATURAL_SHADE',
  ARTIFICIAL_BRIGHT = 'ARTIFICIAL_BRIGHT',
  ARTIFICIAL_DIM = 'ARTIFICIAL_DIM',
  MIXED = 'MIXED',
  BACKLIT = 'BACKLIT',
  OVEREXPOSED = 'OVEREXPOSED',
  UNDEREXPOSED = 'UNDEREXPOSED',
}

/**
 * Camera mode
 */
export enum CameraMode {
  /** Standard photo mode */
  PHOTO = 'PHOTO',
  
  /** Macro mode for close-up detail */
  MACRO = 'MACRO',
  
  /** HDR for high contrast scenes */
  HDR = 'HDR',
  
  /** Multiple angles for 3D reconstruction */
  MULTI_ANGLE = 'MULTI_ANGLE',
}

/**
 * Validation action taken by user
 */
export enum ValidationAction {
  /** User confirmed classification is correct */
  ACCEPT = 'ACCEPT',
  
  /** User rejected, selected different material */
  REJECT_WITH_CORRECTION = 'REJECT_WITH_CORRECTION',
  
  /** User rejected, unsure of correct material */
  REJECT_UNCERTAIN = 'REJECT_UNCERTAIN',
  
  /** User marked as requiring expert review */
  REQUEST_EXPERT = 'REQUEST_EXPERT',
  
  /** User skipped validation */
  SKIP = 'SKIP',
}

/**
 * Confidence level categories
 */
export enum ConfidenceLevel {
  /** >= 95% confidence */
  VERY_HIGH = 'VERY_HIGH',
  
  /** >= 85% confidence */
  HIGH = 'HIGH',
  
  /** >= 70% confidence */
  MODERATE = 'MODERATE',
  
  /** >= 50% confidence */
  LOW = 'LOW',
  
  /** < 50% confidence */
  VERY_LOW = 'VERY_LOW',
}

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

/**
 * IdentificationCaptureSession - Container for entire identification workflow
 * Links capture → preprocessing → classification → validation
 */
export interface IdentificationCaptureSession {
  /** Unique identifier */
  id: string;
  
  /** User who initiated capture */
  user_id: string;
  
  /** Parent field session (if capturing during active session) */
  field_session_id?: string;
  
  /** FindLog this capture is associated with */
  find_log_id?: string;
  
  /** Device identifier */
  device_id: string;
  
  /** Current state in pipeline */
  state: CaptureState;
  
  /** Camera mode used */
  camera_mode: CameraMode;
  
  /** Number of images in this session */
  image_count: number;
  
  /** Primary capture (for multi-angle) */
  primary_capture_id?: string;
  
  /** Temporal data */
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  
  /** GPS location where captured */
  geom?: GeoJSONPoint;
  lat?: number;
  lon?: number;
  
  /** Environmental context */
  lighting_condition?: LightingCondition;
  weather_condition?: string;
  
  /** Processing results */
  best_classification_result_id?: string;
  final_material_id?: string;
  user_validated: boolean;
  validation_timestamp?: Date;
  
  /** Sync metadata */
  sync_status: SyncStatus;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  
  /** Database metadata */
  created_at: Date;
  updated_at: Date;
}

/**
 * RawCapture - Original image data with EXIF metadata
 */
export interface RawCapture {
  /** Unique identifier */
  id: string;
  
  /** Parent capture session */
  capture_session_id: string;
  
  /** User who captured */
  user_id: string;
  
  /** Device identifier */
  device_id: string;
  
  /** Storage path for raw image */
  storage_path: string;
  
  /** Original file name */
  original_filename: string;
  
  /** MIME type */
  mime_type: string;
  
  /** File size in bytes */
  file_size_bytes: number;
  
  /** Image dimensions */
  width_px: number;
  height_px: number;
  
  /** EXIF Metadata */
  exif_data?: EXIFMetadata;
  
  /** Camera metadata */
  camera_make?: string;
  camera_model?: string;
  lens_model?: string;
  
  /** Capture settings */
  iso?: number;
  aperture?: number;
  shutter_speed?: string;
  focal_length_mm?: number;
  flash_fired?: boolean;
  
  /** GPS metadata (from EXIF) */
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude_m?: number;
  gps_timestamp?: Date;
  
  /** Orientation */
  orientation?: number; // EXIF orientation (1-8)
  
  /** Color space */
  color_space?: string;
  
  /** Initial quality assessment */
  initial_quality?: ImageQuality;
  
  /** Capture timestamp */
  captured_at: Date;
  
  /** Sync metadata */
  sync_status: SyncStatus;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  
  /** Database metadata */
  created_at: Date;
  updated_at: Date;
}

/**
 * ProcessedCapture - Preprocessed image ready for classification
 */
export interface ProcessedCapture {
  /** Unique identifier */
  id: string;
  
  /** Source raw capture */
  raw_capture_id: string;
  
  /** Parent capture session */
  capture_session_id: string;
  
  /** User identifier */
  user_id: string;
  
  /** Processing status */
  status: PreprocessingStatus;
  
  /** Storage path for processed image */
  processed_storage_path: string;
  
  /** Processing pipeline version */
  pipeline_version: string;
  
  /** Preprocessing steps applied */
  preprocessing_steps: PreprocessingStep[];
  
  /** Processed image dimensions */
  width_px: number;
  height_px: number;
  
  /** File size after processing */
  file_size_bytes: number;
  
  /** Image quality metrics */
  quality_metrics: ImageQualityMetrics;
  
  /** Overall quality assessment */
  quality_assessment: ImageQuality;
  
  /** Detected features */
  detected_features?: DetectedFeatures;
  
  /** Color histogram */
  color_histogram?: ColorHistogram;
  
  /** Texture features */
  texture_features?: TextureFeatures;
  
  /** Edge detection results */
  edge_density?: number;
  
  /** Blur detection score (0-1, higher = more blur) */
  blur_score?: number;
  
  /** Processing duration */
  processing_time_ms: number;
  
  /** Processing errors */
  errors?: string[];
  
  /** Timestamps */
  processing_started_at: Date;
  processing_completed_at?: Date;
  
  /** Sync metadata */
  sync_status: SyncStatus;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  
  /** Database metadata */
  created_at: Date;
  updated_at: Date;
}

/**
 * ClassificationResult - ML model prediction output
 */
export interface ClassificationResult {
  /** Unique identifier */
  id: string;
  
  /** Source processed capture */
  processed_capture_id: string;
  
  /** Parent capture session */
  capture_session_id: string;
  
  /** User identifier */
  user_id: string;
  
  /** Classification status */
  status: ClassificationStatus;
  
  /** Model information */
  model_name: string;
  model_version: string;
  
  /** Top prediction */
  predicted_material_id: string;
  predicted_material_name: string;
  confidence_score: number; // 0.0 - 1.0
  confidence_level: ConfidenceLevel;
  
  /** Alternative predictions (ranked by confidence) */
  alternative_predictions: AlternativePrediction[];
  
  /** Classification features used */
  features_used: string[];
  
  /** Feature importance scores */
  feature_importance?: Record<string, number>;
  
  /** Activation maps / attention regions */
  attention_regions?: AttentionRegion[];
  
  /** Similar specimens from training set */
  similar_specimens?: SimilarSpecimen[];
  
  /** Classification metadata */
  classification_confidence_breakdown?: ConfidenceBreakdown;
  
  /** Uncertainty quantification */
  epistemic_uncertainty?: number; // Model uncertainty
  aleatoric_uncertainty?: number; // Data uncertainty
  
  /** Inference time */
  inference_time_ms: number;
  
  /** Timestamps */
  classified_at: Date;
  
  /** Sync metadata */
  sync_status: SyncStatus;
  client_created_at: Date;
  client_updated_at: Date;
  server_synced_at?: Date;
  version: number;
  
  /** Database metadata */
  created_at: Date;
  updated_at: Date;
}

/**
 * ValidationEvent - User validation of classification
 */
export interface ValidationEvent {
  /** Unique identifier */
  id: string;
  
  /** Classification result being validated */
  classification_result_id: string;
  
  /** Parent capture session */
  capture_session_id: string;
  
  /** User providing validation */
  user_id: string;
  
  /** Device identifier */
  device_id: string;
  
  /** Validation action */
  action: ValidationAction;
  
  /** Predicted material ID */
  predicted_material_id: string;
  
  /** Correct material ID (if user provided correction) */
  correct_material_id?: string;
  
  /** User feedback/notes */
  feedback_notes?: string;
  
  /** Time spent on validation (seconds) */
  validation_duration_seconds?: number;
  
  /** User confidence in their validation (1-5) */
  user_confidence?: number;
  
  /** Whether user is expert/verified */
  is_expert_validation: boolean;
  
  /** Sequence number (for event ordering) */
  sequence_number: number;
  
  /** Timestamp */
  validated_at: Date;
  
  /** Sync metadata */
  sync_status: SyncStatus;
  client_created_at: Date;
  server_synced_at?: Date;
  
  /** Database metadata */
  created_at: Date;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * GeoJSON Point geometry
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Sync status (reused from FieldSession)
 */
export enum SyncStatus {
  LOCAL_ONLY = 'LOCAL_ONLY',
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

/**
 * EXIF metadata from image
 */
export interface EXIFMetadata {
  make?: string;
  model?: string;
  datetime_original?: string;
  exposure_time?: string;
  f_number?: number;
  iso?: number;
  focal_length?: number;
  flash?: string;
  white_balance?: string;
  metering_mode?: string;
  orientation?: number;
  software?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  gps_timestamp?: string;
}

/**
 * Preprocessing step applied to image
 */
export interface PreprocessingStep {
  /** Step name */
  name: string;
  
  /** Parameters used */
  parameters?: Record<string, any>;
  
  /** Processing duration */
  duration_ms: number;
  
  /** Success flag */
  success: boolean;
  
  /** Error message if failed */
  error?: string;
}

/**
 * Image quality metrics
 */
export interface ImageQualityMetrics {
  /** Brightness (0-255) */
  brightness: number;
  
  /** Contrast (0-1) */
  contrast: number;
  
  /** Sharpness score (0-1, higher = sharper) */
  sharpness: number;
  
  /** Noise level (0-1, higher = more noise) */
  noise_level: number;
  
  /** Color saturation (0-1) */
  saturation: number;
  
  /** Exposure assessment (-1 = underexposed, 0 = correct, 1 = overexposed) */
  exposure: number;
  
  /** Focus quality (0-1) */
  focus_quality: number;
  
  /** Resolution adequacy for classification (0-1) */
  resolution_score: number;
}

/**
 * Detected features in image
 */
export interface DetectedFeatures {
  /** Dominant colors (RGB) */
  dominant_colors: RGB[];
  
  /** Texture patterns detected */
  texture_patterns: string[];
  
  /** Crystal structure detected */
  has_crystal_structure: boolean;
  
  /** Luster type */
  luster_type?: 'metallic' | 'vitreous' | 'pearly' | 'resinous' | 'silky' | 'dull';
  
  /** Surface characteristics */
  surface_characteristics: string[];
  
  /** Estimated size (if reference object detected) */
  estimated_size_mm?: number;
}

/**
 * RGB color value
 */
export interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
}

/**
 * Color histogram data
 */
export interface ColorHistogram {
  red: number[]; // 256 bins
  green: number[];
  blue: number[];
  hue: number[]; // 180 bins for HSV
  saturation: number[];
  value: number[];
}

/**
 * Texture features
 */
export interface TextureFeatures {
  /** Gray Level Co-occurrence Matrix features */
  glcm_contrast: number;
  glcm_dissimilarity: number;
  glcm_homogeneity: number;
  glcm_energy: number;
  glcm_correlation: number;
  
  /** Local Binary Pattern histogram */
  lbp_histogram?: number[];
  
  /** Gabor filter responses */
  gabor_features?: number[];
}

/**
 * Alternative prediction
 */
export interface AlternativePrediction {
  /** Material ID */
  material_id: string;
  
  /** Material name */
  material_name: string;
  
  /** Confidence score */
  confidence: number;
  
  /** Rank (1 = top alternative after primary) */
  rank: number;
  
  /** Reasons for this prediction */
  reasons?: string[];
}

/**
 * Attention region (where model focused)
 */
export interface AttentionRegion {
  /** Bounding box (x, y, width, height) */
  bbox: [number, number, number, number];
  
  /** Attention weight (0-1) */
  weight: number;
  
  /** Feature this region represents */
  feature_name?: string;
}

/**
 * Similar specimen from training set
 */
export interface SimilarSpecimen {
  /** Reference specimen ID */
  specimen_id: string;
  
  /** Material ID */
  material_id: string;
  
  /** Material name */
  material_name: string;
  
  /** Similarity score (0-1) */
  similarity: number;
  
  /** Image URL */
  image_url?: string;
  
  /** Source (e.g., "training_set", "user_validated") */
  source: string;
}

/**
 * Confidence breakdown
 */
export interface ConfidenceBreakdown {
  /** Visual features confidence */
  visual_confidence: number;
  
  /** Texture confidence */
  texture_confidence: number;
  
  /** Color confidence */
  color_confidence: number;
  
  /** Crystal structure confidence */
  structure_confidence: number;
  
  /** Overall model confidence */
  model_confidence: number;
}

// ============================================================================
// VALIDATION SCHEMAS (Zod)
// ============================================================================

/**
 * Capture session creation schema
 */
export const CreateCaptureSessionSchema = z.object({
  field_session_id: z.string().uuid().optional(),
  find_log_id: z.string().uuid().optional(),
  camera_mode: z.nativeEnum(CameraMode).default(CameraMode.PHOTO),
  lighting_condition: z.nativeEnum(LightingCondition).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  device_id: z.string().min(1),
});

/**
 * Raw capture creation schema
 */
export const CreateRawCaptureSchema = z.object({
  capture_session_id: z.string().uuid(),
  storage_path: z.string().min(1),
  original_filename: z.string().min(1),
  mime_type: z.string().regex(/^image\//),
  file_size_bytes: z.number().positive(),
  width_px: z.number().int().positive(),
  height_px: z.number().int().positive(),
  exif_data: z.any().optional(),
  camera_make: z.string().optional(),
  camera_model: z.string().optional(),
  captured_at: z.date().default(() => new Date()),
  device_id: z.string().min(1),
});

/**
 * Classification result creation schema
 */
export const CreateClassificationResultSchema = z.object({
  processed_capture_id: z.string().uuid(),
  capture_session_id: z.string().uuid(),
  model_name: z.string().min(1),
  model_version: z.string().min(1),
  predicted_material_id: z.string().uuid(),
  predicted_material_name: z.string().min(1),
  confidence_score: z.number().min(0).max(1),
  alternative_predictions: z.array(z.any()).default([]),
  inference_time_ms: z.number().nonnegative(),
});

/**
 * Validation event creation schema
 */
export const CreateValidationEventSchema = z.object({
  classification_result_id: z.string().uuid(),
  capture_session_id: z.string().uuid(),
  action: z.nativeEnum(ValidationAction),
  predicted_material_id: z.string().uuid(),
  correct_material_id: z.string().uuid().optional(),
  feedback_notes: z.string().max(1000).optional(),
  validation_duration_seconds: z.number().nonnegative().optional(),
  user_confidence: z.number().int().min(1).max(5).optional(),
  is_expert_validation: z.boolean().default(false),
  sequence_number: z.number().int().nonnegative(),
  device_id: z.string().min(1),
});

// ============================================================================
// PIPELINE BUSINESS LOGIC
// ============================================================================

/**
 * Determine confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.95) return ConfidenceLevel.VERY_HIGH;
  if (score >= 0.85) return ConfidenceLevel.HIGH;
  if (score >= 0.70) return ConfidenceLevel.MODERATE;
  if (score >= 0.50) return ConfidenceLevel.LOW;
  return ConfidenceLevel.VERY_LOW;
}

/**
 * Check if classification confidence is sufficient for auto-acceptance
 */
export function shouldAutoAccept(
  confidence: number,
  imageQuality: ImageQuality
): boolean {
  // Require very high confidence for auto-acceptance
  if (confidence < 0.95) return false;
  
  // Require at least good image quality
  if (![ImageQuality.EXCELLENT, ImageQuality.GOOD].includes(imageQuality)) {
    return false;
  }
  
  return true;
}

/**
 * Check if manual identification is required
 */
export function requiresManualIdentification(
  confidence: number,
  imageQuality: ImageQuality,
  alternatives: AlternativePrediction[]
): boolean {
  // Very low confidence always requires manual
  if (confidence < 0.50) return true;
  
  // Poor image quality requires manual
  if ([ImageQuality.POOR, ImageQuality.UNUSABLE].includes(imageQuality)) {
    return true;
  }
  
  // If top 2 predictions are very close, require manual
  if (alternatives.length > 0) {
    const topAlt = alternatives[0];
    if (topAlt && confidence - topAlt.confidence < 0.10) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate image quality score
 */
export function calculateImageQualityScore(
  metrics: ImageQualityMetrics
): number {
  // Weighted average of quality metrics
  const weights = {
    sharpness: 0.30,
    focus_quality: 0.25,
    exposure: 0.20,
    noise_level: 0.15, // Inverted (lower is better)
    resolution_score: 0.10,
  };
  
  const score = 
    metrics.sharpness * weights.sharpness +
    metrics.focus_quality * weights.focus_quality +
    (1 - Math.abs(metrics.exposure)) * weights.exposure +
    (1 - metrics.noise_level) * weights.noise_level +
    metrics.resolution_score * weights.resolution_score;
  
  return score;
}

/**
 * Map quality score to quality assessment
 */
export function assessImageQuality(score: number): ImageQuality {
  if (score >= 0.90) return ImageQuality.EXCELLENT;
  if (score >= 0.75) return ImageQuality.GOOD;
  if (score >= 0.60) return ImageQuality.ACCEPTABLE;
  if (score >= 0.40) return ImageQuality.POOR;
  return ImageQuality.UNUSABLE;
}

/**
 * Determine next state based on classification result
 */
export function determineNextState(
  confidence: number,
  imageQuality: ImageQuality,
  alternatives: AlternativePrediction[]
): CaptureState {
  if (requiresManualIdentification(confidence, imageQuality, alternatives)) {
    return CaptureState.MANUAL_REQUIRED;
  }
  
  if (shouldAutoAccept(confidence, imageQuality)) {
    return CaptureState.VALIDATED;
  }
  
  return CaptureState.PENDING_VALIDATION;
}

/**
 * Calculate processing pipeline metrics
 */
export function calculatePipelineMetrics(session: IdentificationCaptureSession): {
  total_duration_ms: number;
  capture_to_classification_ms: number;
  classification_to_validation_ms?: number;
} {
  const totalDuration = session.completed_at && session.started_at
    ? session.completed_at.getTime() - session.started_at.getTime()
    : 0;
  
  return {
    total_duration_ms: totalDuration,
    capture_to_classification_ms: 0, // Would need timestamps from child entities
    classification_to_validation_ms: session.validation_timestamp && session.completed_at
      ? session.validation_timestamp.getTime() - session.completed_at.getTime()
      : undefined,
  };
}

/**
 * Validate capture session for sync
 */
export function validateCaptureForSync(session: IdentificationCaptureSession): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!session.user_id) {
    errors.push('CaptureSession must have user_id');
  }
  
  if (!session.device_id) {
    errors.push('CaptureSession must have device_id');
  }
  
  if (session.image_count < 1) {
    errors.push('CaptureSession must have at least one image');
  }
  
  if (session.state === CaptureState.VALIDATED && !session.final_material_id) {
    errors.push('Validated session must have final_material_id');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// INTEGRATION WITH FINDLOG & FIELD SESSION
// ============================================================================

/**
 * Create FindLog from validated capture
 */
export interface CreateFindLogFromCapture {
  captureSession: IdentificationCaptureSession;
  classificationResult: ClassificationResult;
  rawCapture: RawCapture;
  processedCapture: ProcessedCapture;
  validationEvent?: ValidationEvent;
}

export function buildFindLogFromCapture(input: CreateFindLogFromCapture): {
  material_id: string;
  material_name: string;
  quality_rating: number;
  notes: string;
  photo_paths: string[];
  geom?: GeoJSONPoint;
  lat?: number;
  lon?: number;
  found_at: Date;
} {
  const { captureSession, classificationResult, rawCapture, validationEvent } = input;
  
  // Use validated material if available, otherwise use predicted
  const materialId = captureSession.final_material_id || classificationResult.predicted_material_id;
  const materialName = validationEvent?.correct_material_id 
    ? 'User Validated Material' 
    : classificationResult.predicted_material_name;
  
  // Generate quality rating based on confidence and image quality
  const qualityRating = Math.min(5, Math.max(1, Math.ceil(
    classificationResult.confidence_score * 5
  )));
  
  // Build notes with confidence info
  const notes = [
    `Identified via camera: ${materialName}`,
    `Confidence: ${(classificationResult.confidence_score * 100).toFixed(1)}%`,
    validationEvent?.action === ValidationAction.ACCEPT 
      ? 'User validated identification' 
      : '',
    validationEvent?.feedback_notes || '',
  ].filter(Boolean).join('\n');
  
  return {
    material_id: materialId,
    material_name: materialName,
    quality_rating: qualityRating,
    notes,
    photo_paths: [rawCapture.storage_path],
    geom: captureSession.geom,
    lat: captureSession.lat,
    lon: captureSession.lon,
    found_at: rawCapture.captured_at,
  };
}

// ============================================================================
// OFFLINE SYNC INTEGRATION
// ============================================================================

/**
 * Pipeline event types for sync queue
 */
export type PipelineEvent =
  | CaptureSessionCreatedEvent
  | RawCaptureAddedEvent
  | PreprocessingCompletedEvent
  | ClassificationCompletedEvent
  | ValidationSubmittedEvent
  | FindLogCreatedFromCaptureEvent;

/**
 * Base pipeline event
 */
export interface BasePipelineEvent {
  id: string;
  capture_session_id: string;
  user_id: string;
  type: string;
  timestamp: Date;
  device_id: string;
  sync_status: SyncStatus;
  sequence_number: number;
}

export interface CaptureSessionCreatedEvent extends BasePipelineEvent {
  type: 'capture_session.created';
  payload: {
    camera_mode: CameraMode;
    field_session_id?: string;
  };
}

export interface RawCaptureAddedEvent extends BasePipelineEvent {
  type: 'raw_capture.added';
  payload: {
    raw_capture_id: string;
    storage_path: string;
    file_size_bytes: number;
  };
}

export interface PreprocessingCompletedEvent extends BasePipelineEvent {
  type: 'preprocessing.completed';
  payload: {
    processed_capture_id: string;
    quality_assessment: ImageQuality;
    processing_time_ms: number;
  };
}

export interface ClassificationCompletedEvent extends BasePipelineEvent {
  type: 'classification.completed';
  payload: {
    classification_result_id: string;
    predicted_material_id: string;
    confidence_score: number;
    confidence_level: ConfidenceLevel;
  };
}

export interface ValidationSubmittedEvent extends BasePipelineEvent {
  type: 'validation.submitted';
  payload: {
    validation_event_id: string;
    action: ValidationAction;
    correct_material_id?: string;
  };
}

export interface FindLogCreatedFromCaptureEvent extends BasePipelineEvent {
  type: 'findlog.created_from_capture';
  payload: {
    find_log_id: string;
    material_id: string;
    confidence_score: number;
  };
}

/**
 * Sync priorities for pipeline events
 */
export const PIPELINE_SYNC_PRIORITIES = {
  CAPTURE_SESSION_CREATED: 95, // Slightly lower than session.created (100)
  RAW_CAPTURE_ADDED: 85,
  PREPROCESSING_COMPLETED: 75,
  CLASSIFICATION_COMPLETED: 70,
  VALIDATION_SUBMITTED: 65,
  FINDLOG_CREATED_FROM_CAPTURE: 80, // Higher priority for FindLog creation
} as const;

/**
 * Get sync priority for pipeline event
 */
export function getPipelineSyncPriority(eventType: string): number {
  const priorityMap: Record<string, number> = {
    'capture_session.created': PIPELINE_SYNC_PRIORITIES.CAPTURE_SESSION_CREATED,
    'raw_capture.added': PIPELINE_SYNC_PRIORITIES.RAW_CAPTURE_ADDED,
    'preprocessing.completed': PIPELINE_SYNC_PRIORITIES.PREPROCESSING_COMPLETED,
    'classification.completed': PIPELINE_SYNC_PRIORITIES.CLASSIFICATION_COMPLETED,
    'validation.submitted': PIPELINE_SYNC_PRIORITIES.VALIDATION_SUBMITTED,
    'findlog.created_from_capture': PIPELINE_SYNC_PRIORITIES.FINDLOG_CREATED_FROM_CAPTURE,
  };
  
  return priorityMap[eventType] ?? 0;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateCaptureSessionInput = z.infer<typeof CreateCaptureSessionSchema>;
export type CreateRawCaptureInput = z.infer<typeof CreateRawCaptureSchema>;
export type CreateClassificationResultInput = z.infer<typeof CreateClassificationResultSchema>;
export type CreateValidationEventInput = z.infer<typeof CreateValidationEventSchema>;
