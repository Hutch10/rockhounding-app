-- ============================================================================
-- Sync Engine Database Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE sync_entity_type AS ENUM (
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
  'analytics_cache'
);

CREATE TYPE sync_operation_type AS ENUM (
  'create',
  'update',
  'delete',
  'soft_delete'
);

CREATE TYPE sync_status AS ENUM (
  'pending',
  'syncing',
  'success',
  'conflict',
  'error',
  'retry',
  'cancelled'
);

CREATE TYPE conflict_resolution_strategy AS ENUM (
  'client_wins',
  'server_wins',
  'manual',
  'merge',
  'latest_timestamp',
  'field_level'
);

CREATE TYPE sync_priority AS ENUM (
  'critical',
  'high',
  'normal',
  'low',
  'background'
);

CREATE TYPE sync_direction AS ENUM (
  'outbound',
  'inbound',
  'bidirectional'
);

CREATE TYPE connection_quality AS ENUM (
  'excellent',
  'good',
  'fair',
  'poor',
  'offline'
);

-- ============================================================================
-- Main Sync Queue Table
-- ============================================================================

CREATE TABLE sync_queue (
  sync_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  
  -- Entity information
  entity_type sync_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  operation_type sync_operation_type NOT NULL,
  
  -- Sync metadata
  priority sync_priority NOT NULL DEFAULT 'normal',
  direction sync_direction NOT NULL DEFAULT 'outbound',
  status sync_status NOT NULL DEFAULT 'pending',
  
  -- Versioning
  client_version INTEGER NOT NULL DEFAULT 0,
  server_version INTEGER,
  
  -- Data payload
  delta JSONB, -- Changed fields only
  full_entity JSONB, -- Complete entity for creates
  
  -- Dependencies
  depends_on UUID[] DEFAULT '{}',
  blocks UUID[] DEFAULT '{}',
  
  -- Retry information
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Integrity
  checksum VARCHAR(64),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT sync_queue_version_check CHECK (client_version >= 0),
  CONSTRAINT sync_queue_retry_check CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- Indexes for sync queue
CREATE INDEX idx_sync_queue_user_status ON sync_queue(user_id, status);
CREATE INDEX idx_sync_queue_device_status ON sync_queue(device_id, status);
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority, status, created_at);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX idx_sync_queue_retry ON sync_queue(status, next_retry_at) WHERE status = 'retry';
CREATE INDEX idx_sync_queue_pending ON sync_queue(priority, created_at) WHERE status = 'pending';
CREATE INDEX idx_sync_queue_depends ON sync_queue USING GIN(depends_on);

-- ============================================================================
-- Sync Conflicts Table
-- ============================================================================

CREATE TABLE sync_conflicts (
  conflict_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id UUID REFERENCES sync_queue(sync_id) ON DELETE CASCADE,
  
  -- Conflict details
  entity_type sync_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Versions
  client_version INTEGER NOT NULL,
  server_version INTEGER NOT NULL,
  
  -- Conflicting data
  client_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  conflicting_fields TEXT[] NOT NULL,
  
  -- Resolution
  resolution_strategy conflict_resolution_strategy NOT NULL DEFAULT 'manual',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_data JSONB,
  
  -- Timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sync_conflicts_version_check CHECK (
    client_version >= 0 AND server_version >= 0
  )
);

-- Indexes for conflicts
CREATE INDEX idx_sync_conflicts_sync ON sync_conflicts(sync_id);
CREATE INDEX idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX idx_sync_conflicts_unresolved ON sync_conflicts(resolved, detected_at) WHERE NOT resolved;
CREATE INDEX idx_sync_conflicts_user ON sync_conflicts(resolved_by, resolved_at) WHERE resolved;

-- ============================================================================
-- Sync Batches Table
-- ============================================================================

CREATE TABLE sync_batches (
  batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  
  -- Batch metadata
  direction sync_direction NOT NULL,
  priority sync_priority NOT NULL,
  
  -- Status
  total_operations INTEGER NOT NULL,
  successful_operations INTEGER NOT NULL DEFAULT 0,
  failed_operations INTEGER NOT NULL DEFAULT 0,
  conflicted_operations INTEGER NOT NULL DEFAULT 0,
  
  -- Integrity
  batch_checksum VARCHAR(64),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT sync_batches_operations_check CHECK (
    total_operations > 0 AND
    successful_operations >= 0 AND
    failed_operations >= 0 AND
    conflicted_operations >= 0 AND
    (successful_operations + failed_operations + conflicted_operations) <= total_operations
  )
);

