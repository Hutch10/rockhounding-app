-- Field Sessions: Rockhounding expedition sessions with offline-first support
-- Build Document: Field session tracking with FindLog aggregation and sync events

-- ============================================================================
-- FIELD SESSIONS TABLE
-- ============================================================================

CREATE TABLE field_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner (REQUIRED for RLS)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Device tracking
  device_id TEXT NOT NULL,
  
  -- State management
  state TEXT NOT NULL CHECK (state IN (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'FINALIZING',
    'COMPLETED',
    'CANCELLED',
    'CONFLICT'
  )),
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY',
    'PENDING',
    'SYNCING',
    'SYNCED',
    'FAILED',
    'CONFLICT'
  )),
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Session metadata
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 2000),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN (
    'PRIVATE',
    'SHARED_LINK',
    'TEAM'
  )),
  
  -- Temporal data
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  
  -- Environmental conditions
  weather_condition TEXT CHECK (weather_condition IN (
    'CLEAR',
    'PARTLY_CLOUDY',
    'OVERCAST',
    'LIGHT_RAIN',
    'HEAVY_RAIN',
    'SNOW',
    'FOG',
    'WINDY',
    'EXTREME_HEAT',
    'EXTREME_COLD'
  )),
  temperature_celsius NUMERIC(4, 1) CHECK (temperature_celsius BETWEEN -50 AND 60),
  field_conditions TEXT CHECK (char_length(field_conditions) <= 500),
  
  -- Spatial data (PostGIS)
  start_geom geography(Point, 4326),
  start_lat NUMERIC(10, 7) CHECK (start_lat BETWEEN -90 AND 90),
  start_lon NUMERIC(11, 7) CHECK (start_lon BETWEEN -180 AND 180),
  end_geom geography(Point, 4326),
  end_lat NUMERIC(10, 7) CHECK (end_lat BETWEEN -90 AND 90),
  end_lon NUMERIC(11, 7) CHECK (end_lon BETWEEN -180 AND 180),
  track_geom geography(LineString, 4326),
  
  -- Aggregated metrics (computed from find_logs)
  total_specimens INTEGER NOT NULL DEFAULT 0 CHECK (total_specimens >= 0),
  unique_materials INTEGER NOT NULL DEFAULT 0 CHECK (unique_materials >= 0),
  total_weight_grams NUMERIC(10, 2) CHECK (total_weight_grams >= 0),
  average_quality NUMERIC(3, 2) CHECK (average_quality BETWEEN 1 AND 5),
  materials_found UUID[] NOT NULL DEFAULT '{}',
  best_find_id UUID,
  
  -- Sync metadata
  client_created_at TIMESTAMPTZ NOT NULL,
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_synced_at TIMESTAMPTZ,
  conflict_resolution TEXT CHECK (conflict_resolution IN (
    'client_wins',
    'server_wins',
    'merged'
  )),
  
  -- Database metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_end_time CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT completed_has_end_time CHECK (
    state != 'COMPLETED' OR end_time IS NOT NULL
  ),
  CONSTRAINT finalized_has_specimens CHECK (
    state NOT IN ('FINALIZING', 'COMPLETED') OR total_specimens > 0
  )
);

-- ============================================================================
-- FIND LOGS TABLE
-- ============================================================================

CREATE TABLE find_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent session
  session_id UUID NOT NULL REFERENCES field_sessions(id) ON DELETE CASCADE,
  
  -- Owner (REQUIRED for RLS)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Device tracking
  device_id TEXT NOT NULL,
  
  -- Specimen data
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  material_name TEXT CHECK (char_length(material_name) <= 200),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  weight_grams NUMERIC(10, 2) CHECK (weight_grams > 0),
  
  -- Specimen dimensions (length x width x height in mm)
  dimension_length_mm NUMERIC(10, 2) CHECK (dimension_length_mm > 0),
  dimension_width_mm NUMERIC(10, 2) CHECK (dimension_width_mm > 0),
  dimension_height_mm NUMERIC(10, 2) CHECK (dimension_height_mm > 0),
  
  -- Field notes
  notes TEXT CHECK (char_length(notes) <= 2000),
  
  -- Photos (Supabase Storage paths)
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  
  -- Spatial data (where specimen was found)
  geom geography(Point, 4326),
  lat NUMERIC(10, 7) CHECK (lat BETWEEN -90 AND 90),
  lon NUMERIC(11, 7) CHECK (lon BETWEEN -180 AND 180),
  
  -- Temporal data
  found_at TIMESTAMPTZ NOT NULL,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY',
    'PENDING',
    'SYNCING',
    'SYNCED',
    'FAILED',
    'CONFLICT'
  )),
  client_created_at TIMESTAMPTZ NOT NULL,
  client_updated_at TIMESTAMPTZ NOT NULL,
  server_synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Database metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SESSION EVENTS TABLE
