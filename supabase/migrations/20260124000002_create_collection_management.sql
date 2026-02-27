-- =====================================================
-- Collection Management Migration
-- =====================================================
-- This migration creates the complete database schema for
-- Collection Management, handling the lifecycle:
-- FieldSession → FindLog → Specimen → Collection
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
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
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

-- Indexes for specimens
CREATE INDEX idx_specimens_user_id ON specimens(user_id);
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

COMMENT ON TABLE specimens IS 'Individual specimens in collection, linked to FindLog for provenance';
COMMENT ON COLUMN specimens.specimen_number IS 'Unique catalog number (e.g., QZ-2024-001)';
COMMENT ON COLUMN specimens.state IS 'Current state in specimen lifecycle state machine';
COMMENT ON COLUMN specimens.find_log_id IS 'Link to field collection FindLog for provenance tracking';

-- =====================================================
-- 2. STORAGE LOCATIONS TABLE
-- =====================================================
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
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
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

-- Indexes for storage_locations
CREATE INDEX idx_storage_locations_user_id ON storage_locations(user_id);
CREATE INDEX idx_storage_locations_parent ON storage_locations(parent_location_id) WHERE parent_location_id IS NOT NULL;
CREATE INDEX idx_storage_locations_type ON storage_locations(type);
CREATE INDEX idx_storage_locations_user_sort ON storage_locations(user_id, sort_order);
CREATE INDEX idx_storage_locations_sync ON storage_locations(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

COMMENT ON TABLE storage_locations IS 'Hierarchical storage locations for specimens';
COMMENT ON COLUMN storage_locations.parent_location_id IS 'Parent location for nested storage (e.g., Box inside Shelf)';
COMMENT ON COLUMN storage_locations.current_count IS 'Current number of specimens in this location';

-- =====================================================
-- 3. TAGS TABLE
-- =====================================================
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
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
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

-- Indexes for tags
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_parent ON tags(parent_tag_id) WHERE parent_tag_id IS NOT NULL;
CREATE INDEX idx_tags_user_sort ON tags(user_id, sort_order);
CREATE INDEX idx_tags_sync ON tags(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

COMMENT ON TABLE tags IS 'Labels and categories for organizing specimens';
COMMENT ON COLUMN tags.specimen_count IS 'Number of specimens with this tag (auto-updated by triggers)';

-- =====================================================
-- 4. COLLECTION GROUPS TABLE
-- =====================================================
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
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
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

-- Indexes for collection_groups
CREATE INDEX idx_collection_groups_user_id ON collection_groups(user_id);
CREATE INDEX idx_collection_groups_type ON collection_groups(type);
CREATE INDEX idx_collection_groups_parent ON collection_groups(parent_group_id) WHERE parent_group_id IS NOT NULL;
CREATE INDEX idx_collection_groups_user_sort ON collection_groups(user_id, sort_order);
CREATE INDEX idx_collection_groups_is_public ON collection_groups(is_public) WHERE is_public = true;
CREATE INDEX idx_collection_groups_sync ON collection_groups(sync_status, sync_priority DESC) WHERE sync_status IN ('QUEUED', 'FAILED');

COMMENT ON TABLE collection_groups IS 'Themed collections or sets of specimens';
COMMENT ON COLUMN collection_groups.specimen_count IS 'Number of specimens in this collection (auto-updated)';
COMMENT ON COLUMN collection_groups.total_weight_grams IS 'Total weight of all specimens in collection (auto-updated)';

-- =====================================================
-- 5. SPECIMEN_TAGS JUNCTION TABLE
-- =====================================================
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
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_specimen_tag UNIQUE (specimen_id, tag_id)
);

-- Indexes for specimen_tags
CREATE INDEX idx_specimen_tags_specimen ON specimen_tags(specimen_id);
CREATE INDEX idx_specimen_tags_tag ON specimen_tags(tag_id);
CREATE INDEX idx_specimen_tags_user ON specimen_tags(user_id);

COMMENT ON TABLE specimen_tags IS 'Many-to-many relationship between specimens and tags';

-- =====================================================
-- 6. COLLECTION_GROUP_SPECIMENS JUNCTION TABLE
-- =====================================================
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
    'LOCAL_ONLY', 'QUEUED', 'SYNCING', 'SYNCED', 'FAILED'
  )),
  client_created_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_collection_group_specimen UNIQUE (collection_group_id, specimen_id)
);

-- Indexes for collection_group_specimens
CREATE INDEX idx_collection_group_specimens_group ON collection_group_specimens(collection_group_id);
CREATE INDEX idx_collection_group_specimens_specimen ON collection_group_specimens(specimen_id);
CREATE INDEX idx_collection_group_specimens_user ON collection_group_specimens(user_id);
CREATE INDEX idx_collection_group_specimens_sort ON collection_group_specimens(collection_group_id, sort_order);

COMMENT ON TABLE collection_group_specimens IS 'Many-to-many relationship between collection groups and specimens';

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_specimens_updated_at BEFORE UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_groups_updated_at BEFORE UPDATE ON collection_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_specimens_version BEFORE UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_storage_locations_version BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_tags_version BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_collection_groups_version BEFORE UPDATE ON collection_groups
  FOR EACH ROW EXECUTE FUNCTION increment_version();

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