-- Indexes for batches
CREATE INDEX idx_sync_batches_user ON sync_batches(user_id, created_at DESC);
CREATE INDEX idx_sync_batches_device ON sync_batches(device_id, created_at DESC);
CREATE INDEX idx_sync_batches_priority ON sync_batches(priority, created_at);

-- ============================================================================
-- Sync State Table
-- ============================================================================

CREATE TABLE sync_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  
  -- Current sync status
  is_syncing BOOLEAN NOT NULL DEFAULT FALSE,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Queue statistics
  pending_count INTEGER NOT NULL DEFAULT 0,
  syncing_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Last sync info
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Sync progress
  current_batch_id UUID REFERENCES sync_batches(batch_id),
  operations_completed INTEGER NOT NULL DEFAULT 0,
  operations_total INTEGER NOT NULL DEFAULT 0,
  
  -- Network status
  connection_quality connection_quality NOT NULL DEFAULT 'good',
  
  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sync_state_counts_check CHECK (
    pending_count >= 0 AND
    syncing_count >= 0 AND
    conflict_count >= 0 AND
    error_count >= 0
  )
);

-- Index for sync state
CREATE INDEX idx_sync_state_device ON sync_state(device_id);
CREATE INDEX idx_sync_state_syncing ON sync_state(is_syncing, updated_at) WHERE is_syncing;

-- ============================================================================
-- Sync History Table (for audit/analytics)
-- ============================================================================

CREATE TABLE sync_history (
  history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  
  -- Entity information
  entity_type sync_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  operation_type sync_operation_type NOT NULL,
  
  -- Result
  status sync_status NOT NULL,
  duration_ms INTEGER,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  
  CONSTRAINT sync_history_duration_check CHECK (duration_ms >= 0)
);

-- Partitioning by month for scalability
CREATE INDEX idx_sync_history_user_time ON sync_history(user_id, completed_at DESC);
CREATE INDEX idx_sync_history_entity ON sync_history(entity_type, entity_id);
CREATE INDEX idx_sync_history_status ON sync_history(status, completed_at);

-- ============================================================================
-- Sync Metrics Table (aggregated)
-- ============================================================================

CREATE TABLE sync_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  
  -- Counts
  total_operations INTEGER NOT NULL,
  successful_operations INTEGER NOT NULL,
  failed_operations INTEGER NOT NULL,
  conflicted_operations INTEGER NOT NULL,
  
  -- Timings
  avg_sync_duration_ms NUMERIC(10, 2),
  total_sync_time_ms BIGINT,
  
  -- Network
  bytes_uploaded BIGINT DEFAULT 0,
  bytes_downloaded BIGINT DEFAULT 0,
  
  -- Rates
  error_rate NUMERIC(5, 4),
  conflict_rate NUMERIC(5, 4),
  
  -- Time window
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sync_metrics_operations_check CHECK (
    total_operations > 0 AND
    successful_operations >= 0 AND
    failed_operations >= 0 AND
    conflicted_operations >= 0
  ),
  CONSTRAINT sync_metrics_period_check CHECK (period_end > period_start)
);

-- Indexes for metrics
CREATE INDEX idx_sync_metrics_user_period ON sync_metrics(user_id, period_start DESC);
CREATE INDEX idx_sync_metrics_device_period ON sync_metrics(device_id, period_start DESC);

-- ============================================================================
-- Idempotency Keys Table (for replay protection)
-- ============================================================================

CREATE TABLE sync_idempotency_keys (
  idempotency_key VARCHAR(64) PRIMARY KEY,
  sync_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Processing info
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result_status sync_status NOT NULL,
  
  -- Expiry (keys older than 7 days can be cleaned up)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  CONSTRAINT sync_idempotency_expires_check CHECK (expires_at > processed_at)
);