-- ============================================================================

CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session reference
  session_id UUID NOT NULL REFERENCES field_sessions(id) ON DELETE CASCADE,
  
  -- Event metadata
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'session.created',
    'session.started',
    'session.paused',
    'session.resumed',
    'session.ended',
    'session.cancelled',
    'session.synced',
    'session.conflict',
    'findlog.added',
    'findlog.updated',
    'findlog.deleted',
    'metrics.recalculated'
  )),
  
  -- Event payload (JSONB for flexibility)
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Sequencing (for event replay)
  sequence_number INTEGER NOT NULL,
  
  -- Sync status
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY',
    'PENDING',
    'SYNCING',
    'SYNCED',
    'FAILED',
    'CONFLICT'
  )),
  
  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint on sequence per session
  UNIQUE (session_id, sequence_number)
);

-- ============================================================================
-- SYNC QUEUE TABLE
-- ============================================================================

CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event reference
  event_id UUID NOT NULL REFERENCES session_events(id) ON DELETE CASCADE,
  
  -- Priority (higher = process first)
  priority INTEGER NOT NULL,
  
  -- Retry management
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'failed',
    'completed'
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_field_sessions_updated_at 
  BEFORE UPDATE ON field_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_find_logs_updated_at 
  BEFORE UPDATE ON find_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_queue_updated_at 
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_field_sessions_version 
  BEFORE UPDATE ON field_sessions
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_find_logs_version 
  BEFORE UPDATE ON find_logs
  FOR EACH ROW EXECUTE FUNCTION increment_version();

-- Recalculate session metrics when find_logs change
CREATE OR REPLACE FUNCTION recalculate_session_metrics()
RETURNS TRIGGER AS $$
DECLARE
  session_id_var UUID;
BEGIN
  -- Get session_id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    session_id_var := OLD.session_id;
  ELSE
    session_id_var := NEW.session_id;
  END IF;
  
  -- Update session metrics
  UPDATE field_sessions
  SET
    total_specimens = (
      SELECT COUNT(*) 
      FROM find_logs 
      WHERE find_logs.session_id = session_id_var
    ),
    unique_materials = (
      SELECT COUNT(DISTINCT material_id) 
      FROM find_logs 
      WHERE find_logs.session_id = session_id_var 
        AND material_id IS NOT NULL
    ),
    total_weight_grams = (
      SELECT COALESCE(SUM(weight_grams), 0) 
      FROM find_logs 
      WHERE find_logs.session_id = session_id_var
    ),
    average_quality = (
      SELECT AVG(quality_rating) 
      FROM find_logs 
      WHERE find_logs.session_id = session_id_var 
        AND quality_rating IS NOT NULL
    ),
    materials_found = (
      SELECT ARRAY_AGG(DISTINCT material_id) 
      FROM find_logs 
      WHERE find_logs.session_id = session_id_var 
        AND material_id IS NOT NULL
    )
  WHERE id = session_id_var;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_metrics_on_insert 
  AFTER INSERT ON find_logs
  FOR EACH ROW EXECUTE FUNCTION recalculate_session_metrics();

CREATE TRIGGER recalculate_metrics_on_update 
  AFTER UPDATE ON find_logs
  FOR EACH ROW EXECUTE FUNCTION recalculate_session_metrics();

CREATE TRIGGER recalculate_metrics_on_delete 
  AFTER DELETE ON find_logs
  FOR EACH ROW EXECUTE FUNCTION recalculate_session_metrics();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE field_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE find_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Field Sessions: Owner-only access
CREATE POLICY "Users can view own sessions" ON field_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON field_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON field_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON field_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Find Logs: Owner-only access (inherit from session)
CREATE POLICY "Users can view own find logs" ON find_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own find logs" ON find_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM field_sessions
      WHERE field_sessions.id = find_logs.session_id
      AND field_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own find logs" ON find_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own find logs" ON find_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Session Events: Owner-only access
