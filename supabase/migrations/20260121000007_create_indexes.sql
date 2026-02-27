-- Performance indexes per Build Document requirements
-- CRITICAL: GIST index on locations.geom for bbox queries
-- REQUIRED: btree indexes on state, legal_tag, access_model, updated_at

-- =============================================================================
-- SPATIAL INDEXES (GIST)
-- =============================================================================

-- PRIMARY REQUIREMENT: locations.geom GIST index for bbox queries
-- This is the most critical index for map browsing performance
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

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
CREATE INDEX idx_locations_state ON locations (state);
CREATE INDEX idx_locations_legal_tag ON locations (legal_tag);
CREATE INDEX idx_locations_access_model ON locations (access_model);
CREATE INDEX idx_locations_updated_at ON locations (updated_at);

-- Additional common filters from API contract
CREATE INDEX idx_locations_difficulty ON locations (difficulty);
CREATE INDEX idx_locations_kid_friendly ON locations (kid_friendly);
CREATE INDEX idx_locations_status ON locations (status);
CREATE INDEX idx_locations_source_tier ON locations (source_tier);

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
CREATE INDEX idx_locations_legal_status ON locations (legal_tag, status, updated_at);

-- State + material filtering (common user query)
CREATE INDEX idx_locations_state_difficulty ON locations (state, difficulty);

-- Comments
COMMENT ON INDEX idx_locations_geom IS 'CRITICAL: GIST index for bbox queries - primary map browsing performance';
COMMENT ON INDEX idx_locations_state IS 'REQUIRED: btree index per Build Document';
COMMENT ON INDEX idx_locations_legal_tag IS 'REQUIRED: btree index per Build Document';
COMMENT ON INDEX idx_locations_access_model IS 'REQUIRED: btree index per Build Document';
COMMENT ON INDEX idx_locations_updated_at IS 'REQUIRED: btree index per Build Document';
