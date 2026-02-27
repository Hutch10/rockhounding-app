/**
 * Specimen Identification Pipeline Tests
 * 
 * Validates:
 * - State transitions
 * - Confidence scoring
 * - Image quality assessment
 * - Validation logic
 * - FindLog integration
 * - Sync priorities
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  CaptureState,
  PreprocessingStatus,
  ClassificationStatus,
  ImageQuality,
  LightingCondition,
  CameraMode,
  ValidationAction,
  ConfidenceLevel,
  SyncStatus,
  // Interfaces
  CaptureSession,
  RawCapture,
  ProcessedCapture,
  ClassificationResult,
  ValidationEvent,
  ImageQualityMetrics,
  AlternativePrediction,
  // Functions
  getConfidenceLevel,
  shouldAutoAccept,
  requiresManualIdentification,
  calculateImageQualityScore,
  assessImageQuality,
  determineNextState,
  validateCaptureForSync,
  buildFindLogFromCapture,
  getPipelineSyncPriority,
  // Schemas
  CreateCaptureSessionSchema,
  CreateRawCaptureSchema,
  CreateClassificationResultSchema,
  CreateValidationEventSchema,
  PIPELINE_SYNC_PRIORITIES,
} from './specimen-identification-schema';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockCaptureSession(overrides?: Partial<CaptureSession>): CaptureSession {
  return {
    id: 'capture-123',
    user_id: 'user-456',
    device_id: 'device-789',
    state: CaptureState.READY,
    camera_mode: CameraMode.PHOTO,
    image_count: 0,
    started_at: new Date('2024-01-01T10:00:00Z'),
    user_validated: false,
    sync_status: SyncStatus.LOCAL_ONLY,
    client_created_at: new Date('2024-01-01T10:00:00Z'),
    client_updated_at: new Date('2024-01-01T10:00:00Z'),
    version: 1,
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function createMockRawCapture(overrides?: Partial<RawCapture>): RawCapture {
  return {
    id: 'raw-123',
    capture_session_id: 'capture-123',
    user_id: 'user-456',
    device_id: 'device-789',
    storage_path: '/captures/raw/image.jpg',
    original_filename: 'IMG_001.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: 2048000,
    width_px: 4032,
    height_px: 3024,
    captured_at: new Date('2024-01-01T10:00:00Z'),
    sync_status: SyncStatus.LOCAL_ONLY,
    client_created_at: new Date('2024-01-01T10:00:00Z'),
    client_updated_at: new Date('2024-01-01T10:00:00Z'),
    version: 1,
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function createMockProcessedCapture(overrides?: Partial<ProcessedCapture>): ProcessedCapture {
  return {
    id: 'processed-123',
    raw_capture_id: 'raw-123',
    capture_session_id: 'capture-123',
    user_id: 'user-456',
    status: PreprocessingStatus.COMPLETED,
    processed_storage_path: '/captures/processed/image.jpg',
    pipeline_version: '1.0.0',
    preprocessing_steps: [],
    width_px: 512,
    height_px: 512,
    file_size_bytes: 150000,
    quality_metrics: createMockQualityMetrics(),
    quality_assessment: ImageQuality.GOOD,
    processing_time_ms: 1500,
    processing_started_at: new Date('2024-01-01T10:00:01Z'),
    processing_completed_at: new Date('2024-01-01T10:00:02Z'),
    sync_status: SyncStatus.LOCAL_ONLY,
    client_created_at: new Date('2024-01-01T10:00:02Z'),
    client_updated_at: new Date('2024-01-01T10:00:02Z'),
    version: 1,
    created_at: new Date('2024-01-01T10:00:02Z'),
    updated_at: new Date('2024-01-01T10:00:02Z'),
    ...overrides,
  };
}

function createMockQualityMetrics(overrides?: Partial<ImageQualityMetrics>): ImageQualityMetrics {
  return {
    brightness: 128,
    contrast: 0.7,
    sharpness: 0.8,
    noise_level: 0.2,
    saturation: 0.6,
    exposure: 0.0,
    focus_quality: 0.85,
    resolution_score: 0.9,
    ...overrides,
  };
}

function createMockClassificationResult(overrides?: Partial<ClassificationResult>): ClassificationResult {
  return {
    id: 'classification-123',
    processed_capture_id: 'processed-123',
    capture_session_id: 'capture-123',
    user_id: 'user-456',
    status: ClassificationStatus.COMPLETED,
    model_name: 'rockhound-classifier-v1',
    model_version: '1.0.0',
    predicted_material_id: 'quartz-123',
    predicted_material_name: 'Quartz',
    confidence_score: 0.92,
    confidence_level: ConfidenceLevel.HIGH,
    alternative_predictions: [],
    features_used: ['color', 'texture', 'structure'],
    inference_time_ms: 250,
    classified_at: new Date('2024-01-01T10:00:03Z'),
    sync_status: SyncStatus.LOCAL_ONLY,
    client_created_at: new Date('2024-01-01T10:00:03Z'),
    client_updated_at: new Date('2024-01-01T10:00:03Z'),
    version: 1,
    created_at: new Date('2024-01-01T10:00:03Z'),
    updated_at: new Date('2024-01-01T10:00:03Z'),
    ...overrides,
  };
}

// ============================================================================
// CONFIDENCE SCORING TESTS
// ============================================================================

describe('Confidence Scoring', () => {
  describe('getConfidenceLevel', () => {
    it('returns VERY_HIGH for >= 95%', () => {
      expect(getConfidenceLevel(0.95)).toBe(ConfidenceLevel.VERY_HIGH);
      expect(getConfidenceLevel(0.98)).toBe(ConfidenceLevel.VERY_HIGH);
      expect(getConfidenceLevel(1.0)).toBe(ConfidenceLevel.VERY_HIGH);
    });

    it('returns HIGH for >= 85%', () => {
      expect(getConfidenceLevel(0.85)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(0.90)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(0.94)).toBe(ConfidenceLevel.HIGH);
    });

    it('returns MODERATE for >= 70%', () => {
      expect(getConfidenceLevel(0.70)).toBe(ConfidenceLevel.MODERATE);
      expect(getConfidenceLevel(0.80)).toBe(ConfidenceLevel.MODERATE);
      expect(getConfidenceLevel(0.84)).toBe(ConfidenceLevel.MODERATE);
    });

    it('returns LOW for >= 50%', () => {
      expect(getConfidenceLevel(0.50)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(0.60)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(0.69)).toBe(ConfidenceLevel.LOW);
    });

    it('returns VERY_LOW for < 50%', () => {
      expect(getConfidenceLevel(0.49)).toBe(ConfidenceLevel.VERY_LOW);
      expect(getConfidenceLevel(0.30)).toBe(ConfidenceLevel.VERY_LOW);
      expect(getConfidenceLevel(0.10)).toBe(ConfidenceLevel.VERY_LOW);
    });
  });

  describe('shouldAutoAccept', () => {
    it('accepts with very high confidence and excellent quality', () => {
      expect(shouldAutoAccept(0.96, ImageQuality.EXCELLENT)).toBe(true);
    });

    it('accepts with very high confidence and good quality', () => {
      expect(shouldAutoAccept(0.95, ImageQuality.GOOD)).toBe(true);
    });

    it('rejects with high confidence but not very high', () => {
      expect(shouldAutoAccept(0.94, ImageQuality.EXCELLENT)).toBe(false);
    });

    it('rejects with very high confidence but acceptable quality', () => {
      expect(shouldAutoAccept(0.96, ImageQuality.ACCEPTABLE)).toBe(false);
    });

    it('rejects with very high confidence but poor quality', () => {
      expect(shouldAutoAccept(0.96, ImageQuality.POOR)).toBe(false);
    });
  });

  describe('requiresManualIdentification', () => {
    it('requires manual for very low confidence', () => {
      expect(requiresManualIdentification(0.45, ImageQuality.GOOD, [])).toBe(true);
    });

    it('requires manual for poor image quality', () => {
      expect(requiresManualIdentification(0.80, ImageQuality.POOR, [])).toBe(true);
    });

    it('requires manual for unusable image quality', () => {
      expect(requiresManualIdentification(0.90, ImageQuality.UNUSABLE, [])).toBe(true);
    });

    it('requires manual when top 2 predictions are very close', () => {
      const alternatives: AlternativePrediction[] = [
        {
          material_id: 'calcite-123',
          material_name: 'Calcite',
          confidence: 0.82,
          rank: 1,
        },
      ];
      expect(requiresManualIdentification(0.85, ImageQuality.GOOD, alternatives)).toBe(true);
    });

    it('does not require manual for good confidence and quality', () => {
      const alternatives: AlternativePrediction[] = [
        {
          material_id: 'calcite-123',
          material_name: 'Calcite',
          confidence: 0.60,
          rank: 1,
        },
      ];
      expect(requiresManualIdentification(0.85, ImageQuality.GOOD, alternatives)).toBe(false);
    });
  });
});

// ============================================================================
// IMAGE QUALITY TESTS
// ============================================================================

describe('Image Quality Assessment', () => {
  describe('calculateImageQualityScore', () => {
    it('calculates high score for excellent metrics', () => {
      const metrics = createMockQualityMetrics({
        sharpness: 0.95,
        focus_quality: 0.90,
        exposure: 0.0,
        noise_level: 0.05,
        resolution_score: 0.95,
      });
      
      const score = calculateImageQualityScore(metrics);
      expect(score).toBeGreaterThan(0.90);
    });

    it('calculates low score for poor metrics', () => {
      const metrics = createMockQualityMetrics({
        sharpness: 0.30,
        focus_quality: 0.40,
        exposure: 0.8, // Overexposed
        noise_level: 0.70,
        resolution_score: 0.50,
      });
      
      const score = calculateImageQualityScore(metrics);
      expect(score).toBeLessThan(0.50);
    });

    it('weighs sharpness heavily', () => {
      const highSharpness = createMockQualityMetrics({ sharpness: 1.0 });
      const lowSharpness = createMockQualityMetrics({ sharpness: 0.0 });
      
      const scoreHigh = calculateImageQualityScore(highSharpness);
      const scoreLow = calculateImageQualityScore(lowSharpness);
      
      expect(scoreHigh - scoreLow).toBeGreaterThan(0.25); // 30% weight
    });

    it('penalizes noise', () => {
      const lowNoise = createMockQualityMetrics({ noise_level: 0.0 });
      const highNoise = createMockQualityMetrics({ noise_level: 1.0 });
      
      const scoreLowNoise = calculateImageQualityScore(lowNoise);
      const scoreHighNoise = calculateImageQualityScore(highNoise);
      
      expect(scoreLowNoise).toBeGreaterThan(scoreHighNoise);
    });
  });

  describe('assessImageQuality', () => {
    it('returns EXCELLENT for score >= 0.90', () => {
      expect(assessImageQuality(0.90)).toBe(ImageQuality.EXCELLENT);
      expect(assessImageQuality(0.95)).toBe(ImageQuality.EXCELLENT);
    });

    it('returns GOOD for score >= 0.75', () => {
      expect(assessImageQuality(0.75)).toBe(ImageQuality.GOOD);
      expect(assessImageQuality(0.85)).toBe(ImageQuality.GOOD);
    });

    it('returns ACCEPTABLE for score >= 0.60', () => {
      expect(assessImageQuality(0.60)).toBe(ImageQuality.ACCEPTABLE);
      expect(assessImageQuality(0.70)).toBe(ImageQuality.ACCEPTABLE);
    });

    it('returns POOR for score >= 0.40', () => {
      expect(assessImageQuality(0.40)).toBe(ImageQuality.POOR);
      expect(assessImageQuality(0.55)).toBe(ImageQuality.POOR);
    });

    it('returns UNUSABLE for score < 0.40', () => {
      expect(assessImageQuality(0.39)).toBe(ImageQuality.UNUSABLE);
      expect(assessImageQuality(0.20)).toBe(ImageQuality.UNUSABLE);
    });
  });
});

// ============================================================================
// STATE DETERMINATION TESTS
// ============================================================================

describe('State Determination', () => {
  describe('determineNextState', () => {
    it('returns MANUAL_REQUIRED for low confidence', () => {
      const state = determineNextState(0.40, ImageQuality.GOOD, []);
      expect(state).toBe(CaptureState.MANUAL_REQUIRED);
    });

    it('returns MANUAL_REQUIRED for poor image quality', () => {
      const state = determineNextState(0.80, ImageQuality.POOR, []);
      expect(state).toBe(CaptureState.MANUAL_REQUIRED);
    });

    it('returns VALIDATED for very high confidence and excellent quality', () => {
      const state = determineNextState(0.96, ImageQuality.EXCELLENT, []);
      expect(state).toBe(CaptureState.VALIDATED);
    });

    it('returns PENDING_VALIDATION for moderate confidence', () => {
      const alternatives: AlternativePrediction[] = [
        { material_id: 'alt-1', material_name: 'Alt', confidence: 0.60, rank: 1 },
      ];
      const state = determineNextState(0.85, ImageQuality.GOOD, alternatives);
      expect(state).toBe(CaptureState.PENDING_VALIDATION);
    });
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Validation', () => {
  describe('validateCaptureForSync', () => {
    it('validates complete capture session', () => {
      const session = createMockCaptureSession({
        image_count: 1,
        state: CaptureState.VALIDATED,
        final_material_id: 'quartz-123',
      });
      
      const result = validateCaptureForSync(session);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects session without user_id', () => {
      const session = createMockCaptureSession({ user_id: '' });
      
      const result = validateCaptureForSync(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CaptureSession must have user_id');
    });

    it('rejects session without device_id', () => {
      const session = createMockCaptureSession({ device_id: '' });
      
      const result = validateCaptureForSync(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CaptureSession must have device_id');
    });

    it('rejects session without images', () => {
      const session = createMockCaptureSession({ image_count: 0 });
      
      const result = validateCaptureForSync(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CaptureSession must have at least one image');
    });

    it('rejects validated session without final_material_id', () => {
      const session = createMockCaptureSession({
        state: CaptureState.VALIDATED,
        final_material_id: undefined,
      });
      
      const result = validateCaptureForSync(session);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Validated session must have final_material_id');
    });
  });
});

// ============================================================================
// FINDLOG INTEGRATION TESTS
// ============================================================================

describe('FindLog Integration', () => {
  describe('buildFindLogFromCapture', () => {
    it('builds FindLog with classification data', () => {
      const captureSession = createMockCaptureSession({
        final_material_id: 'quartz-123',
        lat: 40.7128,
        lon: -74.0060,
      });
      const classificationResult = createMockClassificationResult({
        predicted_material_id: 'quartz-123',
        predicted_material_name: 'Quartz',
        confidence_score: 0.92,
      });
      const rawCapture = createMockRawCapture({
        storage_path: '/captures/raw/quartz.jpg',
        captured_at: new Date('2024-01-01T10:00:00Z'),
      });
      const processedCapture = createMockProcessedCapture();
      
      const findLog = buildFindLogFromCapture({
        captureSession,
        classificationResult,
        rawCapture,
        processedCapture,
      });
      
      expect(findLog.material_id).toBe('quartz-123');
      expect(findLog.quality_rating).toBe(5); // 0.92 * 5 = 4.6 → 5
      expect(findLog.notes).toContain('Identified via camera');
      expect(findLog.notes).toContain('92.0%');
      expect(findLog.photo_paths).toContain('/captures/raw/quartz.jpg');
      expect(findLog.lat).toBe(40.7128);
      expect(findLog.lon).toBe(-74.0060);
      expect(findLog.found_at).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('includes user validation in notes', () => {
      const captureSession = createMockCaptureSession();
      const classificationResult = createMockClassificationResult();
      const rawCapture = createMockRawCapture();
      const processedCapture = createMockProcessedCapture();
      const validationEvent: ValidationEvent = {
        id: 'validation-123',
        classification_result_id: 'classification-123',
        capture_session_id: 'capture-123',
        user_id: 'user-456',
        device_id: 'device-789',
        action: ValidationAction.ACCEPT,
        predicted_material_id: 'quartz-123',
        sequence_number: 1,
        validated_at: new Date(),
        is_expert_validation: false,
        sync_status: SyncStatus.LOCAL_ONLY,
        client_created_at: new Date(),
        created_at: new Date(),
      };
      
      const findLog = buildFindLogFromCapture({
        captureSession,
        classificationResult,
        rawCapture,
        processedCapture,
        validationEvent,
      });
      
      expect(findLog.notes).toContain('User validated identification');
    });

    it('calculates quality rating from confidence', () => {
      const testCases = [
        { confidence: 1.0, expectedRating: 5 },
        { confidence: 0.8, expectedRating: 4 },
        { confidence: 0.6, expectedRating: 3 },
        { confidence: 0.4, expectedRating: 2 },
        { confidence: 0.2, expectedRating: 1 },
      ];
      
      testCases.forEach(({ confidence, expectedRating }) => {
        const captureSession = createMockCaptureSession();
        const classificationResult = createMockClassificationResult({ confidence_score: confidence });
        const rawCapture = createMockRawCapture();
        const processedCapture = createMockProcessedCapture();
        
        const findLog = buildFindLogFromCapture({
          captureSession,
          classificationResult,
          rawCapture,
          processedCapture,
        });
        
        expect(findLog.quality_rating).toBe(expectedRating);
      });
    });
  });
});

// ============================================================================
// SYNC PRIORITY TESTS
// ============================================================================

describe('Sync Priorities', () => {
  describe('getPipelineSyncPriority', () => {
    it('assigns correct priority to capture_session.created', () => {
      expect(getPipelineSyncPriority('capture_session.created')).toBe(95);
    });

    it('assigns correct priority to raw_capture.added', () => {
      expect(getPipelineSyncPriority('raw_capture.added')).toBe(85);
    });

    it('assigns correct priority to preprocessing.completed', () => {
      expect(getPipelineSyncPriority('preprocessing.completed')).toBe(75);
    });

    it('assigns correct priority to classification.completed', () => {
      expect(getPipelineSyncPriority('classification.completed')).toBe(70);
    });

    it('assigns correct priority to validation.submitted', () => {
      expect(getPipelineSyncPriority('validation.submitted')).toBe(65);
    });

    it('assigns highest priority to findlog.created_from_capture', () => {
      expect(getPipelineSyncPriority('findlog.created_from_capture')).toBe(80);
    });

    it('returns 0 for unknown event types', () => {
      expect(getPipelineSyncPriority('unknown.event')).toBe(0);
    });

    it('prioritizes capture session before raw capture', () => {
      const sessionPriority = getPipelineSyncPriority('capture_session.created');
      const capturePriority = getPipelineSyncPriority('raw_capture.added');
      expect(sessionPriority).toBeGreaterThan(capturePriority);
    });

    it('prioritizes FindLog creation highly', () => {
      const findlogPriority = getPipelineSyncPriority('findlog.created_from_capture');
      const classificationPriority = getPipelineSyncPriority('classification.completed');
      expect(findlogPriority).toBeGreaterThan(classificationPriority);
    });
  });
});

// ============================================================================
// VALIDATION SCHEMA TESTS
// ============================================================================

describe('Validation Schemas', () => {
  describe('CreateCaptureSessionSchema', () => {
    it('validates valid capture session input', () => {
      const input = {
        field_session_id: '123e4567-e89b-12d3-a456-426614174000',
        camera_mode: CameraMode.MACRO,
        lighting_condition: LightingCondition.NATURAL_BRIGHT,
        device_id: 'device-123',
      };
      
      const result = CreateCaptureSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('applies default camera mode', () => {
      const input = {
        device_id: 'device-123',
      };
      
      const result = CreateCaptureSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.camera_mode).toBe(CameraMode.PHOTO);
      }
    });

    it('validates GPS coordinates', () => {
      const input = {
        lat: 40.7128,
        lon: -74.0060,
        device_id: 'device-123',
      };
      
      const result = CreateCaptureSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid latitude', () => {
      const input = {
        lat: 100, // > 90
        lon: -74.0060,
        device_id: 'device-123',
      };
      
      const result = CreateCaptureSessionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateRawCaptureSchema', () => {
    it('validates valid raw capture input', () => {
      const input = {
        capture_session_id: '123e4567-e89b-12d3-a456-426614174000',
        storage_path: '/captures/raw/image.jpg',
        original_filename: 'IMG_001.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 2048000,
        width_px: 4032,
        height_px: 3024,
        device_id: 'device-123',
      };
      
      const result = CreateRawCaptureSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid MIME type', () => {
      const input = {
        capture_session_id: '123e4567-e89b-12d3-a456-426614174000',
        storage_path: '/captures/raw/video.mp4',
        original_filename: 'VID_001.mp4',
        mime_type: 'video/mp4', // Not image/*
        file_size_bytes: 5000000,
        width_px: 1920,
        height_px: 1080,
        device_id: 'device-123',
      };
      
      const result = CreateRawCaptureSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('applies default captured_at timestamp', () => {
      const input = {
        capture_session_id: '123e4567-e89b-12d3-a456-426614174000',
        storage_path: '/captures/raw/image.jpg',
        original_filename: 'IMG_001.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: 2048000,
        width_px: 4032,
        height_px: 3024,
        device_id: 'device-123',
      };
      
      const result = CreateRawCaptureSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.captured_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('CreateClassificationResultSchema', () => {
    it('validates valid classification result', () => {
      const input = {
        processed_capture_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        model_name: 'rockhound-classifier',
        model_version: '1.0.0',
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        predicted_material_name: 'Quartz',
        confidence_score: 0.92,
        inference_time_ms: 250,
      };
      
      const result = CreateClassificationResultSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects confidence score > 1', () => {
      const input = {
        processed_capture_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        model_name: 'rockhound-classifier',
        model_version: '1.0.0',
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        predicted_material_name: 'Quartz',
        confidence_score: 1.5, // > 1
        inference_time_ms: 250,
      };
      
      const result = CreateClassificationResultSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative confidence score', () => {
      const input = {
        processed_capture_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        model_name: 'rockhound-classifier',
        model_version: '1.0.0',
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        predicted_material_name: 'Quartz',
        confidence_score: -0.1, // < 0
        inference_time_ms: 250,
      };
      
      const result = CreateClassificationResultSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateValidationEventSchema', () => {
    it('validates valid validation event', () => {
      const input = {
        classification_result_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        action: ValidationAction.ACCEPT,
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        sequence_number: 1,
        device_id: 'device-123',
      };
      
      const result = CreateValidationEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates correction with correct_material_id', () => {
      const input = {
        classification_result_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        action: ValidationAction.REJECT_WITH_CORRECTION,
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        correct_material_id: '123e4567-e89b-12d3-a456-426614174003',
        sequence_number: 1,
        device_id: 'device-123',
      };
      
      const result = CreateValidationEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates user confidence rating', () => {
      const input = {
        classification_result_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        action: ValidationAction.ACCEPT,
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        user_confidence: 4,
        sequence_number: 1,
        device_id: 'device-123',
      };
      
      const result = CreateValidationEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects user confidence outside 1-5 range', () => {
      const input = {
        classification_result_id: '123e4567-e89b-12d3-a456-426614174000',
        capture_session_id: '123e4567-e89b-12d3-a456-426614174001',
        action: ValidationAction.ACCEPT,
        predicted_material_id: '123e4567-e89b-12d3-a456-426614174002',
        user_confidence: 6, // > 5
        sequence_number: 1,
        device_id: 'device-123',
      };
      
      const result = CreateValidationEventSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