CREATE POLICY "Users can view own events" ON session_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON session_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sync Queue: Owner-only access (via event -> session -> user)
CREATE POLICY "Users can view own sync queue" ON sync_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_events
      JOIN field_sessions ON session_events.session_id = field_sessions.id
      WHERE session_events.id = sync_queue.event_id
      AND field_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sync queue" ON sync_queue
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM session_events
      JOIN field_sessions ON session_events.session_id = field_sessions.id
      WHERE session_events.id = sync_queue.event_id
      AND field_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Field Sessions indexes
CREATE INDEX idx_field_sessions_user_id ON field_sessions (user_id);
CREATE INDEX idx_field_sessions_location_id ON field_sessions (location_id);
CREATE INDEX idx_field_sessions_state ON field_sessions (state);
CREATE INDEX idx_field_sessions_sync_status ON field_sessions (sync_status);
CREATE INDEX idx_field_sessions_start_time ON field_sessions (start_time DESC);
CREATE INDEX idx_field_sessions_device_id ON field_sessions (device_id);

-- Spatial indexes
CREATE INDEX idx_field_sessions_start_geom ON field_sessions USING GIST (start_geom);
CREATE INDEX idx_field_sessions_end_geom ON field_sessions USING GIST (end_geom);
CREATE INDEX idx_field_sessions_track_geom ON field_sessions USING GIST (track_geom);

-- Find Logs indexes
CREATE INDEX idx_find_logs_session_id ON find_logs (session_id);
CREATE INDEX idx_find_logs_user_id ON find_logs (user_id);
CREATE INDEX idx_find_logs_material_id ON find_logs (material_id);
CREATE INDEX idx_find_logs_found_at ON find_logs (found_at DESC);
CREATE INDEX idx_find_logs_sync_status ON find_logs (sync_status);
CREATE INDEX idx_find_logs_geom ON find_logs USING GIST (geom);

-- Session Events indexes
CREATE INDEX idx_session_events_session_id ON session_events (session_id);
CREATE INDEX idx_session_events_user_id ON session_events (user_id);
CREATE INDEX idx_session_events_event_type ON session_events (event_type);
CREATE INDEX idx_session_events_sequence_number ON session_events (session_id, sequence_number);
CREATE INDEX idx_session_events_sync_status ON session_events (sync_status);
CREATE INDEX idx_session_events_timestamp ON session_events (event_timestamp DESC);

-- Sync Queue indexes
CREATE INDEX idx_sync_queue_status ON sync_queue (status);
CREATE INDEX idx_sync_queue_priority ON sync_queue (priority DESC, created_at ASC);
CREATE INDEX idx_sync_queue_next_retry ON sync_queue (next_retry_at) 
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_sync_queue_event_id ON sync_queue (event_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE field_sessions IS 'Rockhounding field sessions with offline-first support and event sourcing';
COMMENT ON TABLE find_logs IS 'Individual specimens found during field sessions';
COMMENT ON TABLE session_events IS 'Event log for session state changes and audit trail';
COMMENT ON TABLE sync_queue IS 'Queue for offline sync with priority-based processing';

COMMENT ON COLUMN field_sessions.state IS 'Current lifecycle state (DRAFT -> ACTIVE -> FINALIZING -> COMPLETED)';
COMMENT ON COLUMN field_sessions.sync_status IS 'Sync status for offline-first operation';
COMMENT ON COLUMN field_sessions.version IS 'Optimistic locking version number';
COMMENT ON COLUMN field_sessions.total_specimens IS 'Aggregated count from find_logs (auto-maintained)';
COMMENT ON COLUMN field_sessions.unique_materials IS 'Aggregated unique material count (auto-maintained)';
COMMENT ON COLUMN field_sessions.materials_found IS 'Array of material IDs found during session (auto-maintained)';

COMMENT ON COLUMN session_events.sequence_number IS 'Event ordering for replay (unique per session)';
COMMENT ON COLUMN session_events.payload IS 'Event-specific data in JSONB format';

COMMENT ON COLUMN sync_queue.priority IS 'Sync priority (100=session.created, 80=findlog.added, etc.)';
COMMENT ON COLUMN sync_queue.retry_count IS 'Number of retry attempts (exponential backoff)';