-- Index for cleanup
CREATE INDEX idx_sync_idempotency_expires ON sync_idempotency_keys(expires_at);
CREATE INDEX idx_sync_idempotency_user ON sync_idempotency_keys(user_id, processed_at);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update sync_queue.updated_at on changes
CREATE OR REPLACE FUNCTION update_sync_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_timestamp();

-- Update sync_state when sync_queue changes
CREATE OR REPLACE FUNCTION update_sync_state_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate counts for the user
  UPDATE sync_state
  SET
    pending_count = (SELECT COUNT(*) FROM sync_queue WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND status = 'pending'),
    syncing_count = (SELECT COUNT(*) FROM sync_queue WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND status = 'syncing'),
    conflict_count = (SELECT COUNT(*) FROM sync_queue WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND status = 'conflict'),
    error_count = (SELECT COUNT(*) FROM sync_queue WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND status = 'error'),
    updated_at = NOW()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_queue_update_state
  AFTER INSERT OR UPDATE OR DELETE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_state_counts();

-- Create sync history entry on completion
CREATE OR REPLACE FUNCTION create_sync_history_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history for completed operations
  IF NEW.status IN ('success', 'error', 'cancelled') AND (OLD.status IS NULL OR OLD.status NOT IN ('success', 'error', 'cancelled')) THEN
    INSERT INTO sync_history (
      sync_id,
      user_id,
      device_id,
      entity_type,
      entity_id,
      operation_type,
      status,
      duration_ms,
      started_at,
      completed_at
    ) VALUES (
      NEW.sync_id,
      NEW.user_id,
      NEW.device_id,
      NEW.entity_type,
      NEW.entity_id,
      NEW.operation_type,
      NEW.status,
      EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.last_attempt_at, NEW.created_at))) * 1000,
      COALESCE(NEW.last_attempt_at, NEW.created_at),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_queue_create_history
  AFTER UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION create_sync_history_entry();

-- ============================================================================
-- Views
-- ============================================================================

-- View for pending operations sorted by priority
CREATE VIEW sync_queue_pending AS
SELECT
  sq.*,
  CASE sq.priority
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'normal' THEN 2
    WHEN 'low' THEN 3
    WHEN 'background' THEN 4
  END AS priority_value
FROM sync_queue sq
WHERE sq.status = 'pending'
ORDER BY priority_value, sq.created_at;

-- View for operations ready to retry
CREATE VIEW sync_queue_retry_ready AS
SELECT *
FROM sync_queue
WHERE status = 'retry'
  AND next_retry_at <= NOW()
  AND retry_count < max_retries
ORDER BY priority, next_retry_at;

-- View for unresolved conflicts
CREATE VIEW sync_conflicts_unresolved AS
SELECT
  sc.*,
  sq.user_id,
  sq.device_id,
  sq.created_at AS sync_created_at
FROM sync_conflicts sc
JOIN sync_queue sq ON sc.sync_id = sq.sync_id
WHERE NOT sc.resolved
ORDER BY sc.detected_at DESC;

-- View for sync metrics summary
CREATE VIEW sync_metrics_summary AS
SELECT
  user_id,
  COUNT(*) AS total_syncs,
  SUM(successful_operations) AS total_successful,
  SUM(failed_operations) AS total_failed,
  SUM(conflicted_operations) AS total_conflicted,
  AVG(avg_sync_duration_ms) AS overall_avg_duration_ms,
  AVG(error_rate) AS overall_error_rate,
  AVG(conflict_rate) AS overall_conflict_rate,
  MAX(period_end) AS last_metric_time
FROM sync_metrics
GROUP BY user_id;

-- ============================================================================
-- RPC Functions
-- ============================================================================

