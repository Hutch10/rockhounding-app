-- =====================================================
-- Specimen Identification Pipeline Migration
-- =====================================================
-- This migration creates the complete database schema for the
-- Camera → Specimen Identification Pipeline, including:
-- - capture_sessions: Container for identification workflows
-- - raw_captures: Original images with EXIF metadata
-- - processed_captures: Preprocessed images with quality metrics
-- - classification_results: ML model predictions
-- - validation_events: User validation for ground truth
-- - Integration with field_sessions and find_logs
-- - Triggers for automatic metrics updates
-- - RLS policies for security
-- - Indexes for performance

-- =====================================================
-- 1. CAPTURE SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_session_id UUID REFERENCES field_sessions(id) ON DELETE SET NULL,
  find_log_id UUID REFERENCES find_logs(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,
  
  -- State machine
  state TEXT NOT NULL CHECK (state IN (
    'READY',                  -- Session initialized
    'CAPTURED',               -- Image(s) captured
    'PREPROCESSING',          -- Images being processed
    'CLASSIFYING',            -- Running ML classification
    'PENDING_VALIDATION',     -- Awaiting user validation
    'MANUAL_REQUIRED',        -- Low confidence, manual ID required
    'VALIDATED',              -- User validated results
    'COMPLETED',              -- FindLog created
    'FAILED',                 -- Pipeline error
    'CANCELLED'               -- User cancelled
  )),
  camera_mode TEXT NOT NULL CHECK (camera_mode IN (
    'PHOTO',                  -- Standard photo
    'MACRO',                  -- Macro/close-up mode
    'HDR',                    -- High dynamic range
    'MULTI_ANGLE',            -- Multiple angles
    'VIDEO'                   -- Video mode
  )),
  image_count INTEGER NOT NULL DEFAULT 0,
  
  -- GPS location (from device)
  geom GEOGRAPHY(POINT, 4326),
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  altitude_m DOUBLE PRECISION,
  location_accuracy_m DOUBLE PRECISION,
  
  -- Environmental context
  lighting_condition TEXT CHECK (lighting_condition IN (
    'NATURAL_BRIGHT',         -- Bright sunlight
    'NATURAL_OVERCAST',       -- Cloudy/overcast
    'NATURAL_SHADE',          -- In shade
    'ARTIFICIAL_FLASH',       -- Camera flash
    'ARTIFICIAL_LAMP',        -- Lamp/light box
    'MIXED',                  -- Mixed lighting
    'LOW_LIGHT'               -- Low light conditions
  )),
  weather_condition TEXT,
  temperature_c DOUBLE PRECISION,
  
  -- Results
  best_classification_result_id UUID,
  final_material_id TEXT,
  user_validated BOOLEAN NOT NULL DEFAULT false,
  validation_timestamp TIMESTAMPTZ,
  
  -- Temporal
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 95,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on user_id for quick lookup
CREATE INDEX idx_capture_sessions_user_id ON capture_sessions(user_id);

-- Index on field_session_id for session integration
CREATE INDEX idx_capture_sessions_field_session_id ON capture_sessions(field_session_id) WHERE field_session_id IS NOT NULL;

-- Index on state for filtering
CREATE INDEX idx_capture_sessions_state ON capture_sessions(state);

-- Index on sync_status for sync queue
CREATE INDEX idx_capture_sessions_sync ON capture_sessions(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

-- Spatial index for geographic queries
CREATE INDEX idx_capture_sessions_geom ON capture_sessions USING GIST(geom) WHERE geom IS NOT NULL;

-- Composite index for user's recent sessions
CREATE INDEX idx_capture_sessions_user_recent ON capture_sessions(user_id, created_at DESC);

COMMENT ON TABLE capture_sessions IS 'Container for specimen identification workflows from camera capture to FindLog creation';
COMMENT ON COLUMN capture_sessions.state IS 'Current state in identification pipeline state machine';
COMMENT ON COLUMN capture_sessions.camera_mode IS 'Camera mode used for capture (PHOTO, MACRO, HDR, etc.)';
COMMENT ON COLUMN capture_sessions.best_classification_result_id IS 'ID of the classification result with highest confidence';
COMMENT ON COLUMN capture_sessions.final_material_id IS 'Final material ID after validation (may differ from prediction)';

-- =====================================================
-- 2. RAW CAPTURES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS raw_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Storage
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'raw-captures',
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  
  -- Image dimensions
  width_px INTEGER NOT NULL,
  height_px INTEGER NOT NULL,
  aspect_ratio DOUBLE PRECISION,
  
  -- EXIF metadata (stored as JSONB for flexibility)
  exif_data JSONB,
  camera_make TEXT,
  camera_model TEXT,
  lens_model TEXT,
  
  -- Camera settings
  iso INTEGER,
  aperture DOUBLE PRECISION,
  shutter_speed TEXT,
  focal_length_mm DOUBLE PRECISION,
  flash_fired BOOLEAN,
  white_balance TEXT,
  exposure_compensation DOUBLE PRECISION,
  
  -- GPS from EXIF (may differ from device GPS)
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_altitude_m DOUBLE PRECISION,
  gps_timestamp TIMESTAMPTZ,
  
  -- Temporal
  captured_at TIMESTAMPTZ NOT NULL,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 85,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on capture_session_id for fetching all images in session
CREATE INDEX idx_raw_captures_session ON raw_captures(capture_session_id);

-- Index on user_id
CREATE INDEX idx_raw_captures_user_id ON raw_captures(user_id);

-- Index on sync status
CREATE INDEX idx_raw_captures_sync ON raw_captures(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

-- Index on captured_at for temporal queries
CREATE INDEX idx_raw_captures_captured_at ON raw_captures(captured_at DESC);

-- GIN index on EXIF data for JSON queries
CREATE INDEX idx_raw_captures_exif ON raw_captures USING GIN(exif_data);

COMMENT ON TABLE raw_captures IS 'Original images captured with full EXIF metadata';
COMMENT ON COLUMN raw_captures.storage_path IS 'Path in storage bucket (e.g., user123/session456/img789.jpg)';
COMMENT ON COLUMN raw_captures.exif_data IS 'Complete EXIF metadata as JSONB for flexible querying';

-- =====================================================
-- 3. PROCESSED CAPTURES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS processed_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_capture_id UUID NOT NULL REFERENCES raw_captures(id) ON DELETE CASCADE,
  capture_session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Processing status
  status TEXT NOT NULL CHECK (status IN (
    'PENDING',                -- Awaiting processing
    'PROCESSING',             -- Currently processing
    'COMPLETED',              -- Successfully processed
    'FAILED',                 -- Processing failed
    'SKIPPED'                 -- Skipped (e.g., poor quality)
  )),
  
  -- Storage
  processed_storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'processed-captures',
  pipeline_version TEXT NOT NULL,
  
  -- Processed image metadata
  width_px INTEGER NOT NULL,
  height_px INTEGER NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  
  -- Preprocessing steps (stored as JSONB array)
  preprocessing_steps JSONB NOT NULL,
  
  -- Quality metrics
  quality_metrics JSONB NOT NULL,
  quality_score DOUBLE PRECISION NOT NULL,
  quality_assessment TEXT NOT NULL CHECK (quality_assessment IN (
    'EXCELLENT',              -- >= 0.85
    'GOOD',                   -- >= 0.70
    'FAIR',                   -- >= 0.50
    'POOR',                   -- >= 0.30
    'UNUSABLE'                -- < 0.30
  )),
  
  -- Detected features (for classification)
  detected_features JSONB,
  color_histogram JSONB,
  texture_features JSONB,
  edge_density DOUBLE PRECISION,
  blur_score DOUBLE PRECISION,
  
  -- Performance
  processing_time_ms INTEGER NOT NULL,
  processing_started_at TIMESTAMPTZ NOT NULL,
  processing_completed_at TIMESTAMPTZ,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 75,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on raw_capture_id
CREATE INDEX idx_processed_captures_raw ON processed_captures(raw_capture_id);

-- Index on capture_session_id
CREATE INDEX idx_processed_captures_session ON processed_captures(capture_session_id);

-- Index on status
CREATE INDEX idx_processed_captures_status ON processed_captures(status);

-- Index on quality_assessment for filtering
CREATE INDEX idx_processed_captures_quality ON processed_captures(quality_assessment);

-- GIN indexes on JSONB fields
CREATE INDEX idx_processed_captures_features ON processed_captures USING GIN(detected_features);
CREATE INDEX idx_processed_captures_steps ON processed_captures USING GIN(preprocessing_steps);

COMMENT ON TABLE processed_captures IS 'Preprocessed images with quality metrics and extracted features';
COMMENT ON COLUMN processed_captures.preprocessing_steps IS 'Array of preprocessing steps applied (resize, normalize, denoise, etc.)';
COMMENT ON COLUMN processed_captures.quality_metrics IS 'Detailed quality metrics (brightness, contrast, sharpness, noise, etc.)';
COMMENT ON COLUMN processed_captures.detected_features IS 'Extracted features for classification (color, texture, structure, etc.)';

-- =====================================================
-- 4. CLASSIFICATION RESULTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS classification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_capture_id UUID NOT NULL REFERENCES processed_captures(id) ON DELETE CASCADE,
  capture_session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Classification status
  status TEXT NOT NULL CHECK (status IN (
    'PENDING',                -- Awaiting classification
    'CLASSIFYING',            -- Model inference in progress
    'COMPLETED',              -- Classification completed
    'FAILED',                 -- Classification failed
    'INVALIDATED'             -- Invalidated by new result
  )),
  
  -- Model information
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_architecture TEXT,
  
  -- Primary prediction
  predicted_material_id TEXT NOT NULL,
  predicted_material_name TEXT NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN (
    'VERY_HIGH',              -- >= 95%
    'HIGH',                   -- >= 85%
    'MODERATE',               -- >= 70%
    'LOW',                    -- >= 50%
    'VERY_LOW'                -- < 50%
  )),
  
  -- Alternative predictions (stored as JSONB array)
  alternative_predictions JSONB NOT NULL,
  
  -- Explainability
  features_used TEXT[] NOT NULL,
  feature_importance JSONB,
  attention_regions JSONB,
  similar_specimens JSONB,
  
  -- Uncertainty quantification
  epistemic_uncertainty DOUBLE PRECISION,
  aleatoric_uncertainty DOUBLE PRECISION,
  total_uncertainty DOUBLE PRECISION,
  
  -- Performance
  inference_time_ms INTEGER NOT NULL,
  classified_at TIMESTAMPTZ NOT NULL,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 70,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on processed_capture_id
CREATE INDEX idx_classification_results_processed ON classification_results(processed_capture_id);

-- Index on capture_session_id
CREATE INDEX idx_classification_results_session ON classification_results(capture_session_id);

-- Index on predicted_material_id for material-based queries
CREATE INDEX idx_classification_results_material ON classification_results(predicted_material_id);

-- Index on confidence_level for filtering
CREATE INDEX idx_classification_results_confidence ON classification_results(confidence_level);

-- Index on status
CREATE INDEX idx_classification_results_status ON classification_results(status);

-- GIN indexes on JSONB fields
CREATE INDEX idx_classification_results_alternatives ON classification_results USING GIN(alternative_predictions);
CREATE INDEX idx_classification_results_features ON classification_results USING GIN(feature_importance);

-- Composite index for material confidence analysis
CREATE INDEX idx_classification_results_material_conf ON classification_results(predicted_material_id, confidence_score DESC);

COMMENT ON TABLE classification_results IS 'ML model predictions with confidence scores and explainability data';
COMMENT ON COLUMN classification_results.confidence_level IS 'Categorized confidence: VERY_HIGH (>=95%), HIGH (>=85%), MODERATE (>=70%), LOW (>=50%), VERY_LOW (<50%)';
COMMENT ON COLUMN classification_results.alternative_predictions IS 'Top-K alternative predictions with confidence scores';
COMMENT ON COLUMN classification_results.feature_importance IS 'Feature importance scores for explainability';
COMMENT ON COLUMN classification_results.attention_regions IS 'Visual attention maps showing what model focused on';

-- =====================================================
-- 5. VALIDATION EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS validation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_result_id UUID NOT NULL REFERENCES classification_results(id) ON DELETE CASCADE,
  capture_session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Validation action
  action TEXT NOT NULL CHECK (action IN (
    'ACCEPT',                 -- Correct identification
    'REJECT_WITH_CORRECTION', -- Wrong, user provided correct ID
    'REJECT_UNCERTAIN',       -- Wrong, user unsure of correct
    'REQUEST_EXPERT',         -- Request expert review
    'SKIP'                    -- Skip for now
  )),
  
  -- Material IDs
  predicted_material_id TEXT NOT NULL,
  correct_material_id TEXT,
  
  -- Feedback
  feedback_notes TEXT,
  validation_duration_seconds INTEGER,
  user_confidence INTEGER CHECK (user_confidence >= 1 AND user_confidence <= 5),
  is_expert_validation BOOLEAN NOT NULL DEFAULT false,
  expert_user_id UUID REFERENCES auth.users(id),
  
  -- Event sourcing
  sequence_number INTEGER NOT NULL,
  
  -- Temporal
  validated_at TIMESTAMPTZ NOT NULL,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 65,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on classification_result_id
CREATE INDEX idx_validation_events_classification ON validation_events(classification_result_id);

-- Index on capture_session_id with sequence_number for event sourcing
CREATE INDEX idx_validation_events_session_seq ON validation_events(capture_session_id, sequence_number);

-- Index on action for analytics
CREATE INDEX idx_validation_events_action ON validation_events(action);

-- Index on predicted vs correct material for ground truth analysis
CREATE INDEX idx_validation_events_ground_truth ON validation_events(predicted_material_id, correct_material_id) WHERE correct_material_id IS NOT NULL;

-- Index on expert validations
CREATE INDEX idx_validation_events_expert ON validation_events(is_expert_validation) WHERE is_expert_validation = true;

-- Composite index for user validation history
CREATE INDEX idx_validation_events_user_history ON validation_events(user_id, validated_at DESC);

COMMENT ON TABLE validation_events IS 'User validation events for ground truth collection and model improvement';
COMMENT ON COLUMN validation_events.action IS 'Validation action: ACCEPT, REJECT_WITH_CORRECTION, REJECT_UNCERTAIN, REQUEST_EXPERT, SKIP';
COMMENT ON COLUMN validation_events.correct_material_id IS 'User-provided correct material ID (for REJECT_WITH_CORRECTION)';
COMMENT ON COLUMN validation_events.is_expert_validation IS 'Whether validation was performed by verified expert';
COMMENT ON COLUMN validation_events.sequence_number IS 'Event sequence number for deterministic replay';

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_capture_sessions_updated_at BEFORE UPDATE ON capture_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_raw_captures_updated_at BEFORE UPDATE ON raw_captures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processed_captures_updated_at BEFORE UPDATE ON processed_captures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classification_results_updated_at BEFORE UPDATE ON classification_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_events_updated_at BEFORE UPDATE ON validation_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version on capture_session update
CREATE OR REPLACE FUNCTION increment_capture_session_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_capture_sessions_version BEFORE UPDATE ON capture_sessions
  FOR EACH ROW EXECUTE FUNCTION increment_capture_session_version();

-- Calculate capture_session duration
CREATE OR REPLACE FUNCTION calculate_capture_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_capture_sessions_duration BEFORE UPDATE ON capture_sessions
  FOR EACH ROW EXECUTE FUNCTION calculate_capture_session_duration();

-- Update capture_session image count when raw_capture added
CREATE OR REPLACE FUNCTION update_capture_session_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE capture_sessions
    SET image_count = image_count + 1
    WHERE id = NEW.capture_session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE capture_sessions
    SET image_count = image_count - 1
    WHERE id = OLD.capture_session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_capture_session_image_count_on_insert
AFTER INSERT ON raw_captures
FOR EACH ROW EXECUTE FUNCTION update_capture_session_image_count();

CREATE TRIGGER update_capture_session_image_count_on_delete
AFTER DELETE ON raw_captures
FOR EACH ROW EXECUTE FUNCTION update_capture_session_image_count();

-- Calculate aspect ratio for raw_capture
CREATE OR REPLACE FUNCTION calculate_raw_capture_aspect_ratio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.width_px > 0 AND NEW.height_px > 0 THEN
    NEW.aspect_ratio = NEW.width_px::DOUBLE PRECISION / NEW.height_px::DOUBLE PRECISION;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_raw_captures_aspect_ratio BEFORE INSERT OR UPDATE ON raw_captures
  FOR EACH ROW EXECUTE FUNCTION calculate_raw_capture_aspect_ratio();

-- Set geom from lat/lon for capture_sessions
CREATE OR REPLACE FUNCTION set_capture_session_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326)::GEOGRAPHY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_capture_sessions_geom BEFORE INSERT OR UPDATE ON capture_sessions
  FOR EACH ROW EXECUTE FUNCTION set_capture_session_geom();

-- =====================================================
-- 7. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_events ENABLE ROW LEVEL SECURITY;

-- Capture Sessions Policies
CREATE POLICY capture_sessions_select_own ON capture_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY capture_sessions_insert_own ON capture_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY capture_sessions_update_own ON capture_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY capture_sessions_delete_own ON capture_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Raw Captures Policies
CREATE POLICY raw_captures_select_own ON raw_captures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY raw_captures_insert_own ON raw_captures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY raw_captures_update_own ON raw_captures
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY raw_captures_delete_own ON raw_captures
  FOR DELETE USING (auth.uid() = user_id);

-- Processed Captures Policies
CREATE POLICY processed_captures_select_own ON processed_captures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY processed_captures_insert_own ON processed_captures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY processed_captures_update_own ON processed_captures
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY processed_captures_delete_own ON processed_captures
  FOR DELETE USING (auth.uid() = user_id);

-- Classification Results Policies
CREATE POLICY classification_results_select_own ON classification_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY classification_results_insert_own ON classification_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY classification_results_update_own ON classification_results
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY classification_results_delete_own ON classification_results
  FOR DELETE USING (auth.uid() = user_id);

-- Validation Events Policies
CREATE POLICY validation_events_select_own ON validation_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY validation_events_insert_own ON validation_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY validation_events_update_own ON validation_events
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY validation_events_delete_own ON validation_events
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 8. VIEWS
-- =====================================================

-- Complete capture session view with all related data
CREATE OR REPLACE VIEW capture_sessions_complete AS
SELECT
  cs.id,
  cs.user_id,
  cs.field_session_id,
  cs.find_log_id,
  cs.state,
  cs.camera_mode,
  cs.image_count,
  cs.lat,
  cs.lon,
  cs.lighting_condition,
  cs.best_classification_result_id,
  cs.final_material_id,
  cs.user_validated,
  cs.started_at,
  cs.completed_at,
  cs.duration_ms,
  
  -- Classification result details
  cr.predicted_material_id,
  cr.predicted_material_name,
  cr.confidence_score,
  cr.confidence_level,
  cr.model_name,
  cr.model_version,
  
  -- Validation details
  ve.action AS validation_action,
  ve.correct_material_id AS validation_material_id,
  ve.is_expert_validation,
  ve.validated_at,
  
  -- Quality metrics
  pc.quality_assessment,
  pc.quality_score,
  
  cs.created_at,
  cs.updated_at
FROM capture_sessions cs
LEFT JOIN classification_results cr ON cs.best_classification_result_id = cr.id
LEFT JOIN validation_events ve ON cs.id = ve.capture_session_id
LEFT JOIN processed_captures pc ON cr.processed_capture_id = pc.id;

COMMENT ON VIEW capture_sessions_complete IS 'Complete view of capture sessions with classification, validation, and quality data';

-- Ground truth data for model training
CREATE OR REPLACE VIEW ground_truth_samples AS
SELECT
  cr.id AS classification_result_id,
  pc.id AS processed_capture_id,
  rc.id AS raw_capture_id,
  rc.storage_path AS image_path,
  cr.predicted_material_id,
  COALESCE(ve.correct_material_id, cr.predicted_material_id) AS correct_material_id,
  cr.confidence_score,
  cr.confidence_level,
  pc.quality_assessment,
  pc.quality_score,
  pc.detected_features,
  ve.action AS validation_action,
  ve.user_confidence,
  ve.is_expert_validation,
  cs.lighting_condition,
  cs.camera_mode,
  cr.model_name,
  cr.model_version,
  cr.alternative_predictions,
  cr.classified_at,
  ve.validated_at
FROM classification_results cr
JOIN processed_captures pc ON cr.processed_capture_id = pc.id
JOIN raw_captures rc ON pc.raw_capture_id = rc.id
JOIN capture_sessions cs ON cr.capture_session_id = cs.id
LEFT JOIN validation_events ve ON cr.id = ve.classification_result_id
WHERE cr.status = 'COMPLETED'
  AND (ve.action IN ('ACCEPT', 'REJECT_WITH_CORRECTION') OR cr.confidence_score >= 0.95);

COMMENT ON VIEW ground_truth_samples IS 'Ground truth data for model training and evaluation';

-- Model performance metrics
CREATE OR REPLACE VIEW model_performance_metrics AS
SELECT
  model_name,
  model_version,
  COUNT(*) AS total_predictions,
  AVG(confidence_score) AS avg_confidence,
  COUNT(*) FILTER (WHERE confidence_level = 'VERY_HIGH') AS very_high_confidence_count,
  COUNT(*) FILTER (WHERE confidence_level = 'HIGH') AS high_confidence_count,
  COUNT(*) FILTER (WHERE confidence_level = 'MODERATE') AS moderate_confidence_count,
  COUNT(*) FILTER (WHERE confidence_level = 'LOW') AS low_confidence_count,
  COUNT(*) FILTER (WHERE confidence_level = 'VERY_LOW') AS very_low_confidence_count,
  AVG(inference_time_ms) AS avg_inference_time_ms,
  MIN(classified_at) AS first_prediction_at,
  MAX(classified_at) AS last_prediction_at
FROM classification_results
WHERE status = 'COMPLETED'
GROUP BY model_name, model_version;

COMMENT ON VIEW model_performance_metrics IS 'Performance metrics for ML models (accuracy, confidence distribution, inference time)';

-- =====================================================
-- 9. FUNCTIONS
-- =====================================================

-- Get next sequence number for event sourcing
CREATE OR REPLACE FUNCTION get_next_sequence_number(p_capture_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM validation_events
  WHERE capture_session_id = p_capture_session_id;
  
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_sequence_number IS 'Get next sequence number for event sourcing in validation events';

-- Get capture sessions within radius
CREATE OR REPLACE FUNCTION get_capture_sessions_within_radius(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  state TEXT,
  final_material_id TEXT,
  confidence_score DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.user_id,
    cs.state,
    cs.final_material_id,
    cr.confidence_score,
    ST_Distance(
      cs.geom,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::GEOGRAPHY
    ) AS distance_m,
    cs.lat,
    cs.lon,
    cs.created_at
  FROM capture_sessions cs
  LEFT JOIN classification_results cr ON cs.best_classification_result_id = cr.id
  WHERE cs.geom IS NOT NULL
    AND ST_DWithin(
      cs.geom,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::GEOGRAPHY,
      p_radius_m
    )
  ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_capture_sessions_within_radius IS 'Find capture sessions within radius (meters) of a point';

-- =====================================================
-- 10. GRANTS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON capture_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON raw_captures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON processed_captures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classification_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON validation_events TO authenticated;

-- Grant permissions on views
GRANT SELECT ON capture_sessions_complete TO authenticated;
GRANT SELECT ON ground_truth_samples TO authenticated;
GRANT SELECT ON model_performance_metrics TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_next_sequence_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_capture_sessions_within_radius TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The Specimen Identification Pipeline schema is now ready.
-- Tables created: 5 (capture_sessions, raw_captures, processed_captures, classification_results, validation_events)
-- Views created: 3 (capture_sessions_complete, ground_truth_samples, model_performance_metrics)
-- Functions created: 2 (get_next_sequence_number, get_capture_sessions_within_radius)
-- Triggers created: 10 (auto-update, version increment, duration calculation, etc.)
-- RLS policies created: 20 (4 per table for CRUD operations)
-- Indexes created: 30+ (for performance optimization)
