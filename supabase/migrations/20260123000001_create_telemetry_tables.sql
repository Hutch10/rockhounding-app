-- Migration: Create Telemetry Tables
-- Description: Tables, views, triggers, and RLS policies for telemetry system

-- ============================================================================
-- Enable Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE telemetry_event_category AS ENUM (
  'performance',
  'sync',
  'cache',
  'background_job',
  'user_interaction',
  'error',
  'network',
  'database'
);

CREATE TYPE event_severity AS ENUM (
  'debug',
  'info',
  'warning',
  'error',
  'critical'
);

CREATE TYPE device_type AS ENUM (
  'mobile',
  'tablet',
  'desktop'
);

-- ============================================================================
-- Main Telemetry Events Table (Partitioned by date)
-- ============================================================================

CREATE TABLE telemetry_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID NOT NULL,
  category telemetry_event_category NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity event_severity NOT NULL DEFAULT 'info',
  
  -- Device context
  device_type device_type,
  platform VARCHAR(50),
  browser VARCHAR(50),
  viewport_width INTEGER CHECK (viewport_width > 0),
  viewport_height INTEGER CHECK (viewport_height > 0),
  
  -- Network context
  connection_type VARCHAR(20),
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- App context
  app_version VARCHAR(20),
  page_url VARCHAR(500),
  
  -- Event-specific data (JSONB for flexibility)
  event_data JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes will be created on partitions
  CHECK (timestamp >= '2026-01-01'::timestamptz)
) PARTITION BY RANGE (timestamp);

