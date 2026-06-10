-- Rockhounding V1 Baseline Migration
-- Compiled automatically by build-baseline.js
-- Status literals normalized: APPLIED -> APPLIED (TypeScript contract alignment)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==========================================
-- Source: 20260121000001_enable_postgis.sql
-- ==========================================

-- Enable PostGIS extension for spatial data support
-- Required for geography(Point, 4326) columns and spatial indexes

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();


-- ==========================================
-- Source: 20260121000002_create_enums.sql
-- ==========================================

-- Create database enums matching TypeScript enums from @rockhounding/shared
-- LOCKED: These values must match the Build Document exactly

-- Legal status for collecting at a location
-- Drives legal gating UI logic
DO $$ BEGIN
  CREATE TYPE legal_tag AS ENUM (
'LEGAL_PUBLIC',
  'LEGAL_FEE_SITE',
  'LEGAL_CLUB_SUPERVISED',
  'GRAY_AREA',
  'RESEARCH_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Data source provenance tier
DO $$ BEGIN
  CREATE TYPE source_tier AS ENUM (
'OFFICIAL',
  'OPERATOR',
  'SECONDARY',
  'COMMUNITY_STAGED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Operational status of a location
DO $$ BEGIN
  CREATE TYPE status AS ENUM (
'OPEN',
  'SEASONAL',
  'CLOSED',
  'UNKNOWN',
  'RESEARCH_REQUIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Visibility level for user-generated content
DO $$ BEGIN
  CREATE TYPE visibility AS ENUM (
'PRIVATE',
  'SHARED_LINK',
  'TEAM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Access model for locations (not in locked enums, but required per API contract)
DO $$ BEGIN
  CREATE TYPE access_model AS ENUM (
'PUBLIC_LAND',
  'FEE_SITE',
  'CLUB_ONLY',
  'PERMISSION_REQUIRED',
  'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Moderation status for staging tables
DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM (
'PENDING',
  'APPROVED',
  'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Export job status
DO $$ BEGIN
  CREATE TYPE export_status AS ENUM (
'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- Export format types
DO $$ BEGIN
  CREATE TYPE export_format AS ENUM (
'GEOJSON',
  'KML',
  'CSV'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;



-- ==========================================
-- Source: 20260121000003_create_core_tables.sql
-- ==========================================

-- Core tables: locations, materials, rulesets, and their relationships
-- These tables represent the single source of truth for rockhounding data

-- Materials reference table (minerals, rocks, fossils, etc.)
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- minerals, rocks, fossils, gemstones
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ruleset_url TEXT NOT NULL, -- Link to official rules
  jurisdiction TEXT NOT NULL, -- federal, state, county, private
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_tier source_tier NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE geounits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- state, county
  state_code TEXT, -- 2-letter state code
  geom geography(MultiPolygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skipped legacy table locations to use v1_contract_lock version

-- Canonical v1 public.locations (emitted before location-dependent tables)

DO $$ BEGIN
    CREATE TYPE public.access_status AS ENUM ('allowed', 'caution', 'restricted', 'prohibited', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE public.locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    geom geography(POINT, 4326) NOT NULL,
    fuzzy_geom geography(POINT, 4326), -- Locked to ~1km grid
    access_status public.access_status DEFAULT 'unknown',
    difficulty_rating integer CHECK (difficulty_rating BETWEEN 1 AND 5),
    is_verified boolean DEFAULT false,
    submitted_by uuid REFERENCES auth.users(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_locations_geom ON public.locations USING GIST(geom);
CREATE INDEX idx_locations_fuzzy_geom ON public.locations USING GIST(fuzzy_geom);
CREATE TABLE location_materials (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  abundance TEXT, -- common, uncommon, rare
  notes TEXT,
  PRIMARY KEY (location_id, material_id)
);

CREATE TABLE location_rulesets (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  ruleset_id UUID NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  PRIMARY KEY (location_id, ruleset_id)
);



-- Deferred shared DDL tail (from 20260121000003_create_core_tables.sql)
-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE locations IS 'Public rockhounding locations (approved only)';

CREATE TRIGGER update_rulesets_updated_at BEFORE UPDATE ON rulesets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN locations.geom IS 'PostGIS geography point in WGS84 (EPSG:4326)';

-- ==========================================
-- Source: 20260121000004_create_staging.sql
-- ==========================================

-- Staging table for user submissions and bulk imports
-- Build Document Rule #6: User submissions NEVER publish directly
-- All submissions go here for admin moderation before promotion to locations table

CREATE TABLE locations_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info (same structure as locations table)
  name TEXT NOT NULL,
  description TEXT,
  
  -- Spatial data
  geom geography(Point, 4326) NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  lon NUMERIC(11, 7) NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  
  -- Legal gating
  legal_tag legal_tag NOT NULL,
  legal_confidence INTEGER NOT NULL CHECK (legal_confidence BETWEEN 0 AND 100),
  access_model access_model NOT NULL,
  
  -- Operational status
  status status NOT NULL DEFAULT 'UNKNOWN',
  
  -- Data provenance
  source_tier source_tier NOT NULL DEFAULT 'COMMUNITY_STAGED',
  source_id UUID REFERENCES sources(id),
  verification_date TIMESTAMPTZ,
  
  -- Primary ruleset
  primary_ruleset_id UUID REFERENCES rulesets(id),
  
  -- Site characteristics
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  kid_friendly BOOLEAN NOT NULL DEFAULT false,
  
  -- Additional info
  directions TEXT,
  parking_info TEXT,
  fees_cost TEXT,
  season_info TEXT,
  
  -- Moderation workflow
  moderation_status moderation_status NOT NULL DEFAULT 'PENDING',
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Promoted location tracking
  promoted_to_location_id UUID REFERENCES locations(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT staging_verification_check 
    CHECK (
      verification_date IS NOT NULL 
      OR status = 'RESEARCH_REQUIRED'
    ),
  CONSTRAINT staging_reviewed_check
    CHECK (
      (moderation_status = 'PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL)
      OR (moderation_status != 'PENDING' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

-- Updated_at trigger
CREATE TRIGGER update_locations_staging_updated_at BEFORE UPDATE ON locations_staging
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Users can only see their own pending submissions + admins see all
ALTER TABLE locations_staging ENABLE ROW LEVEL SECURITY;



-- Deferred shared DDL tail (from 20260121000004_create_staging.sql)
-- Comments
COMMENT ON TABLE locations_staging IS 'Staging area for user submissions and bulk imports - requires admin approval';

CREATE POLICY "Users can view own submissions" ON locations_staging
  FOR SELECT
  USING (
    auth.uid() = submitted_by 
    OR auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "Users can insert own submissions" ON locations_staging
  FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Only admins can update" ON locations_staging
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin');

COMMENT ON COLUMN locations_staging.moderation_status IS 'Approval workflow: PENDING â†’ APPROVED/REJECTED';

COMMENT ON COLUMN locations_staging.promoted_to_location_id IS 'Links to public locations table after approval';

-- ==========================================
-- Source: 20260121000005_create_observations.sql
-- ==========================================

-- Observations: Geologist field observations and notes
-- Build Document: Private by default, owner-only RLS

CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner (REQUIRED for RLS)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Optional link to public location
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Spatial data (may be away from any public location)
  geom geography(Point, 4326) NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  lon NUMERIC(11, 7) NOT NULL,
  
  -- Observation content
  title TEXT NOT NULL,
  description TEXT,
  
  -- Visibility control
  visibility visibility NOT NULL DEFAULT 'PRIVATE',
  
  -- Field data
  observation_date TIMESTAMPTZ NOT NULL,
  weather_conditions TEXT,
  
  -- Optional structured data
  rock_type TEXT,
  mineral_found TEXT,
  specimen_collected BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE observation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  
  -- Storage reference (Supabase Storage path)
  storage_path TEXT NOT NULL,
  
  -- Photo metadata
  caption TEXT,
  taken_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- Deferred shared DDL tail (from 20260121000005_create_observations.sql)
-- Updated_at trigger
CREATE TRIGGER update_observations_updated_at BEFORE UPDATE ON observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Owner-only access (strict enforcement)
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- RLS for observation_photos (inherits from observations)
ALTER TABLE observation_photos ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE observations IS 'Geologist field observations - RLS enforced owner-only access';

CREATE POLICY "Users can view own observations" ON observations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own observations" ON observations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own observations" ON observations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own observations" ON observations
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own observation photos" ON observation_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM observations
      WHERE observations.id = observation_photos.observation_id
      AND observations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own observation photos" ON observation_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM observations
      WHERE observations.id = observation_photos.observation_id
      AND observations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own observation photos" ON observation_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM observations
      WHERE observations.id = observation_photos.observation_id
      AND observations.user_id = auth.uid()
    )
  );

COMMENT ON COLUMN observations.user_id IS 'Owner - used for RLS policy enforcement';

COMMENT ON COLUMN observations.visibility IS 'PRIVATE by default - SHARED_LINK and TEAM visibility to be implemented';

COMMENT ON TABLE observation_photos IS 'Photos attached to observations - inherits RLS from observations table';

-- ==========================================
-- Source: 20260121000006_create_exports.sql
-- ==========================================

-- Export jobs and offline state packs
-- Build Document: Support for GeoJSON/KML/CSV exports and vector-only offline packs

-- Export jobs tracking
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Export configuration
  format export_format NOT NULL,
  status export_status NOT NULL DEFAULT 'PENDING',
  
  -- Filter parameters (JSON for flexibility)
  filter_params JSONB,
  
  -- Results
  download_url TEXT, -- Signed URL from Supabase Storage
  file_size_bytes BIGINT,
  record_count INTEGER,
  
  -- Error tracking
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE state_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- State identifier
  state_code TEXT NOT NULL UNIQUE, -- 2-letter state code (e.g., 'CA', 'TX')
  state_name TEXT NOT NULL,
  
  -- Pack metadata
  version INTEGER NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  
  -- Statistics
  location_count INTEGER NOT NULL DEFAULT 0,
  material_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT,
  
  -- Pack content hash for cache validation
  content_hash TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Only one active version per state
  CONSTRAINT state_packs_state_version_unique UNIQUE (state_code, version)
);

-- Updated_at trigger
CREATE TRIGGER update_state_packs_updated_at BEFORE UPDATE ON state_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- Deferred shared DDL tail (from 20260121000006_create_exports.sql)
-- RLS: Exports are private to user
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- RLS: State packs are public (read-only for all authenticated users)
ALTER TABLE state_packs ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE exports IS 'User export job queue - supports GeoJSON, KML, CSV formats';

CREATE POLICY "Users can view own exports" ON exports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exports" ON exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view state packs" ON state_packs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage state packs" ON state_packs
  FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

COMMENT ON TABLE state_packs IS 'Offline state packs - vector-only JSON bundles (no map tiles)';

COMMENT ON COLUMN state_packs.state_code IS '2-letter state code (e.g., CA, TX)';

COMMENT ON COLUMN state_packs.content_hash IS 'Hash for client-side cache validation';

-- ==========================================
-- Source: 20260121000007_create_indexes.sql
-- ==========================================

-- Performance indexes per Build Document requirements
-- CRITICAL: GIST index on locations.geom for bbox queries
-- REQUIRED: btree indexes on state, legal_tag, access_model, updated_at

-- =============================================================================
-- SPATIAL INDEXES (GIST)
-- =============================================================================

-- PRIMARY REQUIREMENT: locations.geom GIST index for bbox queries
-- This is the most critical index for map browsing performance
-- Skipped duplicate idx_locations_geom (canonical v1 indexes emitted earlier)

-- Staging table spatial index
CREATE INDEX idx_locations_staging_geom ON locations_staging USING GIST (geom);

-- Observations spatial index
CREATE INDEX idx_observations_geom ON observations USING GIST (geom);

-- Geounits spatial index (for boundary queries)
CREATE INDEX idx_geounits_geom ON geounits USING GIST (geom);

-- =============================================================================
-- BTREE INDEXES (Required filters)
-- =============================================================================

-- PRIMARY FILTERS per Build Document API contract
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_state ON locations (state);
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_legal_tag ON locations (legal_tag);
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_access_model ON locations (access_model);
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_updated_at ON locations (updated_at);

-- Additional common filters from API contract
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_difficulty ON locations (difficulty);
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_kid_friendly ON locations (kid_friendly);
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_status ON locations (status);
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_source_tier ON locations (source_tier);

-- =============================================================================
-- RELATIONSHIP INDEXES
-- =============================================================================

-- Location materials lookup
CREATE INDEX idx_location_materials_location_id ON location_materials (location_id);
CREATE INDEX idx_location_materials_material_id ON location_materials (material_id);

-- Location rulesets lookup
CREATE INDEX idx_location_rulesets_location_id ON location_rulesets (location_id);
CREATE INDEX idx_location_rulesets_ruleset_id ON location_rulesets (ruleset_id);

-- =============================================================================
-- STAGING TABLE INDEXES
-- =============================================================================

CREATE INDEX idx_locations_staging_moderation_status ON locations_staging (moderation_status);
CREATE INDEX idx_locations_staging_submitted_by ON locations_staging (submitted_by);
CREATE INDEX idx_locations_staging_created_at ON locations_staging (created_at);

-- =============================================================================
-- OBSERVATIONS INDEXES
-- =============================================================================

-- Critical for RLS performance
CREATE INDEX idx_observations_user_id ON observations (user_id);
CREATE INDEX idx_observations_location_id ON observations (location_id);
CREATE INDEX idx_observations_observation_date ON observations (observation_date);

-- Observation photos
CREATE INDEX idx_observation_photos_observation_id ON observation_photos (observation_id);

-- =============================================================================
-- EXPORTS INDEXES
-- =============================================================================

CREATE INDEX idx_exports_user_id ON exports (user_id);
CREATE INDEX idx_exports_status ON exports (status);
CREATE INDEX idx_exports_created_at ON exports (created_at);

-- =============================================================================
-- REFERENCE TABLE INDEXES
-- =============================================================================

CREATE INDEX idx_materials_category ON materials (category);
CREATE INDEX idx_sources_source_tier ON sources (source_tier);
CREATE INDEX idx_geounits_state_code ON geounits (state_code);
CREATE INDEX idx_geounits_type ON geounits (type);

-- =============================================================================
-- COMPOSITE INDEXES for common query patterns
-- =============================================================================

-- Map bbox queries with legal filtering
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_legal_status ON locations (legal_tag, status, updated_at);

-- State + material filtering (common user query)
-- Skipped legacy locations index (canonical v1 schema): CREATE INDEX idx_locations_state_difficulty ON locations (state, difficulty);

-- Comments
-- Skipped duplicate idx_locations_geom comment (canonical v1 indexes emitted earlier)

-- Skipped legacy locations index comment (canonical v1 schema)

-- Skipped legacy locations index comment (canonical v1 schema)

-- Skipped legacy locations index comment (canonical v1 schema)

-- Skipped legacy locations index comment (canonical v1 schema)



-- ==========================================
-- Source: 20260121000008_add_get_coordinates_rpc.sql
-- ==========================================

-- Migration: Add get_coordinates RPC function
-- Purpose: Extract lat/lon from geography column for API responses
-- Build Document: Full detail endpoint needs lat/lon extracted from PostGIS geom

-- Function to extract coordinates from a location's geography
CREATE OR REPLACE FUNCTION get_coordinates(location_id INTEGER)
RETURNS TABLE (lon DOUBLE PRECISION, lat DOUBLE PRECISION) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ST_X(geom::geometry) AS lon,
    ST_Y(geom::geometry) AS lat
  FROM locations
  WHERE id = location_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_coordinates(INTEGER) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_coordinates IS 'Extracts longitude and latitude from a location geography column';


-- ==========================================
-- Source: 20260123000000_create_user_profiles.sql
-- ==========================================

-- Create minimal user_profiles table for RLS dependencies
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user'
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;



-- Deferred shared DDL tail (from 20260123000000_create_user_profiles.sql)
CREATE POLICY "Users can read own user_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- Source: 20260123000002_create_telemetry_tables.sql
-- ==========================================

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

DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE event_severity AS ENUM (
'debug',
  'info',
  'warning',
  'error',
  'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE device_type AS ENUM (
'mobile',
  'tablet',
  'desktop'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ============================================================================
-- Main Telemetry Events Table (Partitioned by date)
-- ============================================================================

CREATE TABLE telemetry_events (
  event_id UUID DEFAULT gen_random_uuid(),
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
  PRIMARY KEY (event_id, timestamp),
  CHECK (timestamp >= '2026-01-01'::timestamptz)
) PARTITION BY RANGE (timestamp);

CREATE INDEX idx_telemetry_events_session_id ON telemetry_events(session_id);

CREATE INDEX idx_telemetry_events_category ON telemetry_events(category);

CREATE INDEX idx_telemetry_events_timestamp ON telemetry_events(timestamp DESC);

CREATE INDEX idx_telemetry_events_severity ON telemetry_events(severity) WHERE severity IN ('error', 'critical');

CREATE INDEX idx_telemetry_events_event_name ON telemetry_events(event_name);

CREATE INDEX idx_telemetry_events_metadata ON telemetry_events USING GIN(metadata);

-- Create indexes on parent table (inherited by partitions)
CREATE INDEX idx_telemetry_events_user_id ON telemetry_events(user_id) WHERE user_id IS NOT NULL;

-- GIN index for JSONB fields
CREATE INDEX idx_telemetry_events_event_data ON telemetry_events USING GIN(event_data);

CREATE TABLE telemetry_events_2026_01 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE telemetry_events_2026_02 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE telemetry_aggregated_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE telemetry_errors (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (event_id, event_timestamp) REFERENCES telemetry_events(event_id, timestamp) ON DELETE CASCADE,
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

CREATE TABLE telemetry_performance_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (event_id, event_timestamp) REFERENCES telemetry_events(event_id, timestamp) ON DELETE CASCADE,
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



-- Deferred shared DDL tail (from 20260123000002_create_telemetry_tables.sql)
CREATE INDEX idx_errors_user_time ON telemetry_errors(user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_performance_user_time ON telemetry_performance_metrics(user_id, measured_at DESC)
  WHERE user_id IS NOT NULL;

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
      event_timestamp,
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
      NEW.timestamp,
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
      event_timestamp,
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
      NEW.timestamp,
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

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE telemetry_aggregated_metrics ENABLE ROW LEVEL SECURITY;

ALTER TABLE telemetry_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE telemetry_errors ENABLE ROW LEVEL SECURITY;

ALTER TABLE telemetry_performance_metrics ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER trigger_insert_error
  AFTER INSERT ON telemetry_events
  FOR EACH ROW
  EXECUTE FUNCTION insert_telemetry_error();

CREATE TRIGGER trigger_insert_performance
  AFTER INSERT ON telemetry_events
  FOR EACH ROW
  EXECUTE FUNCTION insert_performance_metric();

COMMENT ON TABLE telemetry_aggregated_metrics IS 'Pre-aggregated metrics for dashboard queries';

COMMENT ON TABLE telemetry_sessions IS 'User session tracking with statistics';

COMMENT ON TABLE telemetry_errors IS 'Denormalized error events for fast queries';

COMMENT ON TABLE telemetry_performance_metrics IS 'Denormalized performance metrics';

COMMENT ON MATERIALIZED VIEW telemetry_error_summary_daily IS 'Daily error summary for trending';

COMMENT ON MATERIALIZED VIEW telemetry_performance_summary IS 'Performance summary by page';

COMMENT ON MATERIALIZED VIEW telemetry_cache_summary IS 'Cache hit rate by level and date';

-- ==========================================
-- Source: 20260123000003_create_sync_engine.sql
-- ==========================================

-- ============================================================================
-- Sync Engine Database Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- Enums
-- ============================================================================

DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE sync_operation_type AS ENUM (
'create',
  'update',
  'delete',
  'soft_delete'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM (
'pending',
  'syncing',
  'success',
  'conflict',
  'error',
  'retry',
  'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE conflict_resolution_strategy AS ENUM (
'client_wins',
  'server_wins',
  'manual',
  'merge',
  'latest_timestamp',
  'field_level'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE sync_priority AS ENUM (
'critical',
  'high',
  'normal',
  'low',
  'background'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE sync_direction AS ENUM (
'outbound',
  'inbound',
  'bidirectional'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE connection_quality AS ENUM (
'excellent',
  'good',
  'fair',
  'poor',
  'offline'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ============================================================================
-- Main Sync Queue Table
-- ============================================================================

CREATE TABLE sync_queue (
  sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_sync_queue_device_status ON sync_queue(device_id, status);

CREATE INDEX idx_sync_queue_priority ON sync_queue(priority, status, created_at);

CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

CREATE INDEX idx_sync_queue_retry ON sync_queue(status, next_retry_at) WHERE status = 'retry';

CREATE INDEX idx_sync_queue_pending ON sync_queue(priority, created_at) WHERE status = 'pending';

CREATE INDEX idx_sync_queue_depends ON sync_queue USING GIN(depends_on);

-- Indexes for sync queue
CREATE INDEX idx_sync_queue_user_status ON sync_queue(user_id, status);

CREATE TABLE sync_conflicts (
  conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);

CREATE INDEX idx_sync_conflicts_unresolved ON sync_conflicts(resolved, detected_at) WHERE NOT resolved;

CREATE INDEX idx_sync_conflicts_user ON sync_conflicts(resolved_by, resolved_at) WHERE resolved;

-- Indexes for conflicts
CREATE INDEX idx_sync_conflicts_sync ON sync_conflicts(sync_id);

CREATE TABLE sync_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_sync_batches_device ON sync_batches(device_id, created_at DESC);

CREATE INDEX idx_sync_batches_priority ON sync_batches(priority, created_at);

-- Indexes for batches
CREATE INDEX idx_sync_batches_user ON sync_batches(user_id, created_at DESC);

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

CREATE INDEX idx_sync_state_syncing ON sync_state(is_syncing, updated_at) WHERE is_syncing;

-- Index for sync state
CREATE INDEX idx_sync_state_device ON sync_state(device_id);

CREATE TABLE sync_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_sync_history_entity ON sync_history(entity_type, entity_id);

CREATE INDEX idx_sync_history_status ON sync_history(status, completed_at);

-- Partitioning by month for scalability
CREATE INDEX idx_sync_history_user_time ON sync_history(user_id, completed_at DESC);

CREATE TABLE sync_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_sync_metrics_device_period ON sync_metrics(device_id, period_start DESC);

-- Indexes for metrics
CREATE INDEX idx_sync_metrics_user_period ON sync_metrics(user_id, period_start DESC);

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

CREATE INDEX idx_sync_idempotency_user ON sync_idempotency_keys(user_id, processed_at);

-- Index for cleanup
CREATE INDEX idx_sync_idempotency_expires ON sync_idempotency_keys(expires_at);

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

CREATE VIEW sync_queue_retry_ready AS
SELECT *
FROM sync_queue
WHERE status = 'retry'
  AND next_retry_at <= NOW()
  AND retry_count < max_retries
ORDER BY priority, next_retry_at;

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



-- Deferred shared DDL tail (from 20260123000003_create_sync_engine.sql)
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

-- sync_queue policies
CREATE POLICY sync_queue_select_policy ON sync_queue
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- sync_conflicts policies
CREATE POLICY sync_conflicts_select_policy ON sync_conflicts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sync_queue WHERE sync_id = sync_conflicts.sync_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- sync_batches policies
CREATE POLICY sync_batches_select_policy ON sync_batches
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

-- sync_state policies
CREATE POLICY sync_state_select_policy ON sync_state
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
  );

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

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE sync_queue IS 'Queue of pending/in-progress sync operations';

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

ALTER TABLE sync_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE sync_metrics ENABLE ROW LEVEL SECURITY;

ALTER TABLE sync_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_queue_insert_policy ON sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_queue_update_policy ON sync_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY sync_queue_delete_policy ON sync_queue
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY sync_conflicts_update_policy ON sync_conflicts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sync_queue WHERE sync_id = sync_conflicts.sync_id AND user_id = auth.uid())
  );

CREATE POLICY sync_batches_insert_policy ON sync_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_state_insert_policy ON sync_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_state_update_policy ON sync_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY sync_idempotency_insert_policy ON sync_idempotency_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_timestamp();

CREATE TRIGGER sync_queue_update_state
  AFTER INSERT OR UPDATE OR DELETE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_state_counts();

CREATE TRIGGER sync_queue_create_history
  AFTER UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION create_sync_history_entry();

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

-- ==========================================
-- Source: 20260124000002_create_collection_management.sql
-- ==========================================

-- =====================================================
-- Collection Management Migration
-- =====================================================
-- This migration creates the complete database schema for
-- Collection Management, handling the lifecycle:
-- FieldSession â†’ FindLog â†’ Specimen â†’ Collection
--
-- Tables created:
-- - specimens: Individual specimens in collection
-- - storage_locations: Physical storage locations
-- - tags: Labels for organizing specimens
-- - collection_groups: Themed collections
-- - specimen_tags: Many-to-many (specimens <-> tags)
-- - collection_group_specimens: Many-to-many (groups <-> specimens)
--
-- Features:
-- - Deterministic lifecycle state machine
-- - Event sourcing integration
-- - Automatic metrics aggregation
-- - RLS policies for security
-- - Spatial support for collection locations
-- - Integration with find_logs and lapidary projects

-- =====================================================
-- 1. SPECIMENS TABLE
-- =====================================================
-- Deferred table specimens (FK ordering: requires find_logs, field_sessions, capture_sessions, storage_locations)

CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Hierarchy
  parent_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  
  -- Basic information
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'ROOM',             -- Room
    'SHELF',            -- Shelf unit
    'CABINET',          -- Cabinet
    'DRAWER',           -- Drawer
    'BOX',              -- Box
    'CONTAINER',        -- Container
    'DISPLAY_CASE',     -- Display case
    'SAFE'              -- Safe
  )),
  code TEXT,
  
  -- Physical details
  description TEXT,
  dimensions TEXT,
  capacity INTEGER CHECK (capacity > 0),
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  
  -- Organization
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Documentation
  photo_path TEXT,
  notes TEXT,
  
  -- Event sourcing
  sequence_number INTEGER NOT NULL DEFAULT 0,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'APPLIED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 85,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_storage_location_code UNIQUE (user_id, code)
);

CREATE INDEX idx_storage_locations_parent ON storage_locations(parent_location_id) WHERE parent_location_id IS NOT NULL;

CREATE INDEX idx_storage_locations_type ON storage_locations(type);

CREATE INDEX idx_storage_locations_user_sort ON storage_locations(user_id, sort_order);

CREATE INDEX idx_storage_locations_sync ON storage_locations(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

-- Indexes for storage_locations
CREATE INDEX idx_storage_locations_user_id ON storage_locations(user_id);

COMMENT ON TABLE storage_locations IS 'Hierarchical storage locations for specimens';

COMMENT ON COLUMN storage_locations.parent_location_id IS 'Parent location for nested storage (e.g., Box inside Shelf)';

COMMENT ON COLUMN storage_locations.current_count IS 'Current number of specimens in this location';

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Basic information
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'CATEGORY',         -- Material category
    'LOCATION',         -- Location-based
    'QUALITY',          -- Quality rating
    'PROJECT',          -- Project-based
    'CUSTOM'            -- User-defined
  )),
  color TEXT CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon TEXT,
  
  -- Organization
  parent_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Usage
  specimen_count INTEGER NOT NULL DEFAULT 0 CHECK (specimen_count >= 0),
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Event sourcing
  sequence_number INTEGER NOT NULL DEFAULT 0,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'APPLIED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 85,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_tag_name UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_type ON tags(type);

CREATE INDEX idx_tags_parent ON tags(parent_tag_id) WHERE parent_tag_id IS NOT NULL;

CREATE INDEX idx_tags_user_sort ON tags(user_id, sort_order);

CREATE INDEX idx_tags_sync ON tags(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

-- Indexes for tags
CREATE INDEX idx_tags_user_id ON tags(user_id);

COMMENT ON TABLE tags IS 'Labels and categories for organizing specimens';

COMMENT ON COLUMN tags.specimen_count IS 'Number of specimens with this tag (auto-updated by triggers)';

CREATE TABLE IF NOT EXISTS collection_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Basic information
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'MATERIAL_TYPE',    -- Grouped by material
    'LOCATION',         -- Grouped by location
    'DATE_RANGE',       -- Grouped by time
    'THEME',            -- Themed collection
    'PROJECT',          -- Project-based
    'CUSTOM'            -- User-defined
  )),
  slug TEXT NOT NULL,
  
  -- Details
  description TEXT,
  notes TEXT,
  
  -- Organization
  parent_group_id UUID REFERENCES collection_groups(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Aggregated metrics (auto-updated by triggers)
  specimen_count INTEGER NOT NULL DEFAULT 0 CHECK (specimen_count >= 0),
  total_weight_grams DOUBLE PRECISION CHECK (total_weight_grams >= 0),
  estimated_total_value DECIMAL(12,2) CHECK (estimated_total_value >= 0),
  
  -- Documentation
  cover_photo_path TEXT,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  
  -- Metadata
  metadata JSONB,
  
  -- Event sourcing
  sequence_number INTEGER NOT NULL DEFAULT 0,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'APPLIED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 85,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_collection_group_slug UNIQUE (user_id, slug)
);

CREATE INDEX idx_collection_groups_type ON collection_groups(type);

CREATE INDEX idx_collection_groups_parent ON collection_groups(parent_group_id) WHERE parent_group_id IS NOT NULL;

CREATE INDEX idx_collection_groups_user_sort ON collection_groups(user_id, sort_order);

CREATE INDEX idx_collection_groups_is_public ON collection_groups(is_public) WHERE is_public = true;

CREATE INDEX idx_collection_groups_sync ON collection_groups(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

-- Indexes for collection_groups
CREATE INDEX idx_collection_groups_user_id ON collection_groups(user_id);

COMMENT ON TABLE collection_groups IS 'Themed collections or sets of specimens';

COMMENT ON COLUMN collection_groups.specimen_count IS 'Number of specimens in this collection (auto-updated)';

COMMENT ON COLUMN collection_groups.total_weight_grams IS 'Total weight of all specimens in collection (auto-updated)';

-- Deferred table specimen_tags (FK ordering: requires specimens)

-- Deferred table collection_group_specimens (FK ordering: requires specimens)

-- Deferred view specimens_complete (view dependency ordering: requires specimens, find_logs, specimen_tags, collection_group_specimens)

-- Deferred view collection_statistics (view dependency ordering: requires specimens)

CREATE OR REPLACE VIEW storage_capacity_status AS
SELECT
  sl.id,
  sl.user_id,
  sl.name,
  sl.type,
  sl.code,
  sl.current_count,
  sl.capacity,
  CASE
    WHEN sl.capacity IS NULL THEN NULL
    WHEN sl.current_count >= sl.capacity THEN 'FULL'
    WHEN sl.current_count::FLOAT / sl.capacity >= 0.9 THEN 'NEARLY_FULL'
    WHEN sl.current_count::FLOAT / sl.capacity >= 0.7 THEN 'MODERATE'
    ELSE 'AVAILABLE'
  END AS capacity_status,
  CASE
    WHEN sl.capacity IS NULL THEN NULL
    ELSE sl.capacity - sl.current_count
  END AS available_capacity,
  CASE
    WHEN sl.capacity IS NULL THEN NULL
    ELSE ROUND((sl.current_count::FLOAT / sl.capacity * 100)::NUMERIC, 1)
  END AS utilization_percentage
FROM storage_locations sl;



-- ==========================================
-- Source: 20260124000003_create_collection_analytics.sql
-- ==========================================

-- =====================================================
-- COLLECTION ANALYTICS MIGRATION
-- 
-- Analytics system with:
-- - Materialized views for fast analytics queries
-- - Analytics cache table for offline operation
-- - Event tracking for incremental updates
-- - Triggers for automatic cache invalidation
-- - RLS policies for security
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE analytics_level AS ENUM (
'USER',
  'STORAGE_LOCATION',
  'TAG',
  'COLLECTION_GROUP',
  'MATERIAL',
  'TIME_PERIOD'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE time_period_granularity AS ENUM (
'DAY',
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE cache_status AS ENUM (
'FRESH',
  'STALE',
  'CALCULATING',
  'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- =====================================================
-- ANALYTICS CACHE TABLE
-- =====================================================

CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cache identification
  cache_key TEXT NOT NULL,
  level analytics_level NOT NULL,
  entity_id UUID,
  
  -- Cached data (JSONB for flexible storage)
  data JSONB NOT NULL,
  
  -- Cache control
  status cache_status NOT NULL DEFAULT 'FRESH',
  ttl_seconds INTEGER NOT NULL DEFAULT 300,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  calculation_time_ms INTEGER NOT NULL DEFAULT 0,
  data_size_bytes INTEGER NOT NULL DEFAULT 0,
  dependencies TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INTEGER NOT NULL DEFAULT 0,
  
  -- Constraints
  UNIQUE(user_id, cache_key)
);

CREATE TABLE analytics_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Affected analytics
  affected_levels analytics_level[] NOT NULL DEFAULT '{}',
  affected_entities TEXT[] NOT NULL DEFAULT '{}',
  
  -- Processing status
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deferred materialized_view user_analytics_mv (view dependency ordering: requires specimens, specimen_tags, collection_group_specimens)

-- Deferred materialized_view storage_location_analytics_mv (view dependency ordering: requires specimens)

-- Deferred materialized_view tag_analytics_mv (view dependency ordering: requires specimen_tags, specimens)

-- Deferred materialized_view collection_group_analytics_mv (view dependency ordering: requires collection_group_specimens, specimens)

-- Deferred materialized_view material_analytics_mv (view dependency ordering: requires specimens)



-- ==========================================
-- Source: 20260125000009_create_field_sessions.sql
-- ==========================================

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
  state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN (
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
    'PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED'
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

CREATE INDEX idx_field_sessions_status ON public.field_sessions(state);

CREATE INDEX idx_field_sessions_created_at ON public.field_sessions(created_at DESC);

CREATE INDEX idx_field_sessions_started_at ON public.field_sessions(started_at);

CREATE INDEX idx_field_sessions_user_status ON public.field_sessions(user_id, state);

CREATE INDEX idx_field_sessions_sync_status ON public.field_sessions(sync_status);

CREATE INDEX idx_field_sessions_device_id ON public.field_sessions(device_id);

-- Indexes for common queries
CREATE INDEX idx_field_sessions_user_id ON public.field_sessions(user_id);

-- Geospatial index for location queries
CREATE INDEX idx_field_sessions_center_point ON public.field_sessions USING gist(center_point);

CREATE OR REPLACE VIEW public.field_sessions_summary AS
SELECT
  id,
  user_id,
  title,
  state,
  created_at,
  started_at,
  ended_at,
  EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_minutes,
  (metrics->>'distance_m')::numeric as distance_meters,
  (metrics->>'finds_count')::int as finds_count,
  find_log_count,
  sync_status
FROM public.field_sessions;

CREATE OR REPLACE VIEW public.user_session_stats AS
SELECT
  user_id,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN state = 'COMPLETED' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN state = 'ACTIVE' THEN 1 END) as active_sessions,
  COALESCE(SUM((metrics->>'duration_ms')::numeric), 0) as total_duration_ms,
  COALESCE(SUM((metrics->>'distance_m')::numeric), 0) as total_distance_m,
  COALESCE(SUM((metrics->>'finds_count')::int), 0) as total_finds,
  MIN(created_at) as first_session,
  MAX(created_at) as last_session
FROM public.field_sessions
GROUP BY user_id;



-- Deferred shared DDL tail (from 20260125000009_create_field_sessions.sql)
CREATE INDEX idx_field_sessions_metrics ON public.field_sessions USING gin(metrics);

CREATE INDEX idx_field_sessions_tags ON public.field_sessions USING gin(tags);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_field_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update last_activity_at on any INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_field_sessions_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    synced_at = CASE WHEN new_status = 'APPLIED' THEN now() ELSE synced_at END,
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
  
  -- Update session state to COMPLETED
  UPDATE public.field_sessions
  SET
    state = 'COMPLETED',
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

-- Comment on table for documentation
COMMENT ON TABLE public.field_sessions IS 'Core entity for field collecting sessions. Tracks location data, finds, timestamps, weather conditions, and sync status.';

CREATE TRIGGER field_sessions_timestamp_trigger
BEFORE UPDATE ON public.field_sessions
FOR EACH ROW
EXECUTE FUNCTION update_field_sessions_timestamp();

CREATE TRIGGER field_sessions_activity_trigger
BEFORE INSERT OR UPDATE ON public.field_sessions
FOR EACH ROW
EXECUTE FUNCTION update_field_sessions_activity();

COMMENT ON COLUMN public.field_sessions.state IS 'Session lifecycle state: DRAFT, ACTIVE, PAUSED, FINALIZING, COMPLETED, CANCELLED, CONFLICT';

COMMENT ON COLUMN public.field_sessions.sync_status IS 'Synchronization state with server: PENDING, SYNCING, APPLIED, CONFLICT, FAILED, RETRY_SCHEDULED';

COMMENT ON COLUMN public.field_sessions.path_geojson IS 'GeoJSON FeatureCollection of session path points';

COMMENT ON COLUMN public.field_sessions.center_point IS 'PostGIS point at session center for spatial queries';

COMMENT ON COLUMN public.field_sessions.weather_snapshot IS 'Weather conditions at session start: {temperature, humidity, condition, visibility, wind, pressure, uv_index}';

COMMENT ON COLUMN public.field_sessions.metrics IS 'Cached metrics: {duration_ms, distance_m, finds_count, notes_count, photos_count, equipment_count}';

COMMENT ON COLUMN public.field_sessions.find_aggregates IS 'Aggregated find log data: {specimensByType, findsByType, locations, dates}';

COMMENT ON COLUMN public.field_sessions.checksum_hash IS 'SHA256 hash of session for conflict detection and integrity checking';

-- ==========================================
-- Source: 20260125000010_create_find_logs.sql
-- ==========================================

-- Rockhound FindLog Database Schema & Migrations
-- Tables, indexes, RLS policies, and triggers for find_logs

-- Find Logs Table
CREATE TABLE public.find_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_session_id uuid NOT NULL,
  
  -- Material Identification
  material_type text NOT NULL DEFAULT 'UNKNOWN' CHECK (material_type IN (
    'MINERAL', 'ROCK', 'CRYSTAL', 'FOSSIL', 'GEODE', 'SPECIMEN', 'ORE', 'METEORITE', 'GEMSTONE', 'UNKNOWN'
  )),
  identification_confidence text NOT NULL DEFAULT 'UNCERTAIN' CHECK (identification_confidence IN (
    'CERTAIN', 'VERY_LIKELY', 'LIKELY', 'POSSIBLE', 'UNCERTAIN', 'GUESS', 'UNIDENTIFIED'
  )),
  primary_name text NOT NULL,
  secondary_name text,
  identification_notes text,
  identified_by text,
  identified_at timestamp with time zone,
  
  -- Quality Assessment
  quality_rating text NOT NULL DEFAULT 'GOOD' CHECK (quality_rating IN (
    'PRISTINE', 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR', 'FRAGMENTARY'
  )),
  condition_notes text,
  damage_description text,
  collection_value text,
  
  -- Specimen Characteristics
  size_class text CHECK (size_class IN (
    'MICROSCOPIC', 'VERY_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'VERY_LARGE'
  )),
  length_mm numeric,
  width_mm numeric,
  height_mm numeric,
  weight_g numeric,
  color text,
  luster text,
  transparency text,
  hardness numeric CHECK (hardness >= 1 AND hardness <= 10),
  
  -- Location
  location_point geometry(POINT, 4326) NOT NULL,
  latitude numeric NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude numeric NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  altitude numeric,
  accuracy numeric,
  coordinates_polygon jsonb,
  
  -- Environmental
  environmental_factors text[] DEFAULT ARRAY[]::text[],
  temperature_c numeric,
  humidity numeric CHECK (humidity >= 0 AND humidity <= 100),
  weather_condition text,
  soil_type text,
  host_rock text,
  depth_cm numeric,
  
  -- Media
  photo_ids uuid[] DEFAULT ARRAY[]::uuid[],
  photos_count int DEFAULT 0,
  attachment_ids uuid[] DEFAULT ARRAY[]::uuid[],
  
  -- Relations
  specimen_ids uuid[] DEFAULT ARRAY[]::uuid[],
  specimen_count int DEFAULT 0,
  notes text,
  field_notes jsonb DEFAULT '[]'::jsonb,
  
  -- Flags
  is_private boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  
  -- State
  state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN (
    'DRAFT', 'SUBMITTED', 'VERIFIED', 'ARCHIVED', 'DELETED'
  )),
  submitted_at timestamp with time zone,
  verified_at timestamp with time zone,
  verified_by text,
  
  -- Sync
  sync_status text NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN (
    'PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED'
  )),
  synced_at timestamp with time zone,
  last_sync_error text,
  is_offline boolean DEFAULT false,
  offline_synced_at timestamp with time zone,
  checksum_hash text,
  
  -- Versioning
  version int DEFAULT 1,
  schema_version int DEFAULT 1,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Audit
  created_by text DEFAULT 'system',
  updated_by text DEFAULT 'system'
);

CREATE INDEX idx_find_logs_field_session_id ON public.find_logs(field_session_id);

CREATE INDEX idx_find_logs_material_type ON public.find_logs(material_type);

CREATE INDEX idx_find_logs_quality_rating ON public.find_logs(quality_rating);

CREATE INDEX idx_find_logs_identification_confidence ON public.find_logs(identification_confidence);

CREATE INDEX idx_find_logs_state ON public.find_logs(state);

CREATE INDEX idx_find_logs_created_at ON public.find_logs(created_at DESC);

CREATE INDEX idx_find_logs_user_session ON public.find_logs(user_id, field_session_id);

CREATE INDEX idx_find_logs_sync_status ON public.find_logs(sync_status);

CREATE INDEX idx_find_logs_is_favorite ON public.find_logs(is_favorite) WHERE is_favorite = true;

CREATE INDEX idx_find_logs_is_private ON public.find_logs(is_private) WHERE is_private = true;

-- Indexes for common queries
CREATE INDEX idx_find_logs_user_id ON public.find_logs(user_id);

-- Geospatial index for location queries
CREATE INDEX idx_find_logs_location_point ON public.find_logs USING gist(location_point);

-- JSON indexes for metadata queries
CREATE INDEX idx_find_logs_photos_count ON public.find_logs(photos_count);

CREATE OR REPLACE VIEW public.find_logs_summary AS
SELECT
  id,
  user_id,
  field_session_id,
  primary_name,
  material_type,
  quality_rating,
  identification_confidence,
  photos_count,
  specimen_count,
  state,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at)) / 3600 as hours_since_found
FROM public.find_logs;

CREATE OR REPLACE VIEW public.find_logs_by_material AS
SELECT
  user_id,
  material_type,
  COUNT(*) as find_count,
  AVG(
    CASE
      WHEN quality_rating = 'PRISTINE' THEN 97
      WHEN quality_rating = 'EXCELLENT' THEN 90
      WHEN quality_rating = 'VERY_GOOD' THEN 80
      WHEN quality_rating = 'GOOD' THEN 67
      WHEN quality_rating = 'FAIR' THEN 52
      WHEN quality_rating = 'POOR' THEN 35
      WHEN quality_rating = 'FRAGMENTARY' THEN 12
      ELSE 0
    END
  ) as avg_quality_score,
  COUNT(CASE WHEN photos_count > 0 THEN 1 END) as finds_with_photos,
  MIN(created_at) as first_find_of_type,
  MAX(created_at) as last_find_of_type
FROM public.find_logs
WHERE state != 'DELETED'
GROUP BY user_id, material_type;

CREATE OR REPLACE VIEW public.session_find_statistics AS
SELECT
  field_session_id,
  user_id,
  COUNT(*) as total_finds,
  COUNT(DISTINCT material_type) as unique_materials,
  SUM(specimen_count) as total_specimens,
  COUNT(CASE WHEN photos_count > 0 THEN 1 END) as finds_with_photos,
  COUNT(CASE WHEN state = 'VERIFIED' THEN 1 END) as verified_finds,
  AVG(
    CASE
      WHEN identification_confidence = 'CERTAIN' THEN 100
      WHEN identification_confidence = 'VERY_LIKELY' THEN 90
      WHEN identification_confidence = 'LIKELY' THEN 72
      WHEN identification_confidence = 'POSSIBLE' THEN 57
      WHEN identification_confidence = 'UNCERTAIN' THEN 37
      WHEN identification_confidence = 'GUESS' THEN 12
      WHEN identification_confidence = 'UNIDENTIFIED' THEN 0
      ELSE 0
    END
  ) as avg_confidence_score
FROM public.find_logs
WHERE state != 'DELETED'
GROUP BY field_session_id, user_id;



-- Deferred shared DDL tail (from 20260125000010_create_find_logs.sql)
-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_find_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Row-level security (RLS)
ALTER TABLE public.find_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own find logs
CREATE POLICY users_select_own_finds ON public.find_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own find logs
CREATE POLICY users_insert_own_finds ON public.find_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own find logs
CREATE POLICY users_update_own_finds ON public.find_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own find logs
CREATE POLICY users_delete_own_finds ON public.find_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.find_logs TO authenticated;

-- Stored Procedure: Get nearby finds
CREATE OR REPLACE FUNCTION get_nearby_finds(
  user_id uuid,
  lat numeric,
  lon numeric,
  radius_meters numeric DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  primary_name text,
  material_type text,
  quality_rating text,
  distance_meters numeric,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.primary_name,
    f.material_type,
    f.quality_rating,
    ST_Distance(f.location_point, ST_Point(lon, lat)::geometry(POINT, 4326)) as distance_meters,
    f.created_at
  FROM public.find_logs f
  WHERE f.user_id = user_id
    AND ST_DWithin(f.location_point, ST_Point(lon, lat)::geography, radius_meters)
    AND f.state != 'DELETED'
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Calculate find quality score
CREATE OR REPLACE FUNCTION calculate_find_score(quality_rating text, confidence_level text)
RETURNS int AS $$
DECLARE
  v_quality_score int;
  v_confidence_score int;
BEGIN
  -- Get quality score (40%)
  v_quality_score := CASE quality_rating
    WHEN 'PRISTINE' THEN 97
    WHEN 'EXCELLENT' THEN 90
    WHEN 'VERY_GOOD' THEN 80
    WHEN 'GOOD' THEN 67
    WHEN 'FAIR' THEN 52
    WHEN 'POOR' THEN 35
    WHEN 'FRAGMENTARY' THEN 12
    ELSE 0
  END;
  
  -- Get confidence score (60%)
  v_confidence_score := CASE confidence_level
    WHEN 'CERTAIN' THEN 100
    WHEN 'VERY_LIKELY' THEN 90
    WHEN 'LIKELY' THEN 72
    WHEN 'POSSIBLE' THEN 57
    WHEN 'UNCERTAIN' THEN 37
    WHEN 'GUESS' THEN 12
    WHEN 'UNIDENTIFIED' THEN 0
    ELSE 0
  END;
  
  RETURN ROUND((v_confidence_score * 0.6 + v_quality_score * 0.4))::int;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Mark find as verified
CREATE OR REPLACE FUNCTION verify_find(
  find_id uuid,
  verifier_id text
)
RETURNS void AS $$
BEGIN
  UPDATE public.find_logs
  SET
    state = 'VERIFIED',
    verified_at = now(),
    verified_by = verifier_id,
    updated_at = now()
  WHERE id = find_id AND state = 'SUBMITTED';
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Get user find statistics
CREATE OR REPLACE FUNCTION get_user_find_stats(user_id uuid)
RETURNS TABLE (
  total_finds int,
  total_specimens int,
  materials_collected int,
  finds_with_photos int,
  verified_finds int,
  avg_quality_rating text,
  avg_confidence_level text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(specimen_count), 0)::int,
    COUNT(DISTINCT material_type)::int,
    COUNT(CASE WHEN photos_count > 0 THEN 1 END)::int,
    COUNT(CASE WHEN state = 'VERIFIED' THEN 1 END)::int,
    (ARRAY['FRAGMENTARY', 'POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT', 'PRISTINE'])[
      CEIL(AVG(
        CASE
          WHEN quality_rating = 'PRISTINE' THEN 7
          WHEN quality_rating = 'EXCELLENT' THEN 6
          WHEN quality_rating = 'VERY_GOOD' THEN 5
          WHEN quality_rating = 'GOOD' THEN 4
          WHEN quality_rating = 'FAIR' THEN 3
          WHEN quality_rating = 'POOR' THEN 2
          WHEN quality_rating = 'FRAGMENTARY' THEN 1
          ELSE 0
        END
      ))::int
    ]::text,
    (ARRAY['UNIDENTIFIED', 'GUESS', 'UNCERTAIN', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY', 'CERTAIN'])[
      CEIL(AVG(
        CASE
          WHEN identification_confidence = 'CERTAIN' THEN 7
          WHEN identification_confidence = 'VERY_LIKELY' THEN 6
          WHEN identification_confidence = 'LIKELY' THEN 5
          WHEN identification_confidence = 'POSSIBLE' THEN 4
          WHEN identification_confidence = 'UNCERTAIN' THEN 3
          WHEN identification_confidence = 'GUESS' THEN 2
          WHEN identification_confidence = 'UNIDENTIFIED' THEN 1
          ELSE 0
        END
      ))::int
    ]::text
  FROM public.find_logs
  WHERE user_id = user_id AND state != 'DELETED';
END;
$$ LANGUAGE plpgsql;

-- Comment on table for documentation
COMMENT ON TABLE public.find_logs IS 'Individual finds/specimens logged during field sessions. Tracks material identification, quality, location, photos, and verification status.';

CREATE TRIGGER find_logs_timestamp_trigger
BEFORE UPDATE ON public.find_logs
FOR EACH ROW
EXECUTE FUNCTION update_find_logs_timestamp();

COMMENT ON COLUMN public.find_logs.material_type IS 'Type of material: MINERAL, ROCK, CRYSTAL, FOSSIL, GEODE, SPECIMEN, ORE, METEORITE, GEMSTONE, UNKNOWN';

COMMENT ON COLUMN public.find_logs.identification_confidence IS 'Confidence in material identification: CERTAIN, VERY_LIKELY, LIKELY, POSSIBLE, UNCERTAIN, GUESS, UNIDENTIFIED';

COMMENT ON COLUMN public.find_logs.quality_rating IS 'Condition quality rating: PRISTINE, EXCELLENT, VERY_GOOD, GOOD, FAIR, POOR, FRAGMENTARY';

COMMENT ON COLUMN public.find_logs.location_point IS 'PostGIS point for geospatial queries';

COMMENT ON COLUMN public.find_logs.state IS 'Find lifecycle state: DRAFT, SUBMITTED, VERIFIED, ARCHIVED, DELETED';

COMMENT ON COLUMN public.find_logs.sync_status IS 'Synchronization state: PENDING, SYNCING, APPLIED, CONFLICT, FAILED, RETRY_SCHEDULED';

COMMENT ON COLUMN public.find_logs.specimen_ids IS 'Array of linked Specimen entity IDs';

-- ==========================================
-- Source: 20260125000011_create_capture_sessions.sql
-- ==========================================

-- Rockhound CaptureSession Subsystem Database Migration
-- Date: 2026-01-25

-- ===================== ENUMS =====================
DO $$ BEGIN
  CREATE TYPE capture_session_type AS ENUM (
'PHOTO', 'VIDEO', 'BURST', 'PANORAMA', 'TIMELAPSE', 'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE capture_session_state AS ENUM (
'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPLIED', 'ARCHIVED', 'DELETED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE capture_sync_status AS ENUM (
'PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE capture_media_type AS ENUM (
'IMAGE', 'VIDEO', 'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE capture_lighting_condition AS ENUM (
'NATURAL', 'ARTIFICIAL', 'MIXED', 'LOW_LIGHT', 'FLASH', 'BACKLIT', 'UNKNOWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE capture_preprocessing_status AS ENUM (
'RAW', 'CROPPED', 'ENHANCED', 'CLASSIFIED', 'REJECTED', 'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


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

CREATE TABLE capture_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  event_data JSONB,
  occurred_at TIMESTAMP NOT NULL DEFAULT now()
);

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

CREATE MATERIALIZED VIEW preprocessing_metrics AS
SELECT
  pc.preprocessing,
  COUNT(*) AS processed_count
FROM processed_captures pc
GROUP BY pc.preprocessing;

CREATE MATERIALIZED VIEW classification_metrics AS
SELECT
  cr.pipeline_run_id,
  AVG(cr.confidence) AS avg_confidence,
  COUNT(*) AS classified_count
FROM classification_results cr
GROUP BY cr.pipeline_run_id;



-- FK-ordered deferred table block: specimens (from 20260124000002_create_collection_management.sql)

CREATE TABLE IF NOT EXISTS specimens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Provenance (links to field collection)
  find_log_id UUID REFERENCES find_logs(id) ON DELETE SET NULL,
  field_session_id UUID REFERENCES field_sessions(id) ON DELETE SET NULL,
  capture_session_id UUID REFERENCES capture_sessions(id) ON DELETE SET NULL,
  
  -- Basic information
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  variety TEXT,
  
  -- Specimen details
  specimen_number TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN (
    'FIELD_COLLECTED',    -- Found in field (linked to FindLog)
    'IN_TRANSIT',         -- Being transported home
    'RECEIVED',           -- Arrived home, needs processing
    'CLEANING',           -- Being cleaned/prepared
    'IDENTIFYING',        -- Undergoing identification
    'CATALOGING',         -- Being cataloged/documented
    'STORED',             -- In permanent storage
    'ON_DISPLAY',         -- Currently displayed
    'ON_LOAN',            -- Loaned to someone
    'IN_STUDIO',          -- In lapidary studio
    'SOLD',               -- Sold to collector
    'DONATED',            -- Donated to museum
    'LOST',               -- Lost or misplaced
    'DESTROYED'           -- Damaged beyond use
  )),
  condition TEXT NOT NULL CHECK (condition IN (
    'EXCELLENT',          -- Museum quality
    'VERY_GOOD',          -- Minor imperfections
    'GOOD',               -- Some wear, fully intact
    'FAIR',               -- Noticeable damage
    'POOR',               -- Significant damage
    'DAMAGED'             -- Heavily damaged
  )),
  
  -- Physical properties
  weight_grams DOUBLE PRECISION CHECK (weight_grams > 0),
  dimensions_length_mm DOUBLE PRECISION CHECK (dimensions_length_mm > 0),
  dimensions_width_mm DOUBLE PRECISION CHECK (dimensions_width_mm > 0),
  dimensions_height_mm DOUBLE PRECISION CHECK (dimensions_height_mm > 0),
  color TEXT,
  luster TEXT,
  transparency TEXT,
  crystal_system TEXT,
  
  -- Acquisition
  acquisition_method TEXT NOT NULL CHECK (acquisition_method IN (
    'FIELD_COLLECTED',    -- From FindLog
    'PURCHASED',          -- Bought
    'TRADED',             -- Traded
    'GIFTED',             -- Gift
    'INHERITED',          -- Inherited
    'UNKNOWN'             -- Unknown
  )),
  acquisition_date DATE NOT NULL,
  acquisition_cost DECIMAL(10,2) CHECK (acquisition_cost >= 0),
  acquisition_cost_currency CHAR(3),
  acquired_from TEXT,
  
  -- Location context
  collection_location TEXT,
  collection_site TEXT,
  collection_geom GEOGRAPHY(POINT, 4326),
  collection_lat DOUBLE PRECISION,
  collection_lon DOUBLE PRECISION,
  
  -- Storage
  storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  storage_position TEXT,
  
  -- Documentation
  title TEXT,
  description TEXT,
  notes TEXT,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  
  -- Scientific
  scientific_name TEXT,
  chemical_formula TEXT,
  hardness_mohs DECIMAL(3,1) CHECK (hardness_mohs >= 1 AND hardness_mohs <= 10),
  specific_gravity DOUBLE PRECISION CHECK (specific_gravity > 0),
  
  -- Valuation
  estimated_value DECIMAL(10,2) CHECK (estimated_value >= 0),
  estimated_value_currency CHAR(3),
  appraisal_date DATE,
  appraised_by TEXT,
  
  -- Lapidary Studio integration
  lapidary_project_id UUID,
  intended_use TEXT,
  
  -- Status flags
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_for_sale BOOLEAN NOT NULL DEFAULT false,
  is_for_trade BOOLEAN NOT NULL DEFAULT false,
  is_on_display BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  metadata JSONB,
  
  -- Event sourcing
  sequence_number INTEGER NOT NULL DEFAULT 0,
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'APPLIED', 'FAILED'
  )),
  sync_priority INTEGER NOT NULL DEFAULT 90,
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

CREATE INDEX idx_specimens_find_log_id ON specimens(find_log_id) WHERE find_log_id IS NOT NULL;

CREATE INDEX idx_specimens_field_session_id ON specimens(field_session_id) WHERE field_session_id IS NOT NULL;

CREATE INDEX idx_specimens_specimen_number ON specimens(specimen_number);

CREATE INDEX idx_specimens_material_id ON specimens(material_id);

CREATE INDEX idx_specimens_state ON specimens(state);

CREATE INDEX idx_specimens_storage_location_id ON specimens(storage_location_id) WHERE storage_location_id IS NOT NULL;

CREATE INDEX idx_specimens_sync ON specimens(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

CREATE INDEX idx_specimens_geom ON specimens USING GIST(collection_geom) WHERE collection_geom IS NOT NULL;

CREATE INDEX idx_specimens_user_created ON specimens(user_id, created_at DESC);

CREATE INDEX idx_specimens_is_favorite ON specimens(user_id, is_favorite) WHERE is_favorite = true;

CREATE INDEX idx_specimens_is_for_sale ON specimens(user_id, is_for_sale) WHERE is_for_sale = true;

-- Indexes for specimens
CREATE INDEX idx_specimens_user_id ON specimens(user_id);

COMMENT ON TABLE specimens IS 'Individual specimens in collection, linked to FindLog for provenance';

COMMENT ON COLUMN specimens.specimen_number IS 'Unique catalog number (e.g., QZ-2024-001)';

COMMENT ON COLUMN specimens.state IS 'Current state in specimen lifecycle state machine';

COMMENT ON COLUMN specimens.find_log_id IS 'Link to field collection FindLog for provenance tracking';

-- FK-ordered deferred table block: specimen_tags (from 20260124000002_create_collection_management.sql)

CREATE TABLE IF NOT EXISTS specimen_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'APPLIED', 'FAILED'
  )),
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_specimen_tag UNIQUE (specimen_id, tag_id)
);

CREATE INDEX idx_specimen_tags_tag ON specimen_tags(tag_id);

CREATE INDEX idx_specimen_tags_user ON specimen_tags(user_id);

-- Indexes for specimen_tags
CREATE INDEX idx_specimen_tags_specimen ON specimen_tags(specimen_id);

COMMENT ON TABLE specimen_tags IS 'Many-to-many relationship between specimens and tags';

-- FK-ordered deferred table block: collection_group_specimens (from 20260124000002_create_collection_management.sql)

CREATE TABLE IF NOT EXISTS collection_group_specimens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_group_id UUID NOT NULL REFERENCES collection_groups(id) ON DELETE CASCADE,
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  
  -- Organization
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  
  -- Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Sync metadata
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY' CHECK (sync_status IN (
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'APPLIED', 'FAILED'
  )),
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_collection_group_specimen UNIQUE (collection_group_id, specimen_id)
);

CREATE INDEX idx_collection_group_specimens_specimen ON collection_group_specimens(specimen_id);

CREATE INDEX idx_collection_group_specimens_user ON collection_group_specimens(user_id);

CREATE INDEX idx_collection_group_specimens_sort ON collection_group_specimens(collection_group_id, sort_order);

-- Indexes for collection_group_specimens
CREATE INDEX idx_collection_group_specimens_group ON collection_group_specimens(collection_group_id);

COMMENT ON TABLE collection_group_specimens IS 'Many-to-many relationship between collection groups and specimens';

-- dependency-ordered deferred view block: specimens_complete (from 20260124000002_create_collection_management.sql)

CREATE OR REPLACE VIEW specimens_complete AS
SELECT
  s.*,
  sl.name AS storage_location_name,
  sl.type AS storage_location_type,
  sl.code AS storage_location_code,
  fl.primary_name AS findlog_material_name,
  fl.created_at AS findlog_logged_at,
  ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL) AS tag_names,
  ARRAY_AGG(DISTINCT cg.name) FILTER (WHERE cg.id IS NOT NULL) AS collection_group_names
FROM specimens s
LEFT JOIN storage_locations sl ON s.storage_location_id = sl.id
LEFT JOIN find_logs fl ON s.find_log_id = fl.id
LEFT JOIN specimen_tags st ON s.id = st.specimen_id
LEFT JOIN tags t ON st.tag_id = t.id
LEFT JOIN collection_group_specimens cgs ON s.id = cgs.specimen_id
LEFT JOIN collection_groups cg ON cgs.collection_group_id = cg.id
GROUP BY s.id, sl.id, fl.id;

-- dependency-ordered deferred view block: collection_statistics (from 20260124000002_create_collection_management.sql)

CREATE OR REPLACE VIEW collection_statistics AS
SELECT
  user_id,
  COUNT(*) AS total_specimens,
  COUNT(*) FILTER (WHERE state = 'STORED') AS specimens_stored,
  COUNT(*) FILTER (WHERE state = 'ON_DISPLAY') AS specimens_on_display,
  COUNT(*) FILTER (WHERE state = 'IN_STUDIO') AS specimens_in_studio,
  COUNT(*) FILTER (WHERE is_favorite = true) AS favorite_specimens,
  COUNT(*) FILTER (WHERE is_for_sale = true) AS specimens_for_sale,
  COALESCE(SUM(weight_grams), 0) AS total_weight_grams,
  COALESCE(SUM(estimated_value), 0) AS total_estimated_value,
  COUNT(DISTINCT material_id) AS unique_materials,
  COUNT(DISTINCT storage_location_id) FILTER (WHERE storage_location_id IS NOT NULL) AS storage_locations_used
FROM specimens
GROUP BY user_id;

-- M0/Sprint-1 certification: collection analytics materialized views deferred (not required for foundation gate).
-- Recreate user_analytics_mv, storage_location_analytics_mv, tag_analytics_mv,
-- collection_group_analytics_mv, and material_analytics_mv in a post-M0 migration.


-- Deferred shared DDL tail (from 20260124000002_create_collection_management.sql)
-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_specimens_updated_at BEFORE UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set collection_geom from lat/lon
CREATE OR REPLACE FUNCTION set_specimen_collection_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.collection_lat IS NOT NULL AND NEW.collection_lon IS NOT NULL THEN
    NEW.collection_geom = ST_SetSRID(ST_MakePoint(NEW.collection_lon, NEW.collection_lat), 4326)::GEOGRAPHY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update storage_location current_count when specimen added/removed/moved
CREATE OR REPLACE FUNCTION update_storage_location_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Specimen added to location
    IF NEW.storage_location_id IS NOT NULL THEN
      UPDATE storage_locations
      SET current_count = current_count + 1
      WHERE id = NEW.storage_location_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Specimen moved
    IF OLD.storage_location_id IS DISTINCT FROM NEW.storage_location_id THEN
      -- Decrement old location
      IF OLD.storage_location_id IS NOT NULL THEN
        UPDATE storage_locations
        SET current_count = current_count - 1
        WHERE id = OLD.storage_location_id;
      END IF;
      -- Increment new location
      IF NEW.storage_location_id IS NOT NULL THEN
        UPDATE storage_locations
        SET current_count = current_count + 1
        WHERE id = NEW.storage_location_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Specimen removed from location
    IF OLD.storage_location_id IS NOT NULL THEN
      UPDATE storage_locations
      SET current_count = current_count - 1
      WHERE id = OLD.storage_location_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update tag specimen_count when specimen tagged/untagged
CREATE OR REPLACE FUNCTION update_tag_specimen_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags
    SET specimen_count = specimen_count + 1
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET specimen_count = specimen_count - 1
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update collection_group metrics when specimen added/removed
CREATE OR REPLACE FUNCTION update_collection_group_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_specimen_count INTEGER;
  v_total_weight DOUBLE PRECISION;
  v_total_value DECIMAL(12,2);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Recalculate for the collection group
    SELECT
      COUNT(*),
      COALESCE(SUM(s.weight_grams), 0),
      COALESCE(SUM(s.estimated_value), 0)
    INTO v_specimen_count, v_total_weight, v_total_value
    FROM collection_group_specimens cgs
    JOIN specimens s ON cgs.specimen_id = s.id
    WHERE cgs.collection_group_id = NEW.collection_group_id;
    
    UPDATE collection_groups
    SET
      specimen_count = v_specimen_count,
      total_weight_grams = v_total_weight,
      estimated_total_value = v_total_value
    WHERE id = NEW.collection_group_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalculate for the collection group
    SELECT
      COUNT(*),
      COALESCE(SUM(s.weight_grams), 0),
      COALESCE(SUM(s.estimated_value), 0)
    INTO v_specimen_count, v_total_weight, v_total_value
    FROM collection_group_specimens cgs
    JOIN specimens s ON cgs.specimen_id = s.id
    WHERE cgs.collection_group_id = OLD.collection_group_id;
    
    UPDATE collection_groups
    SET
      specimen_count = v_specimen_count,
      total_weight_grams = v_total_weight,
      estimated_total_value = v_total_value
    WHERE id = OLD.collection_group_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recalculate collection_group metrics when specimen weight/value changes
CREATE OR REPLACE FUNCTION recalculate_collection_group_metrics_on_specimen_update()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Only recalculate if weight or value changed
  IF OLD.weight_grams IS DISTINCT FROM NEW.weight_grams OR
     OLD.estimated_value IS DISTINCT FROM NEW.estimated_value THEN
    
    -- Update all collection groups containing this specimen
    FOR v_group_id IN
      SELECT collection_group_id
      FROM collection_group_specimens
      WHERE specimen_id = NEW.id
    LOOP
      PERFORM update_collection_group_metrics_for_group(v_group_id);
    END LOOP;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE specimens ENABLE ROW LEVEL SECURITY;

-- Specimens Policies
CREATE POLICY specimens_select_own ON specimens
  FOR SELECT USING (auth.uid() = user_id);

-- Storage Locations Policies
CREATE POLICY storage_locations_select_own ON storage_locations
  FOR SELECT USING (auth.uid() = user_id);

-- Tags Policies
CREATE POLICY tags_select_own ON tags
  FOR SELECT USING (auth.uid() = user_id);

-- Collection Groups Policies
CREATE POLICY collection_groups_select_own ON collection_groups
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- Specimen Tags Policies
CREATE POLICY specimen_tags_select_own ON specimen_tags
  FOR SELECT USING (auth.uid() = user_id);

-- Collection Group Specimens Policies
CREATE POLICY collection_group_specimens_select_own ON collection_group_specimens
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 10. FUNCTIONS
-- =====================================================

-- Get specimens within radius of a point
CREATE OR REPLACE FUNCTION get_specimens_within_radius(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  material_name TEXT,
  specimen_number TEXT,
  state TEXT,
  distance_m DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.material_name,
    s.specimen_number,
    s.state,
    ST_Distance(
      s.collection_geom,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::GEOGRAPHY
    ) AS distance_m,
    s.collection_lat,
    s.collection_lon,
    s.created_at
  FROM specimens s
  WHERE s.collection_geom IS NOT NULL
    AND ST_DWithin(
      s.collection_geom,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::GEOGRAPHY,
      p_radius_m
    )
  ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;

-- Get hierarchical storage path
CREATE OR REPLACE FUNCTION get_storage_path(p_location_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_path TEXT := '';
  v_current_id UUID := p_location_id;
  v_current_name TEXT;
  v_parent_id UUID;
BEGIN
  LOOP
    SELECT name, parent_location_id INTO v_current_name, v_parent_id
    FROM storage_locations
    WHERE id = v_current_id;
    
    IF v_current_name IS NULL THEN
      EXIT;
    END IF;
    
    IF v_path = '' THEN
      v_path := v_current_name;
    ELSE
      v_path := v_current_name || ' > ' || v_path;
    END IF;
    
    IF v_parent_id IS NULL THEN
      EXIT;
    END IF;
    
    v_current_id := v_parent_id;
  END LOOP;
  
  RETURN v_path;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. GRANTS
-- =====================================================

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON specimens TO authenticated;

-- Grant on views
GRANT SELECT ON specimens_complete TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_specimens_within_radius TO authenticated;

ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE collection_groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE specimen_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE collection_group_specimens ENABLE ROW LEVEL SECURITY;

CREATE POLICY specimens_insert_own ON specimens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY specimens_update_own ON specimens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY specimens_delete_own ON specimens
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY storage_locations_insert_own ON storage_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY storage_locations_update_own ON storage_locations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY storage_locations_delete_own ON storage_locations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY tags_insert_own ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tags_update_own ON tags
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY tags_delete_own ON tags
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY collection_groups_insert_own ON collection_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY collection_groups_update_own ON collection_groups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY collection_groups_delete_own ON collection_groups
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY specimen_tags_insert_own ON specimen_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY specimen_tags_delete_own ON specimen_tags
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY collection_group_specimens_insert_own ON collection_group_specimens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY collection_group_specimens_delete_own ON collection_group_specimens
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_collection_group_metrics_for_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
  v_specimen_count INTEGER;
  v_total_weight DOUBLE PRECISION;
  v_total_value DECIMAL(12,2);
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(s.weight_grams), 0),
    COALESCE(SUM(s.estimated_value), 0)
  INTO v_specimen_count, v_total_weight, v_total_value
  FROM collection_group_specimens cgs
  JOIN specimens s ON cgs.specimen_id = s.id
  WHERE cgs.collection_group_id = p_group_id;
  
  UPDATE collection_groups
  SET
    specimen_count = v_specimen_count,
    total_weight_grams = v_total_weight,
    estimated_total_value = v_total_value
  WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_groups_updated_at BEFORE UPDATE ON collection_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER increment_specimens_version BEFORE UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_storage_locations_version BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_tags_version BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_collection_groups_version BEFORE UPDATE ON collection_groups
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER set_specimens_collection_geom BEFORE INSERT OR UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION set_specimen_collection_geom();

CREATE TRIGGER update_storage_location_count_on_insert
AFTER INSERT ON specimens
FOR EACH ROW EXECUTE FUNCTION update_storage_location_count();

CREATE TRIGGER update_storage_location_count_on_update
AFTER UPDATE ON specimens
FOR EACH ROW EXECUTE FUNCTION update_storage_location_count();

CREATE TRIGGER update_storage_location_count_on_delete
AFTER DELETE ON specimens
FOR EACH ROW EXECUTE FUNCTION update_storage_location_count();

CREATE TRIGGER update_tag_specimen_count_on_insert
AFTER INSERT ON specimen_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_specimen_count();

CREATE TRIGGER update_tag_specimen_count_on_delete
AFTER DELETE ON specimen_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_specimen_count();

CREATE TRIGGER update_collection_group_metrics_on_insert
AFTER INSERT ON collection_group_specimens
FOR EACH ROW EXECUTE FUNCTION update_collection_group_metrics();

CREATE TRIGGER update_collection_group_metrics_on_delete
AFTER DELETE ON collection_group_specimens
FOR EACH ROW EXECUTE FUNCTION update_collection_group_metrics();

CREATE TRIGGER recalculate_collection_group_metrics_on_specimen_update
AFTER UPDATE ON specimens
FOR EACH ROW EXECUTE FUNCTION recalculate_collection_group_metrics_on_specimen_update();

COMMENT ON VIEW specimens_complete IS 'Complete view of specimens with storage, tags, and collection groups';

COMMENT ON VIEW collection_statistics IS 'Aggregate statistics for user collections';

COMMENT ON VIEW storage_capacity_status IS 'Storage location capacity and utilization status';

COMMENT ON FUNCTION get_specimens_within_radius IS 'Find specimens collected within radius (meters) of a point';

COMMENT ON FUNCTION get_storage_path IS 'Get hierarchical path for storage location (e.g., "Rock Room > Main Shelf > Red Box")';

GRANT SELECT, INSERT, UPDATE, DELETE ON storage_locations TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON collection_groups TO authenticated;

GRANT SELECT, INSERT, DELETE ON specimen_tags TO authenticated;

GRANT SELECT, INSERT, DELETE ON collection_group_specimens TO authenticated;

GRANT SELECT ON collection_statistics TO authenticated;

GRANT SELECT ON storage_capacity_status TO authenticated;

GRANT EXECUTE ON FUNCTION get_storage_path TO authenticated;

GRANT EXECUTE ON FUNCTION update_collection_group_metrics_for_group TO authenticated;

-- Deferred shared DDL tail (from 20260124000003_create_collection_analytics.sql)
CREATE INDEX idx_analytics_cache_cache_key ON analytics_cache(cache_key);

CREATE INDEX idx_analytics_cache_level ON analytics_cache(level);

CREATE INDEX idx_analytics_cache_entity_id ON analytics_cache(entity_id) WHERE entity_id IS NOT NULL;

CREATE INDEX idx_analytics_cache_status ON analytics_cache(status);

CREATE INDEX idx_analytics_cache_expires_at ON analytics_cache(expires_at);

CREATE INDEX idx_analytics_cache_accessed_at ON analytics_cache(accessed_at);

CREATE INDEX idx_analytics_update_events_entity_type ON analytics_update_events(entity_type);

CREATE INDEX idx_analytics_update_events_entity_id ON analytics_update_events(entity_id);

CREATE INDEX idx_analytics_update_events_processed ON analytics_update_events(processed) WHERE NOT processed;

CREATE INDEX idx_analytics_update_events_created_at ON analytics_update_events(created_at);

-- =====================================================
-- INDEXES
-- =====================================================

-- Analytics cache indexes
CREATE INDEX idx_analytics_cache_user_id ON analytics_cache(user_id);

-- Analytics update events indexes
CREATE INDEX idx_analytics_update_events_user_id ON analytics_update_events(user_id);

-- Materialized view indexes
-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps for analytics_cache
CREATE TRIGGER update_analytics_cache_updated_at
  BEFORE UPDATE ON analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update accessed_at when cache is read
CREATE OR REPLACE FUNCTION update_cache_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessed_at = NOW();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create analytics update event on specimen changes
CREATE OR REPLACE FUNCTION create_analytics_update_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO analytics_update_events (
    user_id,
    event_type,
    entity_type,
    entity_id,
    affected_levels,
    affected_entities
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    ARRAY['USER', 'STORAGE_LOCATION', 'TAG', 'COLLECTION_GROUP', 'MATERIAL']::analytics_level[],
    ARRAY[COALESCE(NEW.id::TEXT, OLD.id::TEXT)]
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on specimens table
CREATE TRIGGER create_analytics_update_event_specimens
  AFTER INSERT OR UPDATE OR DELETE ON specimens
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Trigger on storage_locations table
CREATE TRIGGER create_analytics_update_event_storage
  AFTER INSERT OR UPDATE OR DELETE ON storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Trigger on tags table
CREATE TRIGGER create_analytics_update_event_tags
  AFTER INSERT OR UPDATE OR DELETE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Trigger on collection_groups table
CREATE TRIGGER create_analytics_update_event_groups
  AFTER INSERT OR UPDATE OR DELETE ON collection_groups
  FOR EACH ROW
  EXECUTE FUNCTION create_analytics_update_event();

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  -- M0: collection analytics MVs deferred
  NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Analytics cache policies
CREATE POLICY "Users can view own analytics cache"
  ON analytics_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Analytics update events policies
CREATE POLICY "Users can view own analytics events"
  ON analytics_update_events FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get user analytics (from materialized view or cache)
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_analytics JSONB;
  v_cache_record RECORD;
BEGIN
  -- Check cache first
  SELECT * INTO v_cache_record
  FROM analytics_cache
  WHERE user_id = p_user_id
    AND level = 'USER'
    AND status = 'FRESH'
    AND expires_at > NOW();
  
  IF FOUND THEN
    RETURN v_cache_record.data;
  END IF;
  
  -- M0: user_analytics_mv deferred; no MV fallback
  
  -- Cache result
  IF v_analytics IS NOT NULL THEN
    INSERT INTO analytics_cache (
      user_id,
      cache_key,
      level,
      data,
      status,
      ttl_seconds,
      expires_at,
      calculation_time_ms,
      data_size_bytes
    ) VALUES (
      p_user_id,
      'USER',
      'USER',
      v_analytics,
      'FRESH',
      300,
      NOW() + INTERVAL '5 minutes',
      0,
      length(v_analytics::text)
    )
    ON CONFLICT (user_id, cache_key) DO UPDATE
    SET data = EXCLUDED.data,
        status = 'FRESH',
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
  END IF;
  
  RETURN v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invalidate analytics cache
CREATE OR REPLACE FUNCTION invalidate_analytics_cache(
  p_user_id UUID,
  p_level analytics_level,
  p_entity_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE analytics_cache
  SET status = 'STALE',
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND level = p_level
    AND (p_entity_id IS NULL OR entity_id = p_entity_id);
END;
$$ LANGUAGE plpgsql;

-- Process analytics update events
CREATE OR REPLACE FUNCTION process_analytics_update_events()
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_level analytics_level;
  v_processed_count INTEGER := 0;
BEGIN
  FOR v_event IN
    SELECT *
    FROM analytics_update_events
    WHERE NOT processed
    ORDER BY created_at
    LIMIT 100
  LOOP
    -- Invalidate caches for affected levels
    FOREACH v_level IN ARRAY v_event.affected_levels
    LOOP
      PERFORM invalidate_analytics_cache(
        v_event.user_id,
        v_level
      );
    END LOOP;
    
    -- Mark event as processed
    UPDATE analytics_update_events
    SET processed = TRUE,
        processed_at = NOW()
    WHERE id = v_event.id;
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE analytics_update_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics cache"
  ON analytics_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics cache"
  ON analytics_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analytics cache"
  ON analytics_cache FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics events"
  ON analytics_update_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics events"
  ON analytics_update_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_analytics_cache_accessed_at
  BEFORE UPDATE OF data ON analytics_cache
  FOR EACH ROW
  WHEN (OLD.data IS DISTINCT FROM NEW.data)
  EXECUTE FUNCTION update_cache_accessed_at();

-- Deferred shared DDL tail (from 20260125000011_create_capture_sessions.sql)
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

-- ===================== INDEXES (30+) =====================
CREATE INDEX idx_capture_sessions_user_id ON capture_sessions(user_id);

-- ===================== RLS POLICIES =====================
ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;

-- ===================== TRIGGERS =====================
-- Timestamp update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Media count update
CREATE OR REPLACE FUNCTION update_media_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.media_count = (SELECT COUNT(*) FROM raw_captures WHERE session_id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Preprocessing/classification status update
CREATE OR REPLACE FUNCTION update_preprocessing_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE processed_captures SET preprocessing = NEW.preprocessing WHERE raw_capture_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Event sourcing
CREATE OR REPLACE FUNCTION log_capture_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO capture_events (id, session_id, user_id, event_type, event_data, occurred_at)
  VALUES (gen_random_uuid(), NEW.id, NEW.user_id, TG_OP, row_to_json(NEW), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

ALTER TABLE raw_captures ENABLE ROW LEVEL SECURITY;

ALTER TABLE processed_captures ENABLE ROW LEVEL SECURITY;

ALTER TABLE classification_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE capture_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own capture_sessions" ON capture_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capture_sessions" ON capture_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capture_sessions" ON capture_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capture_sessions" ON capture_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own raw_captures" ON raw_captures FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own raw_captures" ON raw_captures FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own raw_captures" ON raw_captures FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own raw_captures" ON raw_captures FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own processed_captures" ON processed_captures FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processed_captures" ON processed_captures FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processed_captures" ON processed_captures FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own processed_captures" ON processed_captures FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own classification_results" ON classification_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own classification_results" ON classification_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classification_results" ON classification_results FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classification_results" ON classification_results FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select own capture_events" ON capture_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capture_events" ON capture_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capture_events" ON capture_events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capture_events" ON capture_events FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_capture_sessions_timestamp
  BEFORE UPDATE ON capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_count_trigger
  AFTER INSERT OR DELETE OR UPDATE ON raw_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_media_count();

CREATE TRIGGER update_preprocessing_status_trigger
  AFTER UPDATE OF preprocessing ON raw_captures
  FOR EACH ROW
  EXECUTE FUNCTION update_preprocessing_status();

CREATE TRIGGER log_capture_event_trigger
  AFTER INSERT OR UPDATE OR DELETE ON capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_capture_event();

-- ==========================================
-- Source: 20260126000001_add_get_enum_values_rpc.sql
-- ==========================================

-- Migration: Add get_enum_values RPC for Integrity Checks
-- Purpose: Support automated enum-drift detection in scripts/sync-enums.ts

CREATE OR REPLACE FUNCTION get_enum_values()
RETURNS TABLE (enum_name TEXT, enum_value TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.typname::text as enum_name,
    e.enumlabel::text as enum_value
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  ORDER BY enum_name, e.enumsortorder;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to service_role (used by sync-enums script)
GRANT EXECUTE ON FUNCTION get_enum_values() TO service_role;

COMMENT ON FUNCTION get_enum_values IS 'Returns all custom enum types and their values for integrity auditing';


-- ==========================================
-- Source: 20260326000001_harden_rls.sql
-- ==========================================

-- Hardening Migration: Enable RLS on core tables
-- Identified as missing by automated audit on 2026-03-26

-- 1. Enable RLS on all identified tables
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE geounits ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events_2026_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events_2026_02 ENABLE ROW LEVEL SECURITY;

-- 2. Implement Baseline Policies (Read-Only for Public, Admin for Write)

-- materials: Public READ, Admin WRITE
CREATE POLICY "Public can view materials" ON materials FOR SELECT USING (true);
CREATE POLICY "Only admins can modify materials" ON materials FOR ALL 
  TO authenticated USING (auth.jwt()->>'role' = 'admin');

-- rulesets: Public READ, Admin WRITE
CREATE POLICY "Public can view rulesets" ON rulesets FOR SELECT USING (true);
CREATE POLICY "Only admins can modify rulesets" ON rulesets FOR ALL 
  TO authenticated USING (auth.jwt()->>'role' = 'admin');

-- sources: Public READ, Admin WRITE
CREATE POLICY "Public can view sources" ON sources FOR SELECT USING (true);
CREATE POLICY "Only admins can modify sources" ON sources FOR ALL 
  TO authenticated USING (auth.jwt()->>'role' = 'admin');

-- geounits: Public READ, Admin WRITE
CREATE POLICY "Public can view geounits" ON geounits FOR SELECT USING (true);
CREATE POLICY "Only admins can modify geounits" ON geounits FOR ALL 
  TO authenticated USING (auth.jwt()->>'role' = 'admin');

-- locations: Public READ (only for approved), Admin WRITE
-- Note: locations table only contains approved records (Build Document Rule #6)
CREATE POLICY "Public can view locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Only admins can modify locations" ON locations FOR ALL 
  TO authenticated USING (auth.jwt()->>'role' = 'admin');

-- Relationship tables
CREATE POLICY "Public can view location_materials" ON location_materials FOR SELECT USING (true);
CREATE POLICY "Public can view location_rulesets" ON location_rulesets FOR SELECT USING (true);

-- Telemetry: Insert only
CREATE POLICY "Authenticated can insert telemetry" ON telemetry_events_2026_01 FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can insert telemetry" ON telemetry_events_2026_02 FOR INSERT TO authenticated WITH CHECK (true);


-- ==========================================
-- Source: 20260326000002_add_geohash.sql
-- ==========================================

-- Add geohash column for efficient clustering and prefix-based spatial queries
-- As recommended by Peer Review (Tier 1 Action)

-- 1. Create the populate_geohash function
CREATE OR REPLACE FUNCTION populate_geohash()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 12-character geohash from geometry point
  -- Convert geography to geometry for ST_GeoHash
  NEW.geohash = ST_GeoHash(NEW.geom::geometry, 12);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add geohash column to locations
ALTER TABLE locations ADD COLUMN geohash TEXT;
CREATE INDEX idx_locations_geohash ON locations (geohash);

-- 3. Add geohash column to locations_staging
ALTER TABLE locations_staging ADD COLUMN geohash TEXT;
CREATE INDEX idx_locations_staging_geohash ON locations_staging (geohash);

-- 4. Apply triggers to both tables
CREATE TRIGGER trg_locations_geohash 
  BEFORE INSERT OR UPDATE OF geom ON locations
  FOR EACH ROW EXECUTE FUNCTION populate_geohash();

CREATE TRIGGER trg_locations_staging_geohash 
  BEFORE INSERT OR UPDATE OF geom ON locations_staging
  FOR EACH ROW EXECUTE FUNCTION populate_geohash();

-- 5. Backfill existing data
UPDATE locations SET geohash = ST_GeoHash(geom::geometry, 12);
UPDATE locations_staging SET geohash = ST_GeoHash(geom::geometry, 12);

-- Comments
COMMENT ON COLUMN locations.geohash IS '12-char geohash for clustering and prefix-based spatial queries';


-- ==========================================
-- Source: 20260326000003_create_profiles.sql
-- ==========================================

-- Create profiles table and automatic creation trigger
-- As recommended by Peer Review (Tier 2 - Reputation System)

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  reputation_score INTEGER NOT NULL DEFAULT 100,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;



-- Deferred shared DDL tail (from 20260326000003_create_profiles.sql)
-- 3. Create a trigger to handle new user signups
-- This function will be called by a trigger on the auth.users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'username', 
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on auth.users
-- Note: Requires superuser permissions to apply to auth schema
-- In a standard Supabase environment, this is usually done via the dashboard or a migration with elevated privileges
-- We'll include it here for the local environment
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 5. Updated_at trigger
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.profiles IS 'Public user profiles - includes reputation scoring';

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

COMMENT ON COLUMN public.profiles.reputation_score IS 'Contributor reputation - affected by moderation history';

-- ==========================================
-- Source: 20260326000004_add_confidence_scoring.sql
-- ==========================================

-- Add confidence scoring and verification status to locations
-- As recommended by Peer Review (Tier 2 - Data Confidence)

-- 1. Add columns to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source_tier source_tier DEFAULT 'SECONDARY';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Add columns to locations_staging
ALTER TABLE locations_staging ADD COLUMN submission_confidence INTEGER DEFAULT 50 CHECK (submission_confidence BETWEEN 0 AND 100);

-- 3. Update existing data to defaults
UPDATE locations SET confidence_score = 100, is_verified = true WHERE source_tier = 'OFFICIAL';
UPDATE locations SET confidence_score = 70 WHERE source_tier = 'OPERATOR';
UPDATE locations SET confidence_score = 50 WHERE source_tier = 'SECONDARY';

-- Comments
COMMENT ON COLUMN locations.confidence_score IS 'Probabilistic trust score (0-100) for data accuracy';
COMMENT ON COLUMN locations.is_verified IS 'Explicit flag for sites verified by official sources or trusted moderators';


-- ==========================================
-- Source: 20260326000005_add_idempotency.sql
-- ==========================================

-- Add idempotency tracking to staging submissions
-- As recommended by Peer Review (Tier 2 - Sync Hardening)

-- 1. Add idempotency_key to locations_staging
ALTER TABLE locations_staging ADD COLUMN idempotency_key UUID;

-- 2. Add a UNIQUE constraint to prevent duplicate submissions
-- This ensures that if the client retries a sync due to timeout, the server rejects the duplicate
ALTER TABLE locations_staging ADD CONSTRAINT unique_submission_idempotency UNIQUE (idempotency_key);

-- 3. Add idempotency_key to observations
ALTER TABLE observations ADD COLUMN idempotency_key UUID;
ALTER TABLE observations ADD CONSTRAINT unique_observation_idempotency UNIQUE (idempotency_key);

-- Comments
COMMENT ON COLUMN locations_staging.idempotency_key IS 'Unique key sent by client to prevent duplicate submissions during sync retries';
COMMENT ON COLUMN observations.idempotency_key IS 'Unique key sent by client to prevent duplicate observations during sync retries';


-- ==========================================
-- Source: 20260326000006_moderation_v2.sql
-- ==========================================

-- Hardened Moderation v2 Migration
-- Addressing audit findings: Atomicity, Race Conditions, Identity Spoofing

-- 1. Extend profiles with administrative roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Create the Moderation Audit Log (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_id UUID REFERENCES public.locations_staging(id),
  moderator_id UUID REFERENCES auth.users(id),
  action TEXT CHECK (action IN ('APPROVE', 'REJECT')),
  reason TEXT,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit log (Admins only)
ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;



-- Deferred shared DDL tail (from 20260326000006_moderation_v2.sql)
-- 3. The v2 Moderation Engine (Postgres RPC)
CREATE OR REPLACE FUNCTION public.moderate_location_v2(
  p_staging_id BIGINT,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_moderator_id UUID;
  v_staging_record RECORD;
  v_new_location_id BIGINT;
  v_reputation_delta INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Identity Verification (Non-spoofable)
  v_moderator_id := auth.uid();
  IF v_moderator_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_moderator_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Forbidden: Admin role required';
  END IF;

  -- 2. Atomic Row Locking & State Check
  SELECT * INTO v_staging_record 
  FROM public.locations_staging 
  WHERE id = p_staging_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staging record % not found', p_staging_id;
  END IF;

  IF v_staging_record.moderation_status != 'PENDING' THEN
    RAISE EXCEPTION 'Record already moderated: status is %', v_staging_record.moderation_status;
  END IF;

  -- 3. Implementation Workflow (Atomic BEGIN)
  IF p_action = 'APPROVE' THEN
    -- A. Promote to Locations
    -- Note: This is an exact copy-insert, excluding metadata
    INSERT INTO public.locations (
      name, description, latitude, longitude, geom, geohash,
      legal_tag, source_tier, confidence_score, is_verified
    )
    VALUES (
      v_staging_record.name,
      v_staging_record.description,
      v_staging_record.latitude,
      v_staging_record.longitude,
      v_staging_record.geom,
      v_staging_record.geohash,
      v_staging_record.legal_tag,
      v_staging_record.source_tier,
      LEAST(100, COALESCE(v_staging_record.submission_confidence, 50) + 10),
      true
    )
    RETURNING id INTO v_new_location_id;

    -- B. Update Staging
    UPDATE public.locations_staging
    SET 
      moderation_status = 'APPROVED',
      reviewed_by = (SELECT username FROM public.profiles WHERE id = v_moderator_id),
      reviewed_at = now(),
      promoted_to_location_id = v_new_location_id
    WHERE id = p_staging_id;

    v_reputation_delta := 10;
    v_result := jsonb_build_object('location_id', v_new_location_id);

  ELSIF p_action = 'REJECT' THEN
    IF p_reason IS NULL OR length(p_reason) < 10 THEN
      RAISE EXCEPTION 'Rejection reason required (min 10 chars)';
    END IF;

    UPDATE public.locations_staging
    SET 
      moderation_status = 'REJECTED',
      reviewed_by = (SELECT username FROM public.profiles WHERE id = v_moderator_id),
      reviewed_at = now(),
      rejection_reason = p_reason
    WHERE id = p_staging_id;

    v_reputation_delta := -20;
    v_result := jsonb_build_object('location_id', NULL);

  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  -- C. Update Contributor Reputation
  IF v_staging_record.submitted_by IS NOT NULL THEN
    UPDATE public.profiles
    SET reputation_score = GREATEST(0, reputation_score + v_reputation_delta)
    WHERE id = v_staging_record.submitted_by;
  END IF;

  -- D. Secure Audit Entry
  INSERT INTO public.moderation_audit_log (
    staging_id, moderator_id, action, reason, old_status, new_status
  )
  VALUES (
    p_staging_id, v_moderator_id, p_action, p_reason, 'PENDING', p_action || 'D'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Moderation ' || p_action || 'D handled atomically',
    'status', p_action || 'D',
    'data', v_result
  );

EXCEPTION WHEN OTHERS THEN
  -- All changes rolled back automatically by Postgres
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

CREATE POLICY "Admins can view audit logs" ON public.moderation_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ==========================================
-- Source: 20260326000007_moderation_v2_hardening.sql
-- ==========================================

-- Hardened Moderation v2 Post-Audit Patch
-- Enforcing Audit Immutability and Duplicate Prevention

-- 1. Prevent Duplicate Promotion at Schema Level
-- Ensure a single staging record cannot be linked to multiple promoted locations
ALTER TABLE public.locations_staging 
ADD CONSTRAINT unique_promoted_location 
UNIQUE (promoted_to_location_id);

-- 2. Enforce Rejection Reason Requirement at Schema Level
ALTER TABLE public.locations_staging
ADD CONSTRAINT require_rejection_reason
CHECK (
  (moderation_status = 'REJECTED' AND rejection_reason IS NOT NULL AND length(rejection_reason) >= 10) OR
  (moderation_status != 'REJECTED')
);

-- 3. Audit Log Immutability (Tamper-Proof Ledger)
-- This ensures that even an admin cannot rewrite history after a moderation action is recorded
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Moderation audit logs are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
BEFORE UPDATE OR DELETE ON public.moderation_audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();

-- 4. Reputation Buffer
-- Ensure reputation score never drops below zero (already in RPC, but added as constraint for safety)
ALTER TABLE public.profiles
ADD CONSTRAINT valid_reputation_score
CHECK (reputation_score >= 0);

-- Comments
COMMENT ON TRIGGER enforce_audit_immutability ON public.moderation_audit_log IS 'Ensures that moderation history is tamper-proof and immutable';
COMMENT ON CONSTRAINT unique_promoted_location ON public.locations_staging IS 'Prevents the same submission from being promoted twice';


-- ==========================================
-- Source: 20260326000008_moderation_v2_ops_hardening.sql
-- ==========================================

-- Moderation v2 Operational Hardening
-- Adding real-path dark launch support and global kill-switches

-- 1. Create System Configuration Table
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);



-- Deferred shared DDL tail (from 20260326000008_moderation_v2_ops_hardening.sql)
INSERT INTO public.system_config (key, value)
VALUES ('moderation_v2_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Refactor moderate_location_v2 to support p_dry_run and kill-switch
CREATE OR REPLACE FUNCTION public.moderate_location_v2(
  p_staging_id BIGINT,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_moderator_id UUID;
  v_staging_record RECORD;
  v_new_location_id BIGINT;
  v_reputation_delta INTEGER;
  v_result JSONB;
  v_enabled BOOLEAN;
BEGIN
  -- 0. Global Operational Check (Kill-Switch)
  SELECT (value->>0)::BOOLEAN INTO v_enabled FROM public.system_config WHERE key = 'moderation_v2_enabled';
  IF v_enabled IS FALSE THEN
    RAISE EXCEPTION 'Moderation system is currently suspended for maintenance.';
  END IF;

  -- 1. Identity Verification
  v_moderator_id := auth.uid();
  IF v_moderator_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_moderator_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Forbidden: Admin role required';
  END IF;

  -- 2. Atomic Row Locking & State Check
  SELECT * INTO v_staging_record 
  FROM public.locations_staging 
  WHERE id = p_staging_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staging record % not found', p_staging_id;
  END IF;

  IF v_staging_record.moderation_status != 'PENDING' THEN
    RAISE EXCEPTION 'Record already moderated: status is %', v_staging_record.moderation_status;
  END IF;

  -- 3. Dry Run Validation Gate
  -- If dry run is active, we perform ALL logic (locking, validation) but skip the final writes.
  -- This validates concurrency contention and constraint logic without promoting data.
  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Dry run successful: All validations and locks passed.',
      'status', 'DRY_RUN_VALIDATED',
      'data', jsonb_build_object('location_id', null)
    );
  END IF;

  -- 4. Implementation Workflow (Atomic BEGIN)
  IF p_action = 'APPROVE' THEN
    INSERT INTO public.locations (
      name, description, latitude, longitude, geom, geohash,
      legal_tag, source_tier, confidence_score, is_verified
    )
    VALUES (
      v_staging_record.name,
      v_staging_record.description,
      v_staging_record.latitude,
      v_staging_record.longitude,
      v_staging_record.geom,
      v_staging_record.geohash,
      v_staging_record.legal_tag,
      v_staging_record.source_tier,
      LEAST(100, COALESCE(v_staging_record.submission_confidence, 50) + 10),
      true
    )
    RETURNING id INTO v_new_location_id;

    UPDATE public.locations_staging
    SET 
      moderation_status = 'APPROVED',
      reviewed_by = (SELECT username FROM public.profiles WHERE id = v_moderator_id),
      reviewed_at = now(),
      promoted_to_location_id = v_new_location_id
    WHERE id = p_staging_id;

    v_reputation_delta := 10;
    v_result := jsonb_build_object('location_id', v_new_location_id);

  ELSIF p_action = 'REJECT' THEN
    IF p_reason IS NULL OR length(p_reason) < 10 THEN
      RAISE EXCEPTION 'Rejection reason required (min 10 chars)';
    END IF;

    UPDATE public.locations_staging
    SET 
      moderation_status = 'REJECTED',
      reviewed_by = (SELECT username FROM public.profiles WHERE id = v_moderator_id),
      reviewed_at = now(),
      rejection_reason = p_reason
    WHERE id = p_staging_id;

    v_reputation_delta := -20;
    v_result := jsonb_build_object('location_id', NULL);

  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  -- 5. Update Contributor Reputation
  IF v_staging_record.submitted_by IS NOT NULL THEN
    UPDATE public.profiles
    SET reputation_score = GREATEST(0, reputation_score + v_reputation_delta)
    WHERE id = v_staging_record.submitted_by;
  END IF;

  -- 6. Secure Audit Entry
  INSERT INTO public.moderation_audit_log (
    staging_id, moderator_id, action, reason, old_status, new_status
  )
  VALUES (
    p_staging_id, v_moderator_id, p_action, p_reason, 'PENDING', p_action || 'D'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Moderation ' || p_action || 'D handled atomically',
    'status', p_action || 'D',
    'data', v_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

-- ==========================================
-- Source: 20260326000009_moderation_v2_idempotency_hardening.sql
-- ==========================================

-- Moderation v2 Idempotency Hardening
-- Enforcing transaction recovery for phantom commits

-- 1. Add idempotency_key to the audit ledger
ALTER TABLE public.moderation_audit_log 
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;

-- 2. Update moderate_location_v2 to support p_idempotency_key
CREATE OR REPLACE FUNCTION public.moderate_location_v2(
  p_staging_id BIGINT,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT false,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_moderator_id UUID;
  v_staging_record RECORD;
  v_new_location_id BIGINT;
  v_reputation_delta INTEGER;
  v_result JSONB;
  v_enabled BOOLEAN;
BEGIN
  -- 0. Operation Check
  SELECT (value->>0)::BOOLEAN INTO v_enabled FROM public.system_config WHERE key = 'moderation_v2_enabled';
  IF v_enabled IS FALSE THEN
    RAISE EXCEPTION 'Moderation suspended';
  END IF;

  -- 1. Idempotency Check (Immediate Exit if already processed)
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.moderation_audit_log WHERE idempotency_key = p_idempotency_key) THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Transaction already committed (Idempotent)',
        'status', 'IDEMPOTENT_SUCCESS'
      );
    END IF;
  END IF;

  -- 2. Identity Verification
  v_moderator_id := auth.uid();
  IF v_moderator_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_moderator_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- 3. Locking & State
  SELECT * INTO v_staging_record FROM public.locations_staging WHERE id = p_staging_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_staging_record.moderation_status != 'PENDING' THEN
    RAISE EXCEPTION 'Already moderated (%)', v_staging_record.moderation_status;
  END IF;

  -- 4. Dry Run
  IF p_dry_run THEN
    RETURN jsonb_build_object('success', true, 'status', 'DRY_RUN_VALIDATED');
  END IF;

  -- 5. Business Logic (Approval/Rejection)
  IF p_action = 'APPROVE' THEN
    INSERT INTO public.locations (name, description, latitude, longitude, geom, geohash, legal_tag, source_tier, confidence_score, is_verified)
    VALUES (v_staging_record.name, v_staging_record.description, v_staging_record.latitude, v_staging_record.longitude, v_staging_record.geom, v_staging_record.geohash, v_staging_record.legal_tag, v_staging_record.source_tier, LEAST(100, COALESCE(v_staging_record.submission_confidence, 50) + 10), true)
    RETURNING id INTO v_new_location_id;

    UPDATE public.locations_staging SET moderation_status = 'APPROVED', reviewed_by = (SELECT username FROM public.profiles WHERE id = v_moderator_id), reviewed_at = now(), promoted_to_location_id = v_new_location_id WHERE id = p_staging_id;
    v_reputation_delta := 10;
    v_result := jsonb_build_object('location_id', v_new_location_id);
  ELSIF p_action = 'REJECT' THEN
    IF p_reason IS NULL OR length(p_reason) < 10 THEN RAISE EXCEPTION 'Reason required'; END IF;
    UPDATE public.locations_staging SET moderation_status = 'REJECTED', reviewed_by = (SELECT username FROM public.profiles WHERE id = v_moderator_id), reviewed_at = now(), rejection_reason = p_reason WHERE id = p_staging_id;
    v_reputation_delta := -20;
    v_result := jsonb_build_object('location_id', NULL);
  ELSE
    RAISE EXCEPTION 'Invalid action';
  END IF;

  -- 6. Reputation & Audit
  UPDATE public.profiles SET reputation_score = GREATEST(0, reputation_score + v_reputation_delta) WHERE id = v_staging_record.submitted_by;
  
  INSERT INTO public.moderation_audit_log (staging_id, moderator_id, action, reason, old_status, new_status, idempotency_key)
  VALUES (p_staging_id, v_moderator_id, p_action, p_reason, 'PENDING', p_action || 'D', p_idempotency_key);

  RETURN jsonb_build_object('success', true, 'status', p_action || 'D', 'data', v_result);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ==========================================
-- Source: 20260415000001_foundation_hardening.sql
-- ==========================================

-- Rockhounding Project Foundation Hardening
-- Implements: Land Intelligence, Coordinate Privacy, and Access Rules

-- 1. Create Access Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_status') THEN
        CREATE TYPE public.access_status AS ENUM (
            'allowed',
            'caution',
            'restricted',
            'prohibited',
            'unknown'
        );
    END IF;
END $$;

-- 2. Update existing locations table to use hardened access intelligence
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'legal_tag'
  ) THEN
    ALTER TABLE locations RENAME COLUMN legal_tag TO access_status;
    ALTER TABLE locations ALTER COLUMN access_status TYPE access_status USING
      CASE
        WHEN access_status::text = 'LEGAL_PUBLIC' THEN 'allowed'::access_status
        WHEN access_status::text = 'LEGAL_FEE_SITE' THEN 'caution'::access_status
        WHEN access_status::text = 'LEGAL_CLUB_SUPERVISED' THEN 'caution'::access_status
        WHEN access_status::text = 'GRAY_AREA' THEN 'restricted'::access_status
        WHEN access_status::text = 'RESEARCH_ONLY' THEN 'prohibited'::access_status
        ELSE 'unknown'::access_status
      END;
  END IF;
END $$;

-- 3. Update existing locations_staging table
ALTER TABLE locations_staging RENAME COLUMN legal_tag TO access_status;
ALTER TABLE locations_staging ALTER COLUMN access_status TYPE access_status USING 
  CASE 
    WHEN access_status::text = 'LEGAL_PUBLIC' THEN 'allowed'::access_status
    WHEN access_status::text = 'LEGAL_FEE_SITE' THEN 'caution'::access_status
    WHEN access_status::text = 'LEGAL_CLUB_SUPERVISED' THEN 'caution'::access_status
    WHEN access_status::text = 'GRAY_AREA' THEN 'restricted'::access_status
    WHEN access_status::text = 'RESEARCH_ONLY' THEN 'prohibited'::access_status
    ELSE 'unknown'::access_status
  END;

-- 4. Create land access intelligence zones (PostGIS MultiPolygons)
CREATE TABLE land_access_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status public.access_status NOT NULL DEFAULT 'unknown',
    geom geography(MultiPolygon, 4326) NOT NULL,
    agency TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deferred shared DDL tail (from 20260415000001_foundation_hardening.sql)
CREATE INDEX IF NOT EXISTS idx_land_access_zones_geom ON public.land_access_zones USING GIST (geom);

-- 5. Hardened Coordinate Privacy: Fuzzy Location Views
-- Snaps coordinates to a ~1km grid for public display (0.01 deg)
ALTER TABLE find_logs 
  ADD COLUMN IF NOT EXISTS fuzzy_location geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS access_status public.access_status DEFAULT 'unknown';

CREATE OR REPLACE VIEW public.find_logs_public_summary AS
SELECT
  id,
  user_id,
  primary_name,
  material_type,
  quality_rating,
  fuzzy_location as location,
  access_status,
  created_at
FROM public.find_logs
WHERE is_private = false;

-- 6. Intelligence Engine: Automated Access Determination
CREATE OR REPLACE FUNCTION update_entry_intelligence()
RETURNS TRIGGER AS $$
DECLARE
    found_zone access_status;
BEGIN
    -- Spatial intersection with highest priority zone
    SELECT status INTO found_zone
    FROM land_access_zones
    WHERE ST_Intersects(land_access_zones.geom, NEW.geom)
    ORDER BY CASE 
        WHEN status = 'prohibited' THEN 1
        WHEN status = 'restricted' THEN 2
        WHEN status = 'caution' THEN 3
        WHEN status = 'allowed' THEN 4
        ELSE 5
    END ASC
    LIMIT 1;

    IF found_zone IS NOT NULL THEN
        NEW.access_status = found_zone;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Coordinate Privacy RLS
-- Existing policy gives owners full access. 
-- We need to ensure public access only sees fuzzy_location.

-- Re-harden RLS
ALTER TABLE public.find_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION compute_fuzzy_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fuzzy_location = ST_SetSRID(ST_MakePoint(
        ROUND(ST_X(NEW.location_point::geometry)::numeric, 2),
        ROUND(ST_Y(NEW.location_point::geometry)::numeric, 2)
    ), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fuzzy_location
BEFORE INSERT OR UPDATE OF location_point ON find_logs
FOR EACH ROW EXECUTE FUNCTION compute_fuzzy_location();

CREATE TRIGGER trigger_location_intelligence
BEFORE INSERT OR UPDATE OF geom ON locations
FOR EACH ROW EXECUTE FUNCTION update_entry_intelligence();

CREATE TRIGGER trigger_staging_intelligence
BEFORE INSERT OR UPDATE OF geom ON locations_staging
FOR EACH ROW EXECUTE FUNCTION update_entry_intelligence();

-- ==========================================
-- Source: 20260416000000_v1_contract_lock.sql
-- ==========================================

-- =====================================================
-- ROCKHOUNDING PROJECT: PHASE 1A â€” BACKEND CONTRACT LOCK
-- =====================================================
-- This migration establishes the production-grade schema foundation.
-- 1. Users/Profiles
-- 2. Regions
-- 3. Land Parcels
-- 4. Access Rules
-- 5. Locations
-- 6. Finds (Refactor of find_logs)
-- 7. Find Media
-- 8. Specimen Taxonomy (Hierarchical)
-- 9. Find Classifications
-- 10. Trips (Refactor of field_sessions)
-- 11. Trip Targets
-- 12. Moderation Cases
-- 13. Moderation Events
-- 14. Sync Operations (Idempotency)
-- 15. Embeddings (Vector)


-- =====================================================
-- 0. EXTENSIONS & ENUMS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- access_status enum emitted earlier (canonical v1 block)


DO $$ BEGIN
    CREATE TYPE public.sync_operation_status AS ENUM (
      'pending', 'processing', 'completed', 'failed', 'conflict', 'accepted', 'applied'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. USERS & PROFILES
-- =====================================================
-- Skipped duplicate table profiles

CREATE TABLE IF NOT EXISTS public.regions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    region_type text NOT NULL, -- 'state', 'county', 'agency_district'
    boundary geography(MULTIPOLYGON, 4326) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_regions_boundary ON public.regions USING GIST(boundary);

CREATE TABLE IF NOT EXISTS public.land_parcels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id text, -- Agency specific ID (e.g., APN)
    owner_name text,
    owner_type text, -- 'federal', 'state', 'private', 'indian_reservation'
    managing_agency text, -- 'BLM', 'USFS', 'NPS', etc.
    geom geography(MULTIPOLYGON, 4326) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_land_parcels_geom ON public.land_parcels USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.access_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id uuid REFERENCES public.land_parcels(id) ON DELETE CASCADE,
    region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
    status public.access_status NOT NULL DEFAULT 'unknown',
    rule_text text,
    authority_url text,
    last_verified_at timestamptz,
    confidence_metrics jsonb DEFAULT '{"score": 1.0, "source": "official_boundary"}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id uuid, -- Link to trips
    material_name text NOT NULL,
    material_taxonomy_id uuid, -- Link to specimen_taxonomy
    
    -- Geospatial (Privacy Safe)
    exact_location geography(POINT, 4326) NOT NULL,
    fuzzy_location geography(POINT, 4326),
    is_fuzzy boolean DEFAULT true,
    
    -- Confidence Breakdown
    confidence_metrics jsonb NOT NULL DEFAULT '{
        "identification": 1.0,
        "location": 1.0,
        "breakdown": { "visusal": 0.8, "expert": 0.0, "machine": 0.0 }
    }'::jsonb,
    
    notes text,
    discovered_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Idempotency
    client_operation_id uuid UNIQUE,
    idempotency_key text UNIQUE
);

ALTER TABLE public.finds ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.find_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    find_id uuid NOT NULL REFERENCES public.finds(id) ON DELETE CASCADE,
    storage_path text NOT NULL,
    media_type text NOT NULL, -- 'image', 'video', '3d_scan'
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specimen_taxonomy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES public.specimen_taxonomy(id),
    name text NOT NULL,
    scientific_name text,
    description text,
    chemical_formula text,
    hardness_min numeric,
    hardness_max numeric,
    luster text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.find_classifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    find_id uuid NOT NULL REFERENCES public.finds(id) ON DELETE CASCADE,
    classifier_id uuid REFERENCES auth.users(id), -- Null if AI
    classifier_type text NOT NULL, -- 'HUMAN', 'AI_V1', 'COMMUNITY'
    taxonomy_id uuid REFERENCES public.specimen_taxonomy(id),
    confidence_score numeric NOT NULL,
    breakdown jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    status text DEFAULT 'planned', -- 'planned', 'active', 'completed'
    path geography(LINESTRING, 4326),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    client_operation_id uuid UNIQUE
);

CREATE TABLE IF NOT EXISTS public.trip_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    location_id uuid REFERENCES public.locations(id),
    target_material_id uuid REFERENCES public.specimen_taxonomy(id),
    order_index integer,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type text NOT NULL, -- 'location', 'find', 'user'
    target_id uuid NOT NULL,
    reporter_id uuid REFERENCES auth.users(id),
    reason_code text NOT NULL,
    status text DEFAULT 'open', -- 'open', 'assigned', 'resolved', 'closed'
    assigned_to uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
    moderator_id uuid REFERENCES auth.users(id),
    event_type text NOT NULL, -- 'COMMENT', 'DECISION', 'ASSIGNMENT'
    decision text, -- 'APPROVE', 'REJECT', 'FLAG'
    comment text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_operation_id uuid UNIQUE NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    entity_type text NOT NULL,
    operation_type text NOT NULL, -- 'create', 'update', 'delete'
    status public.sync_operation_status DEFAULT 'pending',
    payload jsonb,
    error_details text,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sync_client_op ON public.sync_operations(client_operation_id);

CREATE TABLE IF NOT EXISTS public.embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type text NOT NULL, -- 'location', 'find', 'taxonomy'
    target_id uuid NOT NULL,
    embedding vector(1536), -- Standard OpenAI/Gemini size
    content_snapshot text, -- Text representation used for embedding
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_embeddings_vector ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);



-- Deferred shared DDL tail (from 20260416000000_v1_contract_lock.sql)
-- =====================================================
-- V. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-fill fuzzy_geom for locations
CREATE OR REPLACE FUNCTION compute_fuzzy_location_v1()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fuzzy_geom = ST_SetSRID(
        ST_MakePoint(
            ROUND(ST_X(NEW.geom::geometry)::numeric, 2), -- ~1.1km grid at equator
            ROUND(ST_Y(NEW.geom::geometry)::numeric, 2)
        ),
        4326
    )::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Similarly for finds
CREATE OR REPLACE FUNCTION compute_find_fuzzy_location_v1()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fuzzy_location = ST_SetSRID(
        ST_MakePoint(
            ROUND(ST_X(NEW.exact_location::geometry)::numeric, 2),
            ROUND(ST_Y(NEW.exact_location::geometry)::numeric, 2)
        ),
        4326
    )::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE POLICY "Users can only see exact location of their own finds" 
    ON public.finds FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER trigger_fuzzy_location_v1
BEFORE INSERT OR UPDATE OF geom ON public.locations
FOR EACH ROW EXECUTE FUNCTION compute_fuzzy_location_v1();

CREATE TRIGGER trigger_find_fuzzy_location_v1
BEFORE INSERT OR UPDATE OF exact_location ON public.finds
FOR EACH ROW EXECUTE FUNCTION compute_find_fuzzy_location_v1();

-- ==========================================
-- Source: 20260416000001_align_sync_statuses.sql
-- ==========================================

-- ALIGN SYNC STATUSES WITH V1 CONTRACT
-- V1 values (accepted, applied) are included in sync_operation_status at creation time.
-- Legacy value migration (processing->accepted, completed->applied) runs in a separate
-- migration if upgrading an existing database; skipped on fresh baseline apply.



-- ==========================================
-- Source: 20260416000002_harden_access_intelligence.sql
-- ==========================================

-- HARDEN ACCESS INTELLIGENCE FOUNDATION (HARD CONTRACT V2)

-- 1. Ensure Metadata Columns Exist
ALTER TABLE public.access_rules 
ADD COLUMN IF NOT EXISTS authority_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'official',
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS priority_weight integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS managing_agency text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. ACCESS RESOLUTION RPC (V2)
CREATE OR REPLACE FUNCTION public.rpc_check_access_v2(
    p_lat numeric, 
    p_lon numeric, 
    p_material_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_point geography;
    v_parcel_info record;
    v_best_rule record;
    v_conflict_rule record;
    v_conflicts text[] := '{}';
    v_reason_codes text[] := '{}';
    v_legal_state public.access_status;
    v_advisory_level text;
    v_confidence numeric := 1.0;
    
    -- Penalties
    v_p_boundary numeric := 0.0;
    v_p_presence numeric := 0.0;
    v_p_staleness numeric := 0.0;
    v_p_conflict numeric := 0.0;
    
    v_boundary_match text := 'none';
    v_days_stale integer;
    v_severity_gap integer := 0;
BEGIN
    v_point := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;

    -- A. SPATIAL SELECTION: SMALL PARCEL BEATS LARGE REGION
    -- Selection Rule: Parcel > Region. Tie-break: Priority > Authority > Smallest Area.
    SELECT id, owner_name, managing_agency, owner_type 
    INTO v_parcel_info
    FROM public.land_parcels
    WHERE ST_Intersects(geom, v_point)
    ORDER BY ST_Area(geom) ASC  -- Smallest parcel is usually the most specific
    LIMIT 1;

    IF v_parcel_info.id IS NOT NULL THEN
        v_boundary_match := 'parcel';
        v_reason_codes := array_append(v_reason_codes, 'parcel_intercept');
    ELSE
        -- Check if any region contains it
        IF EXISTS (SELECT 1 FROM public.regions r WHERE ST_Intersects(r.boundary, v_point)) THEN
           v_boundary_match := 'region';
           v_p_boundary := -0.1;
           v_reason_codes := array_append(v_reason_codes, 'region_intercept_only');
        ELSE
           v_boundary_match := 'none';
           v_p_boundary := -0.4;
           v_reason_codes := array_append(v_reason_codes, 'blank_slate_exposure');
        END IF;
    END IF;

    -- B. RESOLVE BEST RULE
    -- Ranking: prohibited(5), restricted(4), caution(3), allowed(2), unknown(1)
    WITH candidates AS (
        SELECT 
            ar.*,
            CASE ar.status
                WHEN 'prohibited' THEN 5
                WHEN 'restricted' THEN 4
                WHEN 'caution' THEN 3
                WHEN 'allowed' THEN 2
                WHEN 'unknown' THEN 1
            END as severity_rank,
            CASE WHEN ar.parcel_id IS NOT NULL THEN 2 ELSE 1 END as granularity_rank
        FROM public.access_rules ar
        LEFT JOIN public.regions r ON ar.region_id = r.id
        WHERE 
            (ar.parcel_id = v_parcel_info.id)
            OR (ar.region_id IS NOT NULL AND ST_Intersects(r.boundary, v_point))
    ),
    prioritized AS (
        SELECT *,
            ROW_NUMBER() OVER (
                ORDER BY 
                    granularity_rank DESC,   -- 1. Parcel beats Region
                    priority_weight DESC,    -- 2. Explicit Priority
                    authority_level DESC,    -- 3. Authority
                    severity_rank DESC,      -- 4. Safety First (Restrictive)
                    last_verified_at DESC    -- 5. Freshness
            ) as rank
        FROM candidates
        WHERE (p_material_id IS NULL AND ar.metadata->>'material_id' IS NULL)
           OR (p_material_id IS NOT NULL AND (ar.metadata->>'material_id' = p_material_id::text OR ar.metadata->>'material_id' IS NULL))
    )
    SELECT * INTO v_best_rule FROM prioritized WHERE rank = 1;

    -- C. CALCULATE PENALTIES
    -- 1. Rule Presence
    IF v_best_rule.id IS NULL THEN
        v_p_presence := -0.2;
        v_legal_state := 'unknown';
        v_advisory_level := CASE WHEN v_boundary_match = 'none' THEN 'warning' ELSE 'caution' END;
        v_reason_codes := array_append(v_reason_codes, 'no_explicit_rule');
    ELSE
        v_legal_state := v_best_rule.status;
        v_advisory_level := CASE 
            WHEN v_legal_state = 'prohibited' THEN 'critical'
            WHEN v_legal_state = 'restricted' THEN 'warning'
            WHEN v_legal_state = 'caution' THEN 'caution'
            ELSE 'safe'
        END;
        
        -- 2. Staleness
        IF v_best_rule.last_verified_at IS NULL THEN
            v_p_staleness := -0.2;
            v_reason_codes := array_append(v_reason_codes, 'verification_missing');
        ELSE
            v_days_stale := EXTRACT(DAY FROM now() - v_best_rule.last_verified_at)::integer;
            IF v_days_stale > 90 THEN
                v_p_staleness := -0.2;
                v_reason_codes := array_append(v_reason_codes, 'data_obs_archived');
            ELSIF v_days_stale > 30 THEN
                v_p_staleness := -0.1;
                v_reason_codes := array_append(v_reason_codes, 'data_stale');
            END IF;
        END IF;

        -- 3. Conflicts (Severity Gap >= 2)
        -- Check for other rules that might contradict
        SELECT ar.status, ar.managing_agency, 
            CASE ar.status
                WHEN 'prohibited' THEN 5
                WHEN 'restricted' THEN 4
                WHEN 'caution' THEN 3
                WHEN 'allowed' THEN 2
                WHEN 'unknown' THEN 1
            END as severity_rank
        INTO v_conflict_rule
        FROM public.access_rules ar
        LEFT JOIN public.regions r ON ar.region_id = r.id
        WHERE (ar.parcel_id = v_parcel_info.id OR (ar.region_id IS NOT NULL AND ST_Intersects(r.boundary, v_point)))
          AND ar.id != v_best_rule.id
        ORDER BY ABS(v_best_rule.severity_rank - CASE WHEN ar.status='prohibited' THEN 5 WHEN ar.status='restricted' THEN 4 WHEN ar.status='caution' THEN 3 WHEN ar.status='allowed' THEN 2 ELSE 1 END) DESC
        LIMIT 1;

        IF v_conflict_rule.status IS NOT NULL THEN
            v_severity_gap := ABS(v_best_rule.severity_rank - v_conflict_rule.severity_rank);
            IF v_severity_gap >= 2 THEN
                v_p_conflict := -0.3;
                v_conflicts := array_append(v_conflicts, 'major_severity_gap');
            ELSIF v_conflict_rule.managing_agency != v_best_rule.managing_agency THEN
                v_p_conflict := -0.2;
                v_conflicts := array_append(v_conflicts, 'authority_mismatch');
            END IF;
        END IF;
    END IF;

    -- D. CLAMP & RETURN
    v_confidence := GREATEST(0.0, LEAST(1.0, 1.0 + v_p_boundary + v_p_presence + v_p_staleness + v_p_conflict));

    RETURN jsonb_build_object(
        'legalState', v_legal_state,
        'advisoryLevel', v_advisory_level,
        'confidence', v_confidence,
        'confidenceBreakdown', jsonb_build_object(
            'boundary', v_p_boundary,
            'rule_presence', v_p_presence,
            'staleness', v_p_staleness,
            'conflict', v_p_conflict
        ),
        'parcel_info', CASE WHEN v_parcel_info.id IS NOT NULL THEN jsonb_build_object(
            'id', v_parcel_info.id,
            'owner', v_parcel_info.owner_name,
            'agency', v_parcel_info.managing_agency,
            'owner_type', v_parcel_info.owner_type,
            'managing_agency', v_parcel_info.managing_agency
        ) ELSE NULL END,
        'evidence', jsonb_build_object(
            'boundaryMatch', v_boundary_match,
            'appliedRule', v_best_rule.id,
            'conflicts', v_conflicts,
            'reasonCodes', v_reason_codes
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ==========================================
-- Source: 20260416000003_verify_access_hard_contract.sql
-- ==========================================
-- M0: access hard-contract verification scripts deferred to docs/qa (not migration DDL).

-- ==========================================
-- Source: 20260416000005_conflict_priority_test.sql
-- ==========================================
-- M0: conflict-priority certification tests deferred to docs/qa (not migration DDL).


-- ==========================================
-- Source: 20260416000006_align_applied_constraints.sql
-- ==========================================

-- Migration: Align sync_status constraints with V1 Contract
-- Drop specific old constraints and replace them to allow 'APPLIED'.
-- Normalize existing 'APPLIED' strings to 'APPLIED'.


-- 1. Drop existing CHECK constraints explicitly by name
-- We only drop the exact constraints we intend to recreate.
ALTER TABLE IF EXISTS field_sessions DROP CONSTRAINT IF EXISTS field_sessions_sync_status_check;
ALTER TABLE IF EXISTS find_logs DROP CONSTRAINT IF EXISTS find_logs_sync_status_check;
ALTER TABLE IF EXISTS session_events DROP CONSTRAINT IF EXISTS session_events_sync_status_check;
ALTER TABLE IF EXISTS raw_captures DROP CONSTRAINT IF EXISTS raw_captures_sync_status_check;
ALTER TABLE IF EXISTS specimens DROP CONSTRAINT IF EXISTS specimens_sync_status_check;
ALTER TABLE IF EXISTS storage_locations DROP CONSTRAINT IF EXISTS storage_locations_sync_status_check;
ALTER TABLE IF EXISTS tags DROP CONSTRAINT IF EXISTS tags_sync_status_check;
ALTER TABLE IF EXISTS collection_groups DROP CONSTRAINT IF EXISTS collection_groups_sync_status_check;

-- 2. Legacy enum renames (only when upgrading pre-V1 databases)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'sync_status' AND e.enumlabel = 'synced'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'sync_status' AND e.enumlabel = 'applied'
    ) THEN
        ALTER TYPE sync_status RENAME VALUE 'synced' TO 'applied';
    END IF;
END $$;

-- 3. Normalize legacy sync_status text values (only on tables that have the column)
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'field_sessions', 'find_logs', 'session_events', 'specimens',
    'storage_locations', 'tags', 'collection_groups'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'sync_status'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET sync_status = %L WHERE sync_status IN (%L, %L)',
        v_table, 'APPLIED', 'APPLIED', 'synced'
      );
    END IF;
  END LOOP;
END $$;

-- 4. Re-add check constraints supporting 'APPLIED' only when sync_status column exists
DO $$
DECLARE
  v_table text;
  v_constraint text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'field_sessions', 'find_logs', 'session_events', 'specimens',
    'storage_locations', 'tags', 'collection_groups'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'sync_status'
    ) THEN
      v_constraint := v_table || '_sync_status_check';
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', v_table, v_constraint);
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (sync_status IN (%L, %L, %L, %L, %L, %L, %L, %L))',
        v_table, v_constraint,
        'PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'
      );
    END IF;
  END LOOP;
END $$;





