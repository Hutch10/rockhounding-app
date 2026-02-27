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

-- Offline state packs (vector-only, no tiles)
-- Build Document Rule #7: Offline support is VECTOR-ONLY JSON state packs
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

-- RLS: Exports are private to user
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports" ON exports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exports" ON exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: State packs are public (read-only for all authenticated users)
ALTER TABLE state_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view state packs" ON state_packs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage state packs" ON state_packs
  FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

-- Comments
COMMENT ON TABLE exports IS 'User export job queue - supports GeoJSON, KML, CSV formats';
COMMENT ON TABLE state_packs IS 'Offline state packs - vector-only JSON bundles (no map tiles)';
COMMENT ON COLUMN state_packs.state_code IS '2-letter state code (e.g., CA, TX)';
COMMENT ON COLUMN state_packs.content_hash IS 'Hash for client-side cache validation';