-- Create indexes on parent table (inherited by partitions)
CREATE INDEX idx_telemetry_events_user_id ON telemetry_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_telemetry_events_session_id ON telemetry_events(session_id);
CREATE INDEX idx_telemetry_events_category ON telemetry_events(category);
CREATE INDEX idx_telemetry_events_timestamp ON telemetry_events(timestamp DESC);
CREATE INDEX idx_telemetry_events_severity ON telemetry_events(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_telemetry_events_event_name ON telemetry_events(event_name);

-- GIN index for JSONB fields
CREATE INDEX idx_telemetry_events_event_data ON telemetry_events USING GIN(event_data);
CREATE INDEX idx_telemetry_events_metadata ON telemetry_events USING GIN(metadata);

-- Create partitions for current and next month
CREATE TABLE telemetry_events_2026_01 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE telemetry_events_2026_02 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- ============================================================================
-- Aggregated Metrics Table
-- ============================================================================

CREATE TABLE telemetry_aggregated_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category telemetry_event_category NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  
  -- Time window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  window_size_minutes INTEGER NOT NULL CHECK (window_size_minutes > 0),
  
  -- Statistics
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  
  -- Performance stats
  avg_duration_ms NUMERIC(10, 2),
  min_duration_ms NUMERIC(10, 2),
  max_duration_ms NUMERIC(10, 2),
  p50_duration_ms NUMERIC(10, 2),
  p95_duration_ms NUMERIC(10, 2),
  p99_duration_ms NUMERIC(10, 2),
  
  -- Error stats
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  error_rate NUMERIC(5, 4) CHECK (error_rate >= 0 AND error_rate <= 1),
  
  -- Cache stats
  cache_hit_count INTEGER CHECK (cache_hit_count >= 0),
  cache_miss_count INTEGER CHECK (cache_miss_count >= 0),
  cache_hit_rate NUMERIC(5, 4) CHECK (cache_hit_rate >= 0 AND cache_hit_rate <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate aggregations
  UNIQUE(user_id, category, event_name, window_start, window_size_minutes)
);

CREATE INDEX idx_aggregated_metrics_user_id ON telemetry_aggregated_metrics(user_id);
CREATE INDEX idx_aggregated_metrics_category ON telemetry_aggregated_metrics(category);
CREATE INDEX idx_aggregated_metrics_window ON telemetry_aggregated_metrics(window_start DESC, window_end DESC);
CREATE INDEX idx_aggregated_metrics_event_name ON telemetry_aggregated_metrics(event_name);

-- ============================================================================
-- Telemetry Sessions Table
-- ============================================================================

CREATE TABLE telemetry_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session info
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Device info
  device_type device_type,
  platform VARCHAR(50),
  browser VARCHAR(50),
  
  -- Session stats
  event_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telemetry_sessions_user_id ON telemetry_sessions(user_id);
CREATE INDEX idx_telemetry_sessions_start ON telemetry_sessions(session_start DESC);

-- ============================================================================
-- Error Events Table (Denormalized for fast queries)
-- ============================================================================

CREATE TABLE telemetry_errors (
  error_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES telemetry_events(event_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID NOT NULL,
  
  -- Error details
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Context
  component_name VARCHAR(100),
  function_name VARCHAR(100),
  file_path VARCHAR(500),
  line_number INTEGER CHECK (line_number > 0),
  column_number INTEGER CHECK (column_number > 0),
  
  -- HTTP context
  http_status INTEGER,
  http_method VARCHAR(10),
  endpoint VARCHAR(200),
  
  -- Impact
  is_recoverable BOOLEAN NOT NULL DEFAULT TRUE,
  user_notified BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Severity
  severity event_severity NOT NULL,
  
  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telemetry_errors_user_id ON telemetry_errors(user_id);
CREATE INDEX idx_telemetry_errors_session_id ON telemetry_errors(session_id);
CREATE INDEX idx_telemetry_errors_occurred_at ON telemetry_errors(occurred_at DESC);
CREATE INDEX idx_telemetry_errors_error_type ON telemetry_errors(error_type);
CREATE INDEX idx_telemetry_errors_severity ON telemetry_errors(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_telemetry_errors_message ON telemetry_errors USING GIN(to_tsvector('english', error_message));

-- ============================================================================
-- Performance Metrics Table (Denormalized)
-- ============================================================================

CREATE TABLE telemetry_performance_metrics (
  metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES telemetry_events(event_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID NOT NULL,
  
  -- Core Web Vitals
  lcp NUMERIC(10, 2), -- Largest Contentful Paint
  fid NUMERIC(10, 2), -- First Input Delay
  cls NUMERIC(10, 4), -- Cumulative Layout Shift
  
  -- Additional metrics
  ttfb NUMERIC(10, 2), -- Time to First Byte
  fcp NUMERIC(10, 2),  -- First Contentful Paint
  tti NUMERIC(10, 2),  -- Time to Interactive
  
  -- Custom timings
  component_render_time NUMERIC(10, 2),
  api_response_time NUMERIC(10, 2),
  query_execution_time NUMERIC(10, 2),
  
  -- Memory
  memory_used_mb NUMERIC(10, 2),
  memory_limit_mb NUMERIC(10, 2),
  
  -- Context
  page_url VARCHAR(500),
  
  -- Timestamps
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_user_id ON telemetry_performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_session_id ON telemetry_performance_metrics(session_id);
CREATE INDEX idx_performance_metrics_measured_at ON telemetry_performance_metrics(measured_at DESC);
CREATE INDEX idx_performance_metrics_lcp ON telemetry_performance_metrics(lcp) WHERE lcp IS NOT NULL;
CREATE INDEX idx_performance_metrics_page_url ON telemetry_performance_metrics(page_url);

-- ============================================================================
-- Materialized Views
-- ============================================================================

-- Error summary by day
CREATE MATERIALIZED VIEW telemetry_error_summary_daily AS
SELECT
  DATE(occurred_at) AS error_date,
  error_type,
  COUNT(*) AS error_count,
  COUNT(DISTINCT user_id) AS affected_users,
  COUNT(DISTINCT session_id) AS affected_sessions,
  AVG(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) AS critical_rate,
  ARRAY_AGG(DISTINCT error_message ORDER BY error_message) FILTER (WHERE error_message IS NOT NULL) AS top_messages
FROM telemetry_errors
WHERE occurred_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(occurred_at), error_type;

CREATE UNIQUE INDEX idx_error_summary_daily_pk ON telemetry_error_summary_daily(error_date, error_type);
CREATE INDEX idx_error_summary_daily_date ON telemetry_error_summary_daily(error_date DESC);

-- Performance summary by page
CREATE MATERIALIZED VIEW telemetry_performance_summary AS
SELECT
  page_url,
  COUNT(*) AS sample_count,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY lcp) AS p50_lcp,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp) AS p75_lcp,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lcp) AS p95_lcp,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fid) AS p50_fid,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY fid) AS p95_fid,
  AVG(cls) AS avg_cls,
  AVG(ttfb) AS avg_ttfb,
  AVG(component_render_time) AS avg_render_time,
  AVG(api_response_time) AS avg_api_time
FROM telemetry_performance_metrics
WHERE measured_at >= CURRENT_DATE - INTERVAL '7 days'
  AND page_url IS NOT NULL
GROUP BY page_url;

CREATE UNIQUE INDEX idx_performance_summary_pk ON telemetry_performance_summary(page_url);

-- Cache hit rate by cache level
CREATE MATERIALIZED VIEW telemetry_cache_summary AS
SELECT
  (event_data->>'cache_level')::VARCHAR AS cache_level,
  DATE(timestamp) AS summary_date,
  COUNT(*) FILTER (WHERE (event_data->>'operation')::VARCHAR = 'hit') AS hit_count,
  COUNT(*) FILTER (WHERE (event_data->>'operation')::VARCHAR = 'miss') AS miss_count,
  COUNT(*) AS total_operations,
  ROUND(
    COUNT(*) FILTER (WHERE (event_data->>'operation')::VARCHAR = 'hit')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) AS hit_rate_pct
FROM telemetry_events
WHERE category = 'cache'
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND event_data->>'cache_level' IS NOT NULL
GROUP BY (event_data->>'cache_level')::VARCHAR, DATE(timestamp);

CREATE INDEX idx_cache_summary_level_date ON telemetry_cache_summary(cache_level, summary_date DESC);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update session statistics
CREATE OR REPLACE FUNCTION update_telemetry_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert session
  INSERT INTO telemetry_sessions (
    session_id,
    user_id,
    session_start,
    device_type,
    platform,
    browser,
    event_count
  )
  VALUES (
    NEW.session_id,
    NEW.user_id,
    NEW.timestamp,
    NEW.device_type,
    NEW.platform,
    NEW.browser,
    1
  )
  ON CONFLICT (session_id) DO UPDATE SET
    event_count = telemetry_sessions.event_count + 1,
    error_count = telemetry_sessions.error_count + 
      CASE WHEN NEW.severity IN ('error', 'critical') THEN 1 ELSE 0 END,
    session_end = NEW.timestamp,
    duration_seconds = EXTRACT(EPOCH FROM (NEW.timestamp - telemetry_sessions.session_start))::INTEGER,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to insert error into denormalized table
CREATE OR REPLACE FUNCTION insert_telemetry_error()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category = 'error' THEN
    INSERT INTO telemetry_errors (
      event_id,
      user_id,
      session_id,
      error_type,
      error_message,
      error_stack,
      component_name,
      function_name,
      file_path,
      line_number,
      column_number,
      http_status,
      http_method,
      endpoint,
      is_recoverable,
      user_notified,
      severity,
      occurred_at
    )
    VALUES (
      NEW.event_id,
      NEW.user_id,
      NEW.session_id,
      (NEW.event_data->>'error_type')::VARCHAR,
      NEW.event_data->>'error_message',
      NEW.event_data->>'error_stack',
      NEW.event_data->>'component_name',
      NEW.event_data->>'function_name',
      NEW.event_data->>'file_path',
      (NEW.event_data->>'line_number')::INTEGER,
      (NEW.event_data->>'column_number')::INTEGER,
      (NEW.event_data->>'http_status')::INTEGER,
      NEW.event_data->>'http_method',
      NEW.event_data->>'endpoint',
      COALESCE((NEW.event_data->>'is_recoverable')::BOOLEAN, TRUE),
      COALESCE((NEW.event_data->>'user_notified')::BOOLEAN, FALSE),
      NEW.severity,
      NEW.timestamp
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to insert performance metrics
CREATE OR REPLACE FUNCTION insert_performance_metric()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category = 'performance' THEN
    INSERT INTO telemetry_performance_metrics (
      event_id,
      user_id,
      session_id,
      lcp,
      fid,
      cls,
      ttfb,
      fcp,
      tti,
      component_render_time,
      api_response_time,
      query_execution_time,
      memory_used_mb,
      memory_limit_mb,
      page_url,
      measured_at
    )
    VALUES (
      NEW.event_id,
      NEW.user_id,
      NEW.session_id,
      (NEW.event_data->>'lcp')::NUMERIC,
      (NEW.event_data->>'fid')::NUMERIC,
      (NEW.event_data->>'cls')::NUMERIC,
      (NEW.event_data->>'ttfb')::NUMERIC,
      (NEW.event_data->>'fcp')::NUMERIC,
      (NEW.event_data->>'tti')::NUMERIC,
      (NEW.event_data->>'component_render_time')::NUMERIC,
      (NEW.event_data->>'api_response_time')::NUMERIC,
      (NEW.event_data->>'query_execution_time')::NUMERIC,
      (NEW.event_data->>'memory_used_mb')::NUMERIC,
      (NEW.event_data->>'memory_limit_mb')::NUMERIC,
      NEW.page_url,
      NEW.timestamp
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_telemetry_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY telemetry_error_summary_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY telemetry_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY telemetry_cache_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE TRIGGER trigger_update_session_stats
  AFTER INSERT ON telemetry_events
  FOR EACH ROW
  EXECUTE FUNCTION update_telemetry_session_stats();

CREATE TRIGGER trigger_insert_error
  AFTER INSERT ON telemetry_events
  FOR EACH ROW
  EXECUTE FUNCTION insert_telemetry_error();

CREATE TRIGGER trigger_insert_performance
  AFTER INSERT ON telemetry_events
  FOR EACH ROW
  EXECUTE FUNCTION insert_performance_metric();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_aggregated_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only read their own telemetry data
CREATE POLICY telemetry_events_select_policy ON telemetry_events
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

-- Users can insert their own telemetry events (or anonymous events)
CREATE POLICY telemetry_events_insert_policy ON telemetry_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Similar policies for other tables
CREATE POLICY telemetry_aggregated_select_policy ON telemetry_aggregated_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

CREATE POLICY telemetry_sessions_select_policy ON telemetry_sessions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

CREATE POLICY telemetry_errors_select_policy ON telemetry_errors
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

CREATE POLICY telemetry_performance_select_policy ON telemetry_performance_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE role = 'admin'
  ));

-- ============================================================================
-- RPC Functions for Client Access
-- ============================================================================

-- Get telemetry summary for a user
CREATE OR REPLACE FUNCTION get_telemetry_summary(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_events BIGINT,
  total_errors BIGINT,
  error_rate NUMERIC,
  avg_performance_score NUMERIC,
  cache_hit_rate NUMERIC,
  top_errors JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_events,
    COUNT(*) FILTER (WHERE severity IN ('error', 'critical'))::BIGINT AS total_errors,
    ROUND(
      COUNT(*) FILTER (WHERE severity IN ('error', 'critical'))::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100,
      2
    ) AS error_rate,
    (
      SELECT AVG((100 - lcp / 25))
      FROM telemetry_performance_metrics
      WHERE user_id = p_user_id
        AND measured_at BETWEEN p_start_date AND p_end_date
        AND lcp IS NOT NULL
    ) AS avg_performance_score,
    (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE (event_data->>'operation')::VARCHAR = 'hit')::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
      )
      FROM telemetry_events
      WHERE user_id = p_user_id
        AND category = 'cache'
        AND timestamp BETWEEN p_start_date AND p_end_date
    ) AS cache_hit_rate,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'error_message', error_message,
          'count', error_count
        ) ORDER BY error_count DESC
      )
      FROM (
        SELECT error_message, COUNT(*) AS error_count
        FROM telemetry_errors
        WHERE user_id = p_user_id
          AND occurred_at BETWEEN p_start_date AND p_end_date
        GROUP BY error_message
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) top_errors_subquery
    ) AS top_errors
  FROM telemetry_events
  WHERE user_id = p_user_id
    AND timestamp BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  metric_date DATE,
  avg_lcp NUMERIC,
  avg_fid NUMERIC,
  avg_cls NUMERIC,
  avg_ttfb NUMERIC,
  sample_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(measured_at) AS metric_date,
    ROUND(AVG(lcp), 2) AS avg_lcp,
    ROUND(AVG(fid), 2) AS avg_fid,
    ROUND(AVG(cls), 4) AS avg_cls,
    ROUND(AVG(ttfb), 2) AS avg_ttfb,
    COUNT(*)::BIGINT AS sample_count
  FROM telemetry_performance_metrics
  WHERE user_id = p_user_id
    AND measured_at >= CURRENT_DATE - p_days * INTERVAL '1 day'
  GROUP BY DATE(measured_at)
  ORDER BY DATE(measured_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Indexes for Common Queries
-- ============================================================================

-- Composite indexes for dashboard queries
CREATE INDEX idx_events_user_category_time ON telemetry_events(user_id, category, timestamp DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_errors_user_time ON telemetry_errors(user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_performance_user_time ON telemetry_performance_metrics(user_id, measured_at DESC)
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- Retention Policy (cleanup old data)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_telemetry_events()
RETURNS void AS $$
BEGIN
  -- Delete events older than 90 days
  DELETE FROM telemetry_events
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete old aggregated metrics
  DELETE FROM telemetry_aggregated_metrics
  WHERE window_end < NOW() - INTERVAL '180 days';
  
  -- Delete old sessions
  DELETE FROM telemetry_sessions
  WHERE session_start < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (would typically use pg_cron extension)
-- SELECT cron.schedule('cleanup-telemetry', '0 2 * * *', 'SELECT cleanup_old_telemetry_events()');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE telemetry_events IS 'Main telemetry events table, partitioned by timestamp';
COMMENT ON TABLE telemetry_aggregated_metrics IS 'Pre-aggregated metrics for dashboard queries';
COMMENT ON TABLE telemetry_sessions IS 'User session tracking with statistics';
COMMENT ON TABLE telemetry_errors IS 'Denormalized error events for fast queries';
COMMENT ON TABLE telemetry_performance_metrics IS 'Denormalized performance metrics';
COMMENT ON MATERIALIZED VIEW telemetry_error_summary_daily IS 'Daily error summary for trending';
COMMENT ON MATERIALIZED VIEW telemetry_performance_summary IS 'Performance summary by page';
COMMENT ON MATERIALIZED VIEW telemetry_cache_summary IS 'Cache hit rate by level and date';