-- Enqueue a sync operation
CREATE OR REPLACE FUNCTION enqueue_sync_operation(
  p_user_id UUID,
  p_device_id UUID,
  p_entity_type sync_entity_type,
  p_entity_id UUID,
  p_operation_type sync_operation_type,
  p_priority sync_priority,
  p_delta JSONB DEFAULT NULL,
  p_full_entity JSONB DEFAULT NULL,
  p_client_version INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  -- Insert into sync queue
  INSERT INTO sync_queue (
    user_id,
    device_id,
    entity_type,
    entity_id,
    operation_type,
    priority,
    client_version,
    delta,
    full_entity
  ) VALUES (
    p_user_id,
    p_device_id,
    p_entity_type,
    p_entity_id,
    p_operation_type,
    p_priority,
    p_client_version,
    p_delta,
    p_full_entity
  )
  RETURNING sync_id INTO v_sync_id;
  
  -- Initialize sync state if not exists
  INSERT INTO sync_state (user_id, device_id)
  VALUES (p_user_id, p_device_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next batch of sync operations
CREATE OR REPLACE FUNCTION get_next_sync_batch(
  p_user_id UUID,
  p_device_id UUID,
  p_batch_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  sync_id UUID,
  entity_type sync_entity_type,
  entity_id UUID,
  operation_type sync_operation_type,
  priority sync_priority,
  client_version INTEGER,
  delta JSONB,
  full_entity JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.sync_id,
    sq.entity_type,
    sq.entity_id,
    sq.operation_type,
    sq.priority,
    sq.client_version,
    sq.delta,
    sq.full_entity
  FROM sync_queue_pending sq
  WHERE sq.user_id = p_user_id
    AND sq.device_id = p_device_id
  LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark operation as success
CREATE OR REPLACE FUNCTION mark_sync_success(
  p_sync_id UUID,
  p_server_version INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE sync_queue
  SET
    status = 'success',
    server_version = p_server_version,
    synced_at = NOW(),
    updated_at = NOW()
  WHERE sync_id = p_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark operation as error with retry
CREATE OR REPLACE FUNCTION mark_sync_error(
  p_sync_id UUID,
  p_error_message TEXT,
  p_error_code VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry_at TIMESTAMPTZ;
BEGIN
  -- Get current retry info
  SELECT retry_count, max_retries
  INTO v_retry_count, v_max_retries
  FROM sync_queue
  WHERE sync_id = p_sync_id;
  
  -- Calculate next retry time with exponential backoff
  v_next_retry_at := NOW() + (INTERVAL '1 second' * POWER(2, v_retry_count));
  
  -- Update sync queue
  IF v_retry_count < v_max_retries THEN
    -- Schedule retry
    UPDATE sync_queue
    SET
      status = 'retry',
      retry_count = retry_count + 1,
      next_retry_at = v_next_retry_at,
      error_message = p_error_message,
      error_code = p_error_code,
      last_attempt_at = NOW(),
      updated_at = NOW()
    WHERE sync_id = p_sync_id;
  ELSE
    -- Max retries reached, mark as error
    UPDATE sync_queue
    SET
      status = 'error',
      error_message = p_error_message,
      error_code = p_error_code,
      last_attempt_at = NOW(),
      updated_at = NOW()
    WHERE sync_id = p_sync_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create conflict
CREATE OR REPLACE FUNCTION create_sync_conflict(
  p_sync_id UUID,
  p_entity_type sync_entity_type,
  p_entity_id UUID,
  p_client_version INTEGER,
  p_server_version INTEGER,
  p_client_data JSONB,
  p_server_data JSONB,
  p_conflicting_fields TEXT[],
  p_resolution_strategy conflict_resolution_strategy DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
  v_conflict_id UUID;
BEGIN
  -- Mark sync operation as conflict
  UPDATE sync_queue
  SET status = 'conflict', updated_at = NOW()
  WHERE sync_id = p_sync_id;
  
  -- Create conflict record
  INSERT INTO sync_conflicts (
    sync_id,
    entity_type,
    entity_id,
    client_version,
    server_version,
    client_data,
    server_data,
    conflicting_fields,
    resolution_strategy
  ) VALUES (
    p_sync_id,
    p_entity_type,
    p_entity_id,
    p_client_version,
    p_server_version,
    p_client_data,
    p_server_data,
    p_conflicting_fields,
    p_resolution_strategy
  )
  RETURNING conflict_id INTO v_conflict_id;
  
  RETURN v_conflict_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve conflict
CREATE OR REPLACE FUNCTION resolve_sync_conflict(
  p_conflict_id UUID,
  p_resolved_by UUID,
  p_resolution_data JSONB
)
RETURNS VOID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  -- Mark conflict as resolved
  UPDATE sync_conflicts
  SET
    resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_data = p_resolution_data
  WHERE conflict_id = p_conflict_id
  RETURNING sync_id INTO v_sync_id;
  
  -- Mark sync operation as success
  UPDATE sync_queue
  SET status = 'success', synced_at = NOW(), updated_at = NOW()
  WHERE sync_id = v_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get sync state
CREATE OR REPLACE FUNCTION get_sync_state(p_user_id UUID)
RETURNS TABLE (
  is_syncing BOOLEAN,
  is_online BOOLEAN,
  pending_count INTEGER,
  syncing_count INTEGER,
  conflict_count INTEGER,
  error_count INTEGER,
  last_sync_at TIMESTAMPTZ,
  connection_quality connection_quality
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.is_syncing,
    ss.is_online,
    ss.pending_count,
    ss.syncing_count,
    ss.conflict_count,
    ss.error_count,
    ss.last_sync_at,
    ss.connection_quality
  FROM sync_state ss
  WHERE ss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old sync data
CREATE OR REPLACE FUNCTION cleanup_old_sync_data()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete completed operations older than 30 days
  DELETE FROM sync_queue
  WHERE status IN ('success', 'cancelled')
    AND synced_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Delete sync history older than 90 days
  DELETE FROM sync_history
  WHERE completed_at < NOW() - INTERVAL '90 days';
  
  -- Delete expired idempotency keys
  DELETE FROM sync_idempotency_keys
  WHERE expires_at < NOW();
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- sync_queue policies
CREATE POLICY sync_queue_select_policy ON sync_queue
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY sync_queue_insert_policy ON sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_queue_update_policy ON sync_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY sync_queue_delete_policy ON sync_queue
  FOR DELETE USING (auth.uid() = user_id);

-- sync_conflicts policies
CREATE POLICY sync_conflicts_select_policy ON sync_conflicts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sync_queue WHERE sync_id = sync_conflicts.sync_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY sync_conflicts_update_policy ON sync_conflicts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sync_queue WHERE sync_id = sync_conflicts.sync_id AND user_id = auth.uid())
  );

-- sync_batches policies
CREATE POLICY sync_batches_select_policy ON sync_batches
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY sync_batches_insert_policy ON sync_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- sync_state policies
CREATE POLICY sync_state_select_policy ON sync_state
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY sync_state_insert_policy ON sync_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_state_update_policy ON sync_state
  FOR UPDATE USING (auth.uid() = user_id);

-- sync_history policies (read-only for users)
CREATE POLICY sync_history_select_policy ON sync_history
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- sync_metrics policies
CREATE POLICY sync_metrics_select_policy ON sync_metrics
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- sync_idempotency_keys policies
CREATE POLICY sync_idempotency_select_policy ON sync_idempotency_keys
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY sync_idempotency_insert_policy ON sync_idempotency_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE sync_queue IS 'Queue of pending/in-progress sync operations';
COMMENT ON TABLE sync_conflicts IS 'Detected conflicts requiring resolution';
COMMENT ON TABLE sync_batches IS 'Batch metadata for grouped sync operations';
COMMENT ON TABLE sync_state IS 'Current sync state per user/device';
COMMENT ON TABLE sync_history IS 'Historical record of completed sync operations';
COMMENT ON TABLE sync_metrics IS 'Aggregated sync performance metrics';
COMMENT ON TABLE sync_idempotency_keys IS 'Replay protection for sync operations';

COMMENT ON FUNCTION enqueue_sync_operation IS 'Add a new operation to the sync queue';
COMMENT ON FUNCTION get_next_sync_batch IS 'Retrieve next batch of operations to sync';
COMMENT ON FUNCTION mark_sync_success IS 'Mark operation as successfully synced';
COMMENT ON FUNCTION mark_sync_error IS 'Mark operation as failed with retry logic';
COMMENT ON FUNCTION create_sync_conflict IS 'Create a conflict record for manual resolution';
COMMENT ON FUNCTION resolve_sync_conflict IS 'Resolve a conflict and mark operation as complete';
COMMENT ON FUNCTION get_sync_state IS 'Get current sync state for a user';
COMMENT ON FUNCTION cleanup_old_sync_data IS 'Remove old completed operations and expired keys';
