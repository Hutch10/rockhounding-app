# Specimen Identification Pipeline Architecture

## Overview

The Specimen Identification Pipeline provides AI-powered material classification from camera images, with offline-first operation, user validation loops, and seamless integration with FieldSession and FindLog workflows. The pipeline uses deterministic event sourcing for complete audit trails and eventual consistency.

## Table of Contents

1. [Pipeline Flow](#pipeline-flow)
2. [Core Components](#core-components)
3. [Capture Flow](#capture-flow)
4. [Preprocessing Pipeline](#preprocessing-pipeline)
5. [Classification Pipeline](#classification-pipeline)
6. [Confidence Scoring](#confidence-scoring)
7. [User Validation Loop](#user-validation-loop)
8. [Event Model](#event-model)
9. [Integration with FindLog](#integration-with-findlog)
10. [Integration with FieldSession](#integration-with-field-session)
11. [Offline Sync](#offline-sync)
12. [Usage Examples](#usage-examples)

---

## Pipeline Flow

### High-Level Pipeline

```
Camera → RawCapture → Preprocessing → Classification → Validation → FindLog
   ↓          ↓             ↓              ↓              ↓           ↓
 Metadata   EXIF        Quality        Confidence      User       Field
 Extract  Extraction   Assessment      Scoring       Feedback    Session
```

### Complete Flow

```
1. CAPTURE INITIATION
   ├─ User opens camera
   ├─ CaptureSession created (state: READY)
   ├─ Camera mode selected (PHOTO, MACRO, HDR, MULTI_ANGLE)
   └─ GPS/environmental data captured

2. IMAGE CAPTURE
   ├─ User takes photo
   ├─ RawCapture created
   ├─ EXIF metadata extracted
   ├─ Image stored locally
   └─ CaptureSession state: READY → CAPTURED

3. PREPROCESSING
   ├─ Image resized/normalized
   ├─ Color correction applied
   ├─ Noise reduction
   ├─ Edge detection
   ├─ Quality assessment performed
   ├─ ProcessedCapture created
   └─ CaptureSession state: CAPTURED → PREPROCESSING → CLASSIFYING

4. CLASSIFICATION
   ├─ ML model inference
   ├─ Top-K predictions generated
   ├─ Confidence scores calculated
   ├─ Alternative predictions ranked
   ├─ ClassificationResult created
   └─ CaptureSession state: CLASSIFYING → PENDING_VALIDATION

5. VALIDATION DECISION
   ├─ Auto-accept if confidence >= 95% AND quality EXCELLENT/GOOD
   ├─ Manual required if confidence < 50% OR quality POOR/UNUSABLE
   ├─ User validation if between thresholds
   └─ CaptureSession state: PENDING_VALIDATION → VALIDATED/MANUAL_REQUIRED

6. USER VALIDATION (if required)
   ├─ User reviews classification
   ├─ User accepts/rejects/corrects
   ├─ ValidationEvent created
   └─ CaptureSession state: → VALIDATED

7. FINDLOG CREATION
   ├─ FindLog built from validated capture
   ├─ Material ID, photos, confidence included
   ├─ Linked to FieldSession (if active)
   └─ FindLog synced to server

8. OFFLINE SYNC
   ├─ All events queued with priority
   ├─ Batch sync when online
   └─ Ground truth data collected for model improvement
```

---

## Core Components

### 1. CaptureSession

Container for entire identification workflow.

```typescript
interface CaptureSession {
  id: string;
  user_id: string;
  field_session_id?: string; // Link to active field session
  find_log_id?: string; // Created FindLog
  device_id: string;
  state: CaptureState; // READY → CAPTURED → ... → VALIDATED
  camera_mode: CameraMode;
  image_count: number;

  // GPS location
  geom?: GeoJSONPoint;
  lat?: number;
  lon?: number;

  // Environmental context
  lighting_condition?: LightingCondition;
  weather_condition?: string;

  // Results
  best_classification_result_id?: string;
  final_material_id?: string;
  user_validated: boolean;
  validation_timestamp?: Date;

  // Temporal
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;

  // Sync
  sync_status: SyncStatus;
  version: number;
}
```

### 2. RawCapture

Original image with full EXIF metadata.

```typescript
interface RawCapture {
  id: string;
  capture_session_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string; // image/jpeg, image/png, etc.
  file_size_bytes: number;
  width_px: number;
  height_px: number;

  // EXIF data
  exif_data?: EXIFMetadata;
  camera_make?: string;
  camera_model?: string;
  iso?: number;
  aperture?: number;
  shutter_speed?: string;
  focal_length_mm?: number;

  // GPS from EXIF
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude_m?: number;
  gps_timestamp?: Date;

  captured_at: Date;
}
```

### 3. ProcessedCapture

Preprocessed image ready for classification.

```typescript
interface ProcessedCapture {
  id: string;
  raw_capture_id: string;
  status: PreprocessingStatus;
  processed_storage_path: string;
  pipeline_version: string;

  // Preprocessing steps
  preprocessing_steps: PreprocessingStep[];

  // Quality metrics
  quality_metrics: ImageQualityMetrics;
  quality_assessment: ImageQuality;

  // Detected features
  detected_features?: DetectedFeatures;
  color_histogram?: ColorHistogram;
  texture_features?: TextureFeatures;
  edge_density?: number;
  blur_score?: number;

  processing_time_ms: number;
}
```

### 4. ClassificationResult

ML model prediction output.

```typescript
interface ClassificationResult {
  id: string;
  processed_capture_id: string;
  status: ClassificationStatus;

  // Model info
  model_name: string;
  model_version: string;

  // Prediction
  predicted_material_id: string;
  predicted_material_name: string;
  confidence_score: number; // 0.0 - 1.0
  confidence_level: ConfidenceLevel; // VERY_HIGH to VERY_LOW

  // Alternatives
  alternative_predictions: AlternativePrediction[];

  // Explainability
  features_used: string[];
  feature_importance?: Record<string, number>;
  attention_regions?: AttentionRegion[];
  similar_specimens?: SimilarSpecimen[];

  // Uncertainty
  epistemic_uncertainty?: number; // Model uncertainty
  aleatoric_uncertainty?: number; // Data uncertainty

  inference_time_ms: number;
  classified_at: Date;
}
```

### 5. ValidationEvent

User validation of classification.

```typescript
interface ValidationEvent {
  id: string;
  classification_result_id: string;
  action: ValidationAction; // ACCEPT, REJECT_WITH_CORRECTION, etc.

  predicted_material_id: string;
  correct_material_id?: string; // If user corrected

  feedback_notes?: string;
  validation_duration_seconds?: number;
  user_confidence?: number; // 1-5 scale
  is_expert_validation: boolean;

  sequence_number: number;
  validated_at: Date;
}
```

---

## Capture Flow

### Camera Initialization

```typescript
// 1. Create capture session
const session = await createCaptureSession({
  field_session_id: currentFieldSession?.id,
  camera_mode: CameraMode.MACRO,
  lighting_condition: detectLightingCondition(),
  lat: currentPosition.latitude,
  lon: currentPosition.longitude,
  device_id: getDeviceId(),
});

// 2. Initialize camera with settings
const cameraSettings = getCameraSettingsForMode(CameraMode.MACRO);
await initializeCamera(cameraSettings);

// 3. Queue event
await queueEvent({
  type: 'capture_session.created',
  capture_session_id: session.id,
  payload: { camera_mode: CameraMode.MACRO },
  priority: PIPELINE_SYNC_PRIORITIES.CAPTURE_SESSION_CREATED,
});
```

### Image Capture

```typescript
// 1. Capture image
const imageData = await captureImage();

// 2. Extract EXIF metadata
const exifData = await extractEXIF(imageData);

// 3. Store raw image
const storagePath = await storeImage(imageData, 'raw');

// 4. Create RawCapture record
const rawCapture = await createRawCapture({
  capture_session_id: session.id,
  storage_path: storagePath,
  original_filename: `IMG_${Date.now()}.jpg`,
  mime_type: 'image/jpeg',
  file_size_bytes: imageData.byteLength,
  width_px: exifData.pixel_x_dimension,
  height_px: exifData.pixel_y_dimension,
  exif_data: exifData,
  camera_make: exifData.make,
  camera_model: exifData.model,
  iso: exifData.iso_speed_ratings,
  captured_at: new Date(),
  device_id: getDeviceId(),
});

// 5. Update session
session.state = CaptureState.CAPTURED;
session.image_count = 1;
await updateCaptureSession(session);

// 6. Queue event
await queueEvent({
  type: 'raw_capture.added',
  capture_session_id: session.id,
  payload: {
    raw_capture_id: rawCapture.id,
    storage_path: storagePath,
    file_size_bytes: rawCapture.file_size_bytes,
  },
  priority: PIPELINE_SYNC_PRIORITIES.RAW_CAPTURE_ADDED,
});
```

---

## Preprocessing Pipeline

### Preprocessing Steps

```typescript
const PREPROCESSING_PIPELINE = [
  {
    name: 'resize',
    fn: resizeImage,
    params: { width: 512, height: 512, preserve_aspect: true },
  },
  {
    name: 'normalize',
    fn: normalizeColors,
    params: { mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] },
  },
  {
    name: 'denoise',
    fn: denoiseImage,
    params: { strength: 'auto' },
  },
  {
    name: 'enhance_contrast',
    fn: enhanceContrast,
    params: { method: 'CLAHE', clip_limit: 2.0 },
  },
  {
    name: 'detect_edges',
    fn: detectEdges,
    params: { method: 'canny', low_threshold: 50, high_threshold: 150 },
  },
];
```

### Preprocessing Execution

```typescript
async function preprocessImage(rawCapture: RawCapture): Promise<ProcessedCapture> {
  const steps: PreprocessingStep[] = [];
  let processedImage = await loadImage(rawCapture.storage_path);

  // Update session state
  await updateSessionState(rawCapture.capture_session_id, CaptureState.PREPROCESSING);

  // Execute pipeline
  for (const step of PREPROCESSING_PIPELINE) {
    const startTime = Date.now();

    try {
      processedImage = await step.fn(processedImage, step.params);

      steps.push({
        name: step.name,
        parameters: step.params,
        duration_ms: Date.now() - startTime,
        success: true,
      });
    } catch (error) {
      steps.push({
        name: step.name,
        parameters: step.params,
        duration_ms: Date.now() - startTime,
        success: false,
        error: error.message,
      });

      // If critical step fails, abort
      if (step.critical) {
        throw error;
      }
    }
  }

  // Calculate quality metrics
  const qualityMetrics = await calculateQualityMetrics(processedImage);
  const qualityScore = calculateImageQualityScore(qualityMetrics);
  const qualityAssessment = assessImageQuality(qualityScore);

  // Extract features
  const detectedFeatures = await extractFeatures(processedImage);
  const colorHistogram = await calculateColorHistogram(processedImage);
  const textureFeatures = await calculateTextureFeatures(processedImage);

  // Store processed image
  const processedPath = await storeImage(processedImage, 'processed');

  // Create ProcessedCapture record
  const processedCapture: ProcessedCapture = {
    id: crypto.randomUUID(),
    raw_capture_id: rawCapture.id,
    capture_session_id: rawCapture.capture_session_id,
    user_id: rawCapture.user_id,
    status: PreprocessingStatus.COMPLETED,
    processed_storage_path: processedPath,
    pipeline_version: '1.0.0',
    preprocessing_steps: steps,
    width_px: processedImage.width,
    height_px: processedImage.height,
    file_size_bytes: await getFileSize(processedPath),
    quality_metrics: qualityMetrics,
    quality_assessment: qualityAssessment,
    detected_features: detectedFeatures,
    color_histogram: colorHistogram,
    texture_features: textureFeatures,
    processing_time_ms: steps.reduce((sum, s) => sum + s.duration_ms, 0),
    processing_started_at: new Date(Date.now() - processingTime),
    processing_completed_at: new Date(),
    // ... sync metadata
  };

  // Queue event
  await queueEvent({
    type: 'preprocessing.completed',
    capture_session_id: rawCapture.capture_session_id,
    payload: {
      processed_capture_id: processedCapture.id,
      quality_assessment: qualityAssessment,
      processing_time_ms: processedCapture.processing_time_ms,
    },
    priority: PIPELINE_SYNC_PRIORITIES.PREPROCESSING_COMPLETED,
  });

  return processedCapture;
}
```

### Quality Metrics Calculation

```typescript
async function calculateQualityMetrics(image: Image): Promise<ImageQualityMetrics> {
  return {
    brightness: await calculateBrightness(image),
    contrast: await calculateContrast(image),
    sharpness: await calculateSharpness(image), // Laplacian variance
    noise_level: await estimateNoise(image), // High-frequency analysis
    saturation: await calculateSaturation(image),
    exposure: await assessExposure(image), // Histogram analysis
    focus_quality: await assessFocus(image), // Edge sharpness
    resolution_score: assessResolution(image.width, image.height),
  };
}
```

---

## Classification Pipeline

### Model Inference

```typescript
async function classifySpecimen(processedCapture: ProcessedCapture): Promise<ClassificationResult> {
  // Update session state
  await updateSessionState(processedCapture.capture_session_id, CaptureState.CLASSIFYING);

  // Load model
  const model = await loadModel('rockhound-classifier-v1');

  // Load processed image
  const image = await loadImage(processedCapture.processed_storage_path);
  const tensor = preprocessForModel(image);

  // Run inference
  const startTime = Date.now();
  const predictions = await model.predict(tensor);
  const inferenceTime = Date.now() - startTime;

  // Get top-K predictions
  const topK = getTopKPredictions(predictions, 5);
  const topPrediction = topK[0];
  const alternatives = topK.slice(1).map((pred, idx) => ({
    material_id: pred.material_id,
    material_name: pred.material_name,
    confidence: pred.confidence,
    rank: idx + 1,
    reasons: pred.reasons,
  }));

  // Calculate confidence level
  const confidenceLevel = getConfidenceLevel(topPrediction.confidence);

  // Get explainability data
  const attentionMaps = await generateAttentionMaps(model, image);
  const featureImportance = await calculateFeatureImportance(model, image);
  const similarSpecimens = await findSimilarSpecimens(
    processedCapture.detected_features,
    topPrediction.material_id
  );

  // Calculate uncertainty
  const uncertainty = await calculateUncertainty(predictions);

  // Create classification result
  const result: ClassificationResult = {
    id: crypto.randomUUID(),
    processed_capture_id: processedCapture.id,
    capture_session_id: processedCapture.capture_session_id,
    user_id: processedCapture.user_id,
    status: ClassificationStatus.COMPLETED,
    model_name: 'rockhound-classifier-v1',
    model_version: '1.0.0',
    predicted_material_id: topPrediction.material_id,
    predicted_material_name: topPrediction.material_name,
    confidence_score: topPrediction.confidence,
    confidence_level: confidenceLevel,
    alternative_predictions: alternatives,
    features_used: ['color', 'texture', 'structure', 'luster'],
    feature_importance: featureImportance,
    attention_regions: attentionMaps,
    similar_specimens: similarSpecimens,
    epistemic_uncertainty: uncertainty.epistemic,
    aleatoric_uncertainty: uncertainty.aleatoric,
    inference_time_ms: inferenceTime,
    classified_at: new Date(),
    // ... sync metadata
  };

  // Determine next state
  const nextState = determineNextState(
    result.confidence_score,
    processedCapture.quality_assessment,
    alternatives
  );

  await updateSessionState(processedCapture.capture_session_id, nextState);

  // Queue event
  await queueEvent({
    type: 'classification.completed',
    capture_session_id: processedCapture.capture_session_id,
    payload: {
      classification_result_id: result.id,
      predicted_material_id: result.predicted_material_id,
      confidence_score: result.confidence_score,
      confidence_level: result.confidence_level,
    },
    priority: PIPELINE_SYNC_PRIORITIES.CLASSIFICATION_COMPLETED,
  });

  return result;
}
```

---

## Confidence Scoring

### Confidence Levels

```typescript
enum ConfidenceLevel {
  VERY_HIGH = 'VERY_HIGH', // >= 95%: Auto-accept candidate
  HIGH = 'HIGH', // >= 85%: High confidence, recommend accept
  MODERATE = 'MODERATE', // >= 70%: Moderate confidence, user validation
  LOW = 'LOW', // >= 50%: Low confidence, manual verification
  VERY_LOW = 'VERY_LOW', // < 50%: Manual identification required
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.95) return ConfidenceLevel.VERY_HIGH;
  if (score >= 0.85) return ConfidenceLevel.HIGH;
  if (score >= 0.7) return ConfidenceLevel.MODERATE;
  if (score >= 0.5) return ConfidenceLevel.LOW;
  return ConfidenceLevel.VERY_LOW;
}
```

### Decision Logic

```typescript
// Auto-accept thresholds
function shouldAutoAccept(confidence: number, imageQuality: ImageQuality): boolean {
  return confidence >= 0.95 && [ImageQuality.EXCELLENT, ImageQuality.GOOD].includes(imageQuality);
}

// Manual identification required
function requiresManualIdentification(
  confidence: number,
  imageQuality: ImageQuality,
  alternatives: AlternativePrediction[]
): boolean {
  // Very low confidence
  if (confidence < 0.5) return true;

  // Poor image quality
  if ([ImageQuality.POOR, ImageQuality.UNUSABLE].includes(imageQuality)) {
    return true;
  }

  // Top 2 predictions very close (ambiguous)
  if (alternatives.length > 0 && confidence - alternatives[0].confidence < 0.1) {
    return true;
  }

  return false;
}

// Determine next state
function determineNextState(
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
```

### Confidence Breakdown

```typescript
interface ConfidenceBreakdown {
  visual_confidence: number; // Overall visual match
  texture_confidence: number; // Texture pattern match
  color_confidence: number; // Color distribution match
  structure_confidence: number; // Crystal structure match
  model_confidence: number; // Model's internal confidence
}

// Weighted combination
function calculateOverallConfidence(breakdown: ConfidenceBreakdown): number {
  return (
    breakdown.visual_confidence * 0.3 +
    breakdown.texture_confidence * 0.25 +
    breakdown.color_confidence * 0.2 +
    breakdown.structure_confidence * 0.15 +
    breakdown.model_confidence * 0.1
  );
}
```

---

## User Validation Loop

### Validation UI Flow

```
1. PRESENT CLASSIFICATION
   ├─ Show predicted material with confidence
   ├─ Display alternative predictions (top 3)
   ├─ Show attention regions (what model focused on)
   ├─ Display similar specimens from training set
   └─ Provide confidence breakdown

2. USER OPTIONS
   ├─ [ACCEPT] - Correct identification
   ├─ [REJECT & CORRECT] - Wrong, select correct material
   ├─ [REJECT & UNCERTAIN] - Wrong, but unsure of correct
   ├─ [REQUEST EXPERT] - Need expert review
   └─ [SKIP] - Skip validation for now

3. COLLECT FEEDBACK
   ├─ Optional notes/comments
   ├─ User confidence rating (1-5)
   ├─ Time spent on validation
   └─ Mark if user is expert/verified

4. CREATE VALIDATION EVENT
   ├─ Record action taken
   ├─ Store correct material ID (if provided)
   ├─ Queue for sync
   └─ Update capture session state
```

### Validation Event Creation

```typescript
async function submitValidation(
  classificationResult: ClassificationResult,
  action: ValidationAction,
  options: {
    correctMaterialId?: string;
    feedbackNotes?: string;
    userConfidence?: number;
    validationDurationSeconds?: number;
  }
): Promise<ValidationEvent> {
  const validationEvent: ValidationEvent = {
    id: crypto.randomUUID(),
    classification_result_id: classificationResult.id,
    capture_session_id: classificationResult.capture_session_id,
    user_id: classificationResult.user_id,
    device_id: getDeviceId(),
    action,
    predicted_material_id: classificationResult.predicted_material_id,
    correct_material_id: options.correctMaterialId,
    feedback_notes: options.feedbackNotes,
    validation_duration_seconds: options.validationDurationSeconds,
    user_confidence: options.userConfidence,
    is_expert_validation: await isExpertUser(),
    sequence_number: await getNextSequenceNumber(classificationResult.capture_session_id),
    validated_at: new Date(),
    sync_status: SyncStatus.LOCAL_ONLY,
    client_created_at: new Date(),
    created_at: new Date(),
  };

  // Store validation event
  await db.validationEvents.put(validationEvent);

  // Update capture session
  const captureSession = await db.captureSessions.get(classificationResult.capture_session_id);
  captureSession.state = CaptureState.VALIDATED;
  captureSession.user_validated = true;
  captureSession.validation_timestamp = new Date();
  captureSession.final_material_id =
    options.correctMaterialId || classificationResult.predicted_material_id;
  await db.captureSessions.put(captureSession);

  // Queue event for sync
  await queueEvent({
    type: 'validation.submitted',
    capture_session_id: classificationResult.capture_session_id,
    payload: {
      validation_event_id: validationEvent.id,
      action,
      correct_material_id: options.correctMaterialId,
    },
    priority: PIPELINE_SYNC_PRIORITIES.VALIDATION_SUBMITTED,
  });

  return validationEvent;
}
```

### Ground Truth Collection

Validation events provide ground truth data for model improvement:

```typescript
interface GroundTruthSample {
  image_id: string;
  predicted_material_id: string;
  correct_material_id: string;
  user_confidence: number;
  is_expert_validation: boolean;
  image_quality: ImageQuality;
  features: DetectedFeatures;
  validation_timestamp: Date;
}

// Collect ground truth for retraining
async function collectGroundTruthData(): Promise<GroundTruthSample[]> {
  const validations = await db.validationEvents
    .where('action')
    .equals(ValidationAction.REJECT_WITH_CORRECTION)
    .or('action')
    .equals(ValidationAction.ACCEPT)
    .toArray();

  return validations.map((v) => ({
    image_id: v.classification_result_id,
    predicted_material_id: v.predicted_material_id,
    correct_material_id: v.correct_material_id || v.predicted_material_id,
    user_confidence: v.user_confidence || 3,
    is_expert_validation: v.is_expert_validation,
    // ... additional fields
  }));
}
```

---

## Event Model

### Event Types

```typescript
type PipelineEvent =
  | CaptureSessionCreatedEvent // Session initialized
  | RawCaptureAddedEvent // Image captured
  | PreprocessingCompletedEvent // Image preprocessed
  | ClassificationCompletedEvent // Classification done
  | ValidationSubmittedEvent // User validated
  | FindLogCreatedFromCaptureEvent; // FindLog created

// Base event structure
interface BasePipelineEvent {
  id: string;
  capture_session_id: string;
  user_id: string;
  type: string;
  timestamp: Date;
  device_id: string;
  sync_status: SyncStatus;
  sequence_number: number;
}
```

### Event Sequences

```
Complete offline capture session:

Seq 1: capture_session.created
       └─→ Session exists (READY)

Seq 2: raw_capture.added
       └─→ Image captured (CAPTURED)

Seq 3: preprocessing.completed
       └─→ Image processed (PREPROCESSING → CLASSIFYING)

Seq 4: classification.completed
       └─→ Material predicted (PENDING_VALIDATION)

Seq 5: validation.submitted
       └─→ User validated (VALIDATED)

Seq 6: findlog.created_from_capture
       └─→ FindLog linked to FieldSession
```

### Deterministic Replay

Events can be replayed to reconstruct pipeline state:

```typescript
async function replayCaptureSession(sessionId: string): Promise<CaptureSession> {
  const events = await db.events
    .where('capture_session_id')
    .equals(sessionId)
    .sortBy('sequence_number');

  let session = await db.captureSessions.get(sessionId);

  for (const event of events) {
    session = applyPipelineEvent(session, event);
  }

  return session;
}

function applyPipelineEvent(session: CaptureSession, event: PipelineEvent): CaptureSession {
  switch (event.type) {
    case 'raw_capture.added':
      session.state = CaptureState.CAPTURED;
      session.image_count += 1;
      break;

    case 'preprocessing.completed':
      session.state = CaptureState.CLASSIFYING;
      break;

    case 'classification.completed':
      session.state = CaptureState.PENDING_VALIDATION;
      session.best_classification_result_id = event.payload.classification_result_id;
      break;

    case 'validation.submitted':
      session.state = CaptureState.VALIDATED;
      session.user_validated = true;
      session.final_material_id = event.payload.correct_material_id || session.final_material_id;
      break;
  }

  return session;
}
```

---

## Integration with FindLog

### Creating FindLog from Capture

```typescript
async function createFindLogFromCapture(captureSession: CaptureSession): Promise<string> {
  // Get all related entities
  const classificationResult = await db.classificationResults.get(
    captureSession.best_classification_result_id!
  );
  const processedCapture = await db.processedCaptures.get(
    classificationResult.processed_capture_id
  );
  const rawCapture = await db.rawCaptures
    .where('capture_session_id')
    .equals(captureSession.id)
    .first();
  const validationEvent = await db.validationEvents
    .where('capture_session_id')
    .equals(captureSession.id)
    .first();

  // Build FindLog data
  const findLogData = buildFindLogFromCapture({
    captureSession,
    classificationResult,
    rawCapture,
    processedCapture,
    validationEvent,
  });

  // Create FindLog
  const findLog = await createFindLog({
    session_id: captureSession.field_session_id!,
    ...findLogData,
    device_id: captureSession.device_id,
  });

  // Link back to capture session
  captureSession.find_log_id = findLog.id;
  await db.captureSessions.put(captureSession);

  // Queue event
  await queueEvent({
    type: 'findlog.created_from_capture',
    capture_session_id: captureSession.id,
    payload: {
      find_log_id: findLog.id,
      material_id: findLog.material_id,
      confidence_score: classificationResult.confidence_score,
    },
    priority: PIPELINE_SYNC_PRIORITIES.FINDLOG_CREATED_FROM_CAPTURE,
  });

  return findLog.id;
}
```

### FindLog Enrichment

Classification data enriches FindLog entries:

```typescript
interface EnrichedFindLog extends FindLog {
  // Standard FindLog fields
  material_id: string;
  quality_rating: number;
  notes: string;
  photo_paths: string[];

  // Enriched from classification
  identification_method: 'camera_ai';
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  alternative_materials?: string[];
  user_validated: boolean;
  expert_validated: boolean;

  // Image quality context
  image_quality: ImageQuality;
  lighting_condition?: LightingCondition;

  // Model metadata
  model_name: string;
  model_version: string;
}
```

---

## Integration with FieldSession

### Active Session Integration

```typescript
// User is in active FieldSession
const fieldSession = await getCurrentActiveSession();

if (fieldSession && fieldSession.state === SessionState.ACTIVE) {
  // Create capture session linked to field session
  const captureSession = await createCaptureSession({
    field_session_id: fieldSession.id,
    camera_mode: CameraMode.MACRO,
    device_id: getDeviceId(),
  });

  // ... proceed with capture flow

  // After validation, auto-create FindLog
  if (captureSession.state === CaptureState.VALIDATED) {
    const findLogId = await createFindLogFromCapture(captureSession);

    // Metrics automatically recalculated by triggers
    // FieldSession.total_specimens incremented
    // FieldSession.materials_found updated
  }
}
```

### Standalone Capture

```typescript
// User captures specimen without active FieldSession
const captureSession = await createCaptureSession({
  // No field_session_id
  camera_mode: CameraMode.PHOTO,
  device_id: getDeviceId(),
});

// ... capture and classification flow

// After validation, user can:
// 1. Create new FindLog without session
// 2. Add to existing FindLog
// 3. Create new FieldSession and add
```

---

## Offline Sync

### Sync Priority Order

```typescript
export const PIPELINE_SYNC_PRIORITIES = {
  CAPTURE_SESSION_CREATED: 95, // Before raw capture
  RAW_CAPTURE_ADDED: 85, // Before preprocessing
  PREPROCESSING_COMPLETED: 75, // Before classification
  CLASSIFICATION_COMPLETED: 70, // Before validation
  VALIDATION_SUBMITTED: 65, // Before FindLog
  FINDLOG_CREATED_FROM_CAPTURE: 80, // High priority (creates data)
};
```

### Sync Flow

```
OFFLINE OPERATION:
1. User captures specimen → stored in IndexedDB
2. Preprocessing runs locally → ProcessedCapture stored
3. Classification runs locally (ONNX model) → ClassificationResult stored
4. User validates → ValidationEvent stored
5. FindLog created → linked to FieldSession
6. All events queued with priorities

CONNECTION RESTORED:
7. Sync worker processes queue by priority
   a. capture_session.created (95)
   b. raw_capture.added (85)
   c. findlog.created_from_capture (80)    ← High priority
   d. preprocessing.completed (75)
   e. classification.completed (70)
   f. validation.submitted (65)

8. Server receives events, validates, persists
9. Ground truth data collected for model improvement
10. Client receives confirmation, updates sync_status
```

### Batch Sync

```typescript
async function syncCaptureSession(sessionId: string): Promise<void> {
  // Get all related events
  const events = await db.events
    .where('capture_session_id')
    .equals(sessionId)
    .and((e) => e.sync_status !== SyncStatus.SYNCED)
    .sortBy('sequence_number');

  // Batch upload images first
  const rawCaptures = await db.rawCaptures.where('capture_session_id').equals(sessionId).toArray();

  for (const capture of rawCaptures) {
    if (capture.sync_status !== SyncStatus.SYNCED) {
      await uploadImage(capture.storage_path);
      capture.sync_status = SyncStatus.SYNCED;
      await db.rawCaptures.put(capture);
    }
  }

  // Sync events in priority order
  for (const event of events) {
    try {
      await fetch('/api/sync/pipeline-events', {
        method: 'POST',
        body: JSON.stringify(event),
      });

      event.sync_status = SyncStatus.SYNCED;
      await db.events.put(event);
    } catch (error) {
      event.sync_status = SyncStatus.FAILED;
      await db.events.put(event);
      throw error;
    }
  }
}
```

---

## Usage Examples

### Example 1: Complete Capture Flow

```typescript
// 1. Initialize capture
const captureSession = await createCaptureSession({
  field_session_id: activeSession.id,
  camera_mode: CameraMode.MACRO,
  lighting_condition: LightingCondition.NATURAL_BRIGHT,
  lat: 40.7128,
  lon: -74.006,
  device_id: 'device-abc',
});

// 2. Capture image
const imageData = await takePhoto();
const rawCapture = await createRawCapture({
  capture_session_id: captureSession.id,
  storage_path: await storeImage(imageData),
  // ... image metadata
});

// 3. Preprocess
const processedCapture = await preprocessImage(rawCapture);

// 4. Classify
const classificationResult = await classifySpecimen(processedCapture);

// 5. Check if validation needed
if (captureSession.state === CaptureState.PENDING_VALIDATION) {
  // Show UI for user validation
  const validation = await showValidationUI(classificationResult);
  await submitValidation(classificationResult, validation.action, validation.options);
}

// 6. Create FindLog
if (captureSession.state === CaptureState.VALIDATED) {
  const findLogId = await createFindLogFromCapture(captureSession);
  console.log(`FindLog created: ${findLogId}`);
}

// 7. Sync (when online)
await syncCaptureSession(captureSession.id);
```

### Example 2: High Confidence Auto-Accept

```typescript
// Classification completes with very high confidence
const result = await classifySpecimen(processedCapture);

if (
  result.confidence_score >= 0.96 &&
  processedCapture.quality_assessment === ImageQuality.EXCELLENT
) {
  // Auto-accept, skip user validation
  captureSession.state = CaptureState.VALIDATED;
  captureSession.final_material_id = result.predicted_material_id;
  captureSession.user_validated = false; // Auto-validated, not user

  // Create FindLog immediately
  await createFindLogFromCapture(captureSession);

  // Notify user
  showNotification(
    `Identified as ${result.predicted_material_name} with ${(result.confidence_score * 100).toFixed(
      1
    )}% confidence`
  );
}
```

### Example 3: Manual Identification Required

```typescript
// Low confidence or poor quality
const result = await classifySpecimen(processedCapture);

if (
  requiresManualIdentification(
    result.confidence_score,
    processedCapture.quality_assessment,
    result.alternative_predictions
  )
) {
  // Set state to manual required
  captureSession.state = CaptureState.MANUAL_REQUIRED;

  // Show manual identification UI
  const manualResult = await showManualIdentificationUI({
    image: rawCapture.storage_path,
    suggestedMaterials: result.alternative_predictions.map((p) => p.material_id),
    reason: getManualRequiredReason(result, processedCapture),
  });

  // Create validation event with manual selection
  await submitValidation(result, ValidationAction.REJECT_WITH_CORRECTION, {
    correctMaterialId: manualResult.selectedMaterialId,
    feedbackNotes: 'Manual identification - low confidence',
    userConfidence: manualResult.userConfidence,
  });

  // Create FindLog with manual identification
  await createFindLogFromCapture(captureSession);
}
```

---

## Summary

The Specimen Identification Pipeline provides:

✅ **End-to-end capture flow** - Camera → Classification → Validation → FindLog  
✅ **Preprocessing pipeline** - Quality assessment, feature extraction, enhancement  
✅ **ML classification** - Confidence scoring, alternatives, explainability  
✅ **User validation loop** - Ground truth collection for model improvement  
✅ **Deterministic events** - Complete audit trail with replay capability  
✅ **FindLog integration** - Auto-creation from validated captures  
✅ **FieldSession integration** - Seamless specimen logging during active sessions  
✅ **Offline-first** - Full pipeline works offline with ONNX models  
✅ **Priority-based sync** - Efficient batch upload when online

This architecture ensures accurate specimen identification, continuous model improvement through validated ground truth, and seamless integration with the broader rockhounding workflow.
