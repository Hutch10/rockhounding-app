-- Rockhound CaptureSession Subsystem Database Migration
-- Date: 2026-01-25

-- ===================== ENUMS =====================
CREATE TYPE capture_session_type AS ENUM ('PHOTO', 'VIDEO', 'BURST', 'PANORAMA', 'TIMELAPSE', 'UNKNOWN');
CREATE TYPE capture_session_state AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SYNCED', 'ARCHIVED', 'DELETED');
CREATE TYPE capture_sync_status AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED');
CREATE TYPE capture_media_type AS ENUM ('IMAGE', 'VIDEO', 'UNKNOWN');
CREATE TYPE capture_lighting_condition AS ENUM ('NATURAL', 'ARTIFICIAL', 'MIXED', 'LOW_LIGHT', 'FLASH', 'BACKLIT', 'UNKNOWN');
CREATE TYPE capture_preprocessing_status AS ENUM ('RAW', 'CROPPED', 'ENHANCED', 'CLASSIFIED', 'REJECTED', 'ERROR');

-- ===================== TABLES =====================

-- 1. capture_sessions
CREATE TABLE capture_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  field_session_id UUID NOT NULL,
  type capture_session_type NOT NULL,
  state capture_session_state NOT NULL DEFAULT 'DRAFT',
  sync_status capture_sync_status NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  location_point GEOMETRY(POINT, 4326) NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  altitude NUMERIC(8,2),
  accuracy NUMERIC(8,2),
  device_id VARCHAR(128) NOT NULL,
  device_model VARCHAR(128) NOT NULL,
  os VARCHAR(64) NOT NULL,
  app_version VARCHAR(32) NOT NULL,
  camera_type VARCHAR(32) NOT NULL,
  lens VARCHAR(64) NOT NULL,
  focal_length NUMERIC(6,2),
  iso INTEGER,
  exposure_time NUMERIC(8,4),
  white_balance VARCHAR(32),
  flash_used BOOLEAN,
  media_count INTEGER NOT NULL DEFAULT 0,
  burst_count INTEGER,
  notes TEXT,
  classification_pipeline_run_id UUID,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- 2. raw_captures
