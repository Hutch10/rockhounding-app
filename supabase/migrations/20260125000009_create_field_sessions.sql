-- Rockhound FieldSession Database Schema & Migrations
-- Tables, indexes, RLS policies, and triggers for field_sessions

-- Enable PostGIS (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Field Sessions Table
CREATE TABLE public.field_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  
  -- Basic metadata
  title text NOT NULL,
  description text,
  location_name text,
  geology_type text,
  tags text[] DEFAULT ARRAY[]::text[],
  
  -- Session state machine
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ACTIVE', 'PAUSED', 'FINALIZING', 'COMPLETED', 'CANCELLED', 'CONFLICT'
  )),
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  paused_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity_at timestamp with time zone DEFAULT now(),
  
  -- Geospatial data
  path_geojson jsonb,
  center_point geometry(POINT, 4326),
  bounding_box jsonb, -- {north, south, east, west}
  
  -- Weather snapshot
  weather_snapshot jsonb,
  
  -- Equipment & specimens
  equipment_used text[],
  specimen_types_found text[],
  
  -- Content
  notes jsonb DEFAULT '[]'::jsonb, -- Array of {id, text, addedAt}
  attachment_ids uuid[] DEFAULT ARRAY[]::uuid[],
  photo_ids uuid[] DEFAULT ARRAY[]::uuid[],
  
  -- Linked find logs
  find_log_ids uuid[] DEFAULT ARRAY[]::uuid[],
  find_log_count int DEFAULT 0,
  
  -- Statistics (cached/computed)
  metrics jsonb DEFAULT '{}'::jsonb, -- {duration_ms, distance_m, finds_count, notes_count, photos_count, equipment_count}
  find_aggregates jsonb DEFAULT '{}'::jsonb, -- {specimensByType, findsByType, etc}
  
  -- Sync tracking
  sync_status text NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN (
    'PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED'
  )),
  synced_at timestamp with time zone,
  last_sync_error text,
  
  -- Offline tracking
  is_offline boolean DEFAULT false,
  offline_synced_at timestamp with time zone,
  checksum_hash text,
  
  -- Versioning
  version int DEFAULT 2,
  schema_version int DEFAULT 2,
  
  -- Audit
  created_by text DEFAULT 'system',
  updated_by text DEFAULT 'system'
);

-- Indexes for common queries
CREATE INDEX idx_field_sessions_user_id ON public.field_sessions(user_id);
CREATE INDEX idx_field_sessions_status ON public.field_sessions(status);
CREATE INDEX idx_field_sessions_created_at ON public.field_sessions(created_at DESC);
CREATE INDEX idx_field_sessions_started_at ON public.field_sessions(started_at);
CREATE INDEX idx_field_sessions_user_status ON public.field_sessions(user_id, status);
CREATE INDEX idx_field_sessions_sync_status ON public.field_sessions(sync_status);
CREATE INDEX idx_field_sessions_device_id ON public.field_sessions(device_id);

-- Geospatial index for location queries
CREATE INDEX idx_field_sessions_center_point ON public.field_sessions USING gist(center_point);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_field_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER field_sessions_timestamp_trigger
BEFORE UPDATE ON public.field_sessions
FOR EACH ROW
EXECUTE FUNCTION update_field_sessions_timestamp();

-- Auto-update last_activity_at on any INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_field_sessions_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER field_sessions_activity_trigger
BEFORE INSERT OR UPDATE ON public.field_sessions
FOR EACH ROW
EXECUTE FUNCTION update_field_sessions_activity();

-- Row-level security (RLS)
ALTER TABLE public.field_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY users_select_own_sessions ON public.field_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own sessions
CREATE POLICY users_insert_own_sessions ON public.field_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY users_update_own_sessions ON public.field_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own sessions
CREATE POLICY users_delete_own_sessions ON public.field_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_sessions TO authenticated;

-- View: User session summary statistics
CREATE OR REPLACE VIEW public.field_sessions_summary AS
SELECT
  id,
  user_id,
  title,
  status,
  created_at,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_minutes,
  (metrics->>'distance_m')::numeric as distance_meters,
  (metrics->>'finds_count')::int as finds_count,
  find_log_count,
  sync_status
FROM public.field_sessions;

-- View: User statistics
CREATE OR REPLACE VIEW public.user_session_stats AS
SELECT
  user_id,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_sessions,
  COALESCE(SUM((metrics->>'duration_ms')::numeric), 0) as total_duration_ms,
  COALESCE(SUM((metrics->>'distance_m')::numeric), 0) as total_distance_m,
  COALESCE(SUM((metrics->>'finds_count')::int), 0) as total_finds,
  MIN(created_at) as first_session,
  MAX(created_at) as last_session