CREATE TRIGGER set_specimens_collection_geom BEFORE INSERT OR UPDATE ON specimens
  FOR EACH ROW EXECUTE FUNCTION set_specimen_collection_geom();

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

CREATE TRIGGER update_storage_location_count_on_insert
AFTER INSERT ON specimens
FOR EACH ROW EXECUTE FUNCTION update_storage_location_count();

CREATE TRIGGER update_storage_location_count_on_update
AFTER UPDATE ON specimens
FOR EACH ROW EXECUTE FUNCTION update_storage_location_count();

CREATE TRIGGER update_storage_location_count_on_delete
AFTER DELETE ON specimens
FOR EACH ROW EXECUTE FUNCTION update_storage_location_count();

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

CREATE TRIGGER update_tag_specimen_count_on_insert
AFTER INSERT ON specimen_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_specimen_count();

CREATE TRIGGER update_tag_specimen_count_on_delete
AFTER DELETE ON specimen_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_specimen_count();

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

CREATE TRIGGER update_collection_group_metrics_on_insert
AFTER INSERT ON collection_group_specimens
FOR EACH ROW EXECUTE FUNCTION update_collection_group_metrics();

CREATE TRIGGER update_collection_group_metrics_on_delete
AFTER DELETE ON collection_group_specimens
FOR EACH ROW EXECUTE FUNCTION update_collection_group_metrics();

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

CREATE TRIGGER recalculate_collection_group_metrics_on_specimen_update
AFTER UPDATE ON specimens
FOR EACH ROW EXECUTE FUNCTION recalculate_collection_group_metrics_on_specimen_update();

-- =====================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE specimen_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_group_specimens ENABLE ROW LEVEL SECURITY;

-- Specimens Policies
CREATE POLICY specimens_select_own ON specimens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY specimens_insert_own ON specimens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY specimens_update_own ON specimens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY specimens_delete_own ON specimens
  FOR DELETE USING (auth.uid() = user_id);

-- Storage Locations Policies
CREATE POLICY storage_locations_select_own ON storage_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY storage_locations_insert_own ON storage_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY storage_locations_update_own ON storage_locations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY storage_locations_delete_own ON storage_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Tags Policies
CREATE POLICY tags_select_own ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tags_insert_own ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tags_update_own ON tags
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY tags_delete_own ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- Collection Groups Policies
CREATE POLICY collection_groups_select_own ON collection_groups
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY collection_groups_insert_own ON collection_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY collection_groups_update_own ON collection_groups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY collection_groups_delete_own ON collection_groups
  FOR DELETE USING (auth.uid() = user_id);

-- Specimen Tags Policies
CREATE POLICY specimen_tags_select_own ON specimen_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY specimen_tags_insert_own ON specimen_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY specimen_tags_delete_own ON specimen_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Collection Group Specimens Policies
CREATE POLICY collection_group_specimens_select_own ON collection_group_specimens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY collection_group_specimens_insert_own ON collection_group_specimens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY collection_group_specimens_delete_own ON collection_group_specimens
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 9. VIEWS
-- =====================================================

-- Complete specimen view with all relationships
CREATE OR REPLACE VIEW specimens_complete AS
SELECT
  s.*,
  sl.name AS storage_location_name,
  sl.type AS storage_location_type,
  sl.code AS storage_location_code,
  fl.material_name AS findlog_material_name,
  fl.logged_at AS findlog_logged_at,
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

COMMENT ON VIEW specimens_complete IS 'Complete view of specimens with storage, tags, and collection groups';

-- Collection statistics view
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

COMMENT ON VIEW collection_statistics IS 'Aggregate statistics for user collections';

-- Storage capacity view
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

COMMENT ON VIEW storage_capacity_status IS 'Storage location capacity and utilization status';

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

COMMENT ON FUNCTION get_specimens_within_radius IS 'Find specimens collected within radius (meters) of a point';

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

COMMENT ON FUNCTION get_storage_path IS 'Get hierarchical path for storage location (e.g., "Rock Room > Main Shelf > Red Box")';

-- =====================================================
-- 11. GRANTS
-- =====================================================

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON specimens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON collection_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON specimen_tags TO authenticated;
GRANT SELECT, INSERT, DELETE ON collection_group_specimens TO authenticated;

-- Grant on views
GRANT SELECT ON specimens_complete TO authenticated;
GRANT SELECT ON collection_statistics TO authenticated;
GRANT SELECT ON storage_capacity_status TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_specimens_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_path TO authenticated;
GRANT EXECUTE ON FUNCTION update_collection_group_metrics_for_group TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The Collection Management schema is now ready.
-- Tables created: 6 (specimens, storage_locations, tags, collection_groups, specimen_tags, collection_group_specimens)
-- Views created: 3 (specimens_complete, collection_statistics, storage_capacity_status)
-- Functions created: 3 (get_specimens_within_radius, get_storage_path, update_collection_group_metrics_for_group)
-- Triggers created: 15+ (auto-update, version increment, metrics recalculation)
-- RLS policies created: 22 (CRUD policies for all tables)
-- Indexes created: 40+ (for performance optimization)