CREATE TABLE raw_captures (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type capture_media_type NOT NULL,
  uri TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  duration NUMERIC(8,2),
  exif JSONB,
  geo_point GEOMETRY(POINT, 4326) NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  altitude NUMERIC(8,2),
  accuracy NUMERIC(8,2),
  lighting capture_lighting_condition NOT NULL,
  preprocessing capture_preprocessing_status NOT NULL DEFAULT 'RAW',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. processed_captures
CREATE TABLE processed_captures (
  id UUID PRIMARY KEY,
  raw_capture_id UUID NOT NULL REFERENCES raw_captures(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  preprocessing capture_preprocessing_status NOT NULL,
  processed_uri TEXT NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT now(),
  classifier_id UUID,
  specimen_id UUID,
  classification_result_id UUID,
  notes TEXT
);

-- 4. classification_results
CREATE TABLE classification_results (
  id UUID PRIMARY KEY,
  processed_capture_id UUID NOT NULL REFERENCES processed_captures(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  pipeline_run_id UUID,
  result JSONB NOT NULL,
  confidence NUMERIC(5,2),
  classified_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 5. capture_events
CREATE TABLE capture_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  event_data JSONB,
  occurred_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ===================== INDEXES (30+) =====================
CREATE INDEX idx_capture_sessions_user_id ON capture_sessions(user_id);
CREATE INDEX idx_capture_sessions_field_session_id ON capture_sessions(field_session_id);
CREATE INDEX idx_capture_sessions_type ON capture_sessions(type);
CREATE INDEX idx_capture_sessions_state ON capture_sessions(state);
CREATE INDEX idx_capture_sessions_sync_status ON capture_sessions(sync_status);
CREATE INDEX idx_capture_sessions_started_at ON capture_sessions(started_at DESC);
CREATE INDEX idx_capture_sessions_completed_at ON capture_sessions(completed_at DESC);
CREATE INDEX idx_capture_sessions_location_point ON capture_sessions USING gist(location_point);
CREATE INDEX idx_capture_sessions_is_favorite ON capture_sessions(is_favorite);
CREATE INDEX idx_capture_sessions_is_private ON capture_sessions(is_private);
CREATE INDEX idx_capture_sessions_media_count ON capture_sessions(media_count DESC);
CREATE INDEX idx_raw_captures_session_id ON raw_captures(session_id);
CREATE INDEX idx_raw_captures_user_id ON raw_captures(user_id);
CREATE INDEX idx_raw_captures_type ON raw_captures(type);
CREATE INDEX idx_raw_captures_lighting ON raw_captures(lighting);
CREATE INDEX idx_raw_captures_preprocessing ON raw_captures(preprocessing);
CREATE INDEX idx_raw_captures_geo_point ON raw_captures USING gist(geo_point);
CREATE INDEX idx_processed_captures_session_id ON processed_captures(session_id);
CREATE INDEX idx_processed_captures_user_id ON processed_captures(user_id);
CREATE INDEX idx_processed_captures_preprocessing ON processed_captures(preprocessing);
CREATE INDEX idx_processed_captures_classifier_id ON processed_captures(classifier_id);
CREATE INDEX idx_processed_captures_specimen_id ON processed_captures(specimen_id);
CREATE INDEX idx_classification_results_session_id ON classification_results(session_id);
CREATE INDEX idx_classification_results_user_id ON classification_results(user_id);
CREATE INDEX idx_classification_results_pipeline_run_id ON classification_results(pipeline_run_id);
CREATE INDEX idx_classification_results_confidence ON classification_results(confidence DESC);
CREATE INDEX idx_capture_events_session_id ON capture_events(session_id);
CREATE INDEX idx_capture_events_user_id ON capture_events(user_id);
CREATE INDEX idx_capture_events_event_type ON capture_events(event_type);
CREATE INDEX idx_capture_events_occurred_at ON capture_events(occurred_at DESC);

-- ===================== RLS POLICIES =====================
ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own capture_sessions" ON capture_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own capture_sessions" ON capture_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own capture_sessions" ON capture_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own capture_sessions" ON capture_sessions FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE raw_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own raw_captures" ON raw_captures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own raw_captures" ON raw_captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own raw_captures" ON raw_captures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own raw_captures" ON raw_captures FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE processed_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own processed_captures" ON processed_captures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own processed_captures" ON processed_captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own processed_captures" ON processed_captures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own processed_captures" ON processed_captures FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE classification_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own classification_results" ON classification_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own classification_results" ON classification_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own classification_results" ON classification_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own classification_results" ON classification_results FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE capture_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own capture_events" ON capture_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own capture_events" ON capture_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own capture_events" ON capture_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own capture_events" ON capture_events FOR DELETE USING (auth.uid() = user_id);

-- ===================== TRIGGERS =====================
-- Timestamp update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_capture_sessions_timestamp
  BEFORE UPDATE ON capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Media count update
CREATE OR REPLACE FUNCTION update_media_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.media_count = (SELECT COUNT(*) FROM raw_captures WHERE session_id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_count_trigger
  AFTER INSERT OR DELETE OR UPDATE ON raw_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_media_count();

-- Preprocessing/classification status update
CREATE OR REPLACE FUNCTION update_preprocessing_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE processed_captures SET preprocessing = NEW.preprocessing WHERE raw_capture_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_preprocessing_status_trigger
  AFTER UPDATE OF preprocessing ON raw_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_preprocessing_status();

-- Event sourcing
CREATE OR REPLACE FUNCTION log_capture_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO capture_events (id, session_id, user_id, event_type, event_data, occurred_at)
  VALUES (gen_random_uuid(), NEW.id, NEW.user_id, TG_OP, row_to_json(NEW), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_capture_event_trigger
  AFTER INSERT OR UPDATE OR DELETE ON capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_capture_event();

-- ===================== MATERIALIZED VIEWS =====================
-- 1. capture_session_complete
CREATE MATERIALIZED VIEW capture_session_complete AS
SELECT
  cs.id,
  cs.user_id,
  cs.field_session_id,
  cs.type,
  cs.state,
  cs.sync_status,
  cs.started_at,
  cs.completed_at,
  cs.media_count,
  cs.burst_count,
  cs.is_favorite,
  cs.is_private,
  cs.version,
  cs.schema_version,
  COUNT(DISTINCT rc.id) AS raw_count,
  COUNT(DISTINCT pc.id) AS processed_count,
  COUNT(DISTINCT cr.id) AS classified_count
FROM capture_sessions cs
LEFT JOIN raw_captures rc ON rc.session_id = cs.id
LEFT JOIN processed_captures pc ON pc.session_id = cs.id
LEFT JOIN classification_results cr ON cr.session_id = cs.id
GROUP BY cs.id;

-- 2. preprocessing_metrics
CREATE MATERIALIZED VIEW preprocessing_metrics AS
SELECT
  pc.preprocessing,
  COUNT(*) AS processed_count
FROM processed_captures pc
GROUP BY pc.preprocessing;

-- 3. classification_metrics
CREATE MATERIALIZED VIEW classification_metrics AS
SELECT
  cr.pipeline_run_id,
  AVG(cr.confidence) AS avg_confidence,
  COUNT(*) AS classified_count
FROM classification_results cr
GROUP BY cr.pipeline_run_id;

-- ===================== STORED PROCEDURES =====================
-- Query by FieldSession
CREATE OR REPLACE FUNCTION get_capture_sessions_by_field_session(fid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type capture_session_type,
  state capture_session_state,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  media_count INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT id, user_id, type, state, started_at, completed_at, media_count
    FROM capture_sessions WHERE field_session_id = fid;
END;
$$ LANGUAGE plpgsql;

-- Query by date range
CREATE OR REPLACE FUNCTION get_capture_sessions_by_date_range(uid UUID, from_date TIMESTAMP, to_date TIMESTAMP)
RETURNS TABLE (
  id UUID,
  type capture_session_type,
  state capture_session_state,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  media_count INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT id, type, state, started_at, completed_at, media_count
    FROM capture_sessions WHERE user_id = uid AND started_at >= from_date AND started_at <= to_date;
END;
$$ LANGUAGE plpgsql;

-- Query by GPS radius
CREATE OR REPLACE FUNCTION get_capture_sessions_by_gps(uid UUID, lat NUMERIC, lon NUMERIC, radius_m NUMERIC)
RETURNS TABLE (
  id UUID,
  type capture_session_type,
  state capture_session_state,
  started_at TIMESTAMP,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_m NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT id, type, state, started_at, latitude, longitude,
    ST_Distance(location_point, ST_SetSRID(ST_MakePoint(lon, lat), 4326)) AS distance_m
    FROM capture_sessions
    WHERE user_id = uid AND ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(lon, lat), 4326), radius_m);
END;
$$ LANGUAGE plpgsql;

-- Query by preprocessing/classification status
CREATE OR REPLACE FUNCTION get_capture_sessions_by_status(uid UUID, status capture_preprocessing_status)
RETURNS TABLE (
  session_id UUID,
  media_id UUID,
  preprocessing capture_preprocessing_status,
  processed_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY SELECT pc.session_id, pc.id, pc.preprocessing, pc.processed_at
    FROM processed_captures pc WHERE pc.user_id = uid AND pc.preprocessing = status;
END;
$$ LANGUAGE plpgsql;

-- ===================== INTEGRATION NOTES =====================
-- All tables and triggers are compatible with Sync Engine, Offline Storage, Telemetry, and Camera → Specimen Pipeline.
-- Event sourcing via capture_events enables replay and audit.
-- PostGIS indexes support fast geospatial queries.
-- RLS policies ensure user isolation for all core tables.
-- Materialized views and stored procedures support dashboard and metrics queries.