FROM public.field_sessions
GROUP BY user_id;

-- Stored Procedure: Calculate session metrics
CREATE OR REPLACE FUNCTION calculate_session_metrics(session_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_duration_ms numeric;
  v_distance_m numeric;
  v_finds_count int;
  v_notes_count int;
  v_photos_count int;
  v_equipment_count int;
  v_session record;
BEGIN
  SELECT * INTO v_session FROM public.field_sessions WHERE id = session_id;
  
  IF v_session IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Calculate duration
  v_duration_ms := EXTRACT(EPOCH FROM (COALESCE(v_session.ended_at, now()) - COALESCE(v_session.started_at, v_session.created_at))) * 1000;
  
  -- Extract from geojson path (simplified - would need proper geojson parsing)
  v_distance_m := 0;
  
  -- Count items
  v_finds_count := array_length(v_session.find_log_ids, 1);
  v_notes_count := jsonb_array_length(v_session.notes);
  v_photos_count := array_length(v_session.photo_ids, 1);
  v_equipment_count := array_length(v_session.equipment_used, 1);
  
  RETURN jsonb_build_object(
    'duration_ms', v_duration_ms,
    'distance_m', v_distance_m,
    'finds_count', COALESCE(v_finds_count, 0),
    'notes_count', COALESCE(v_notes_count, 0),
    'photos_count', COALESCE(v_photos_count, 0),
    'equipment_count', COALESCE(v_equipment_count, 0)
  );
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Update session sync status
CREATE OR REPLACE FUNCTION update_session_sync_status(
  session_id uuid,
  new_status text,
  error_msg text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.field_sessions
  SET
    sync_status = new_status,
    synced_at = CASE WHEN new_status = 'SYNCED' THEN now() ELSE synced_at END,
    last_sync_error = error_msg,
    updated_at = now()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Complete session (finalize metrics)
CREATE OR REPLACE FUNCTION complete_session(session_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
  v_duration_ms numeric;
BEGIN
  -- Calculate final metrics
  v_metrics := calculate_session_metrics(session_id);
  
  -- Update session status to COMPLETED
  UPDATE public.field_sessions
  SET
    status = 'COMPLETED',
    ended_at = CASE WHEN ended_at IS NULL THEN now() ELSE ended_at END,
    metrics = v_metrics,
    updated_at = now()
  WHERE id = session_id
  RETURNING metrics INTO v_metrics;
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate bounding box from path
CREATE OR REPLACE FUNCTION calculate_bounding_box_from_path(path_geojson jsonb)
RETURNS jsonb AS $$
DECLARE
  v_bbox jsonb;
BEGIN
  -- Would parse GeoJSON path and calculate bounding box
  -- Returns {north: number, south: number, east: number, west: number}
  RETURN '{"north": 0, "south": 0, "east": 0, "west": 0}'::jsonb;
END;
$$ LANGUAGE plpgsql;

-- Indexes for JSON queries (if needed)
CREATE INDEX idx_field_sessions_weather ON public.field_sessions USING gin(weather_snapshot);
CREATE INDEX idx_field_sessions_metrics ON public.field_sessions USING gin(metrics);
CREATE INDEX idx_field_sessions_tags ON public.field_sessions USING gin(tags);

-- Comment on table for documentation
COMMENT ON TABLE public.field_sessions IS 'Core entity for field collecting sessions. Tracks location data, finds, timestamps, weather conditions, and sync status.';

COMMENT ON COLUMN public.field_sessions.status IS 'Session lifecycle state: DRAFT, ACTIVE, PAUSED, FINALIZING, COMPLETED, CANCELLED, CONFLICT';
COMMENT ON COLUMN public.field_sessions.sync_status IS 'Synchronization state with server: PENDING, SYNCING, SYNCED, CONFLICT, FAILED, RETRY_SCHEDULED';
COMMENT ON COLUMN public.field_sessions.path_geojson IS 'GeoJSON FeatureCollection of session path points';
COMMENT ON COLUMN public.field_sessions.center_point IS 'PostGIS point at session center for spatial queries';
COMMENT ON COLUMN public.field_sessions.weather_snapshot IS 'Weather conditions at session start: {temperature, humidity, condition, visibility, wind, pressure, uv_index}';
COMMENT ON COLUMN public.field_sessions.metrics IS 'Cached metrics: {duration_ms, distance_m, finds_count, notes_count, photos_count, equipment_count}';
COMMENT ON COLUMN public.field_sessions.find_aggregates IS 'Aggregated find log data: {specimensByType, findsByType, locations, dates}';
COMMENT ON COLUMN public.field_sessions.checksum_hash IS 'SHA256 hash of session for conflict detection and integrity checking';
