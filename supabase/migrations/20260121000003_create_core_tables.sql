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

-- Legal rulesets with URLs for "Why?" links
CREATE TABLE rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ruleset_url TEXT NOT NULL, -- Link to official rules
  jurisdiction TEXT NOT NULL, -- federal, state, county, private
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data source provenance tracking
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_tier source_tier NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Geographic units (states, counties) for filtering
CREATE TABLE geounits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- state, county
  state_code TEXT, -- 2-letter state code
  geom geography(MultiPolygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Main locations table (public, approved locations)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Spatial data (REQUIRED: geography Point 4326)
  geom geography(Point, 4326) NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  lon NUMERIC(11, 7) NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  
  -- Legal gating (REQUIRED per Build Document Rule #5)
  legal_tag legal_tag NOT NULL,
  legal_confidence INTEGER NOT NULL CHECK (legal_confidence BETWEEN 0 AND 100),
  access_model access_model NOT NULL,
  
  -- Operational status
  status status NOT NULL DEFAULT 'UNKNOWN',
  
  -- Data provenance (REQUIRED per Build Document Rule #5)
  source_tier source_tier NOT NULL,
  source_id UUID REFERENCES sources(id),
  verification_date TIMESTAMPTZ, -- NULL if status=RESEARCH_REQUIRED
  
  -- Primary ruleset for "Why?" link (REQUIRED per Build Document Rule #5)
  primary_ruleset_id UUID REFERENCES rulesets(id),
  
  -- Site characteristics
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  kid_friendly BOOLEAN NOT NULL DEFAULT false,
  
  -- Additional info
  directions TEXT,
  parking_info TEXT,
  fees_cost TEXT,
  season_info TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints per Build Document Rule #5
  CONSTRAINT locations_verification_check 
    CHECK (
      verification_date IS NOT NULL 
      OR status = 'RESEARCH_REQUIRED'
    )
);

-- Many-to-many: locations to materials
CREATE TABLE location_materials (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  abundance TEXT, -- common, uncommon, rare
  notes TEXT,
  PRIMARY KEY (location_id, material_id)
);

-- Many-to-many: locations to rulesets
CREATE TABLE location_rulesets (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  ruleset_id UUID NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  PRIMARY KEY (location_id, ruleset_id)
);

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

CREATE TRIGGER update_rulesets_updated_at BEFORE UPDATE ON rulesets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE locations IS 'Public rockhounding locations (approved only)';
COMMENT ON COLUMN locations.geom IS 'PostGIS geography point in WGS84 (EPSG:4326)';
COMMENT ON COLUMN locations.legal_tag IS 'Legal status - drives UI gating logic';
COMMENT ON COLUMN locations.legal_confidence IS 'Confidence score 0-100 for legal status';
COMMENT ON COLUMN locations.primary_ruleset_id IS 'Primary ruleset for "Why?" link in UI';
COMMENT ON CONSTRAINT locations_verification_check ON locations 
  IS 'Locations must have verification_date OR status=RESEARCH_REQUIRED';
