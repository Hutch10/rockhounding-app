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

-- Photos attached to observations
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

-- Updated_at trigger
CREATE TRIGGER update_observations_updated_at BEFORE UPDATE ON observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Owner-only access (strict enforcement)
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

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

-- RLS for observation_photos (inherits from observations)
ALTER TABLE observation_photos ENABLE ROW LEVEL SECURITY;

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

-- Comments
COMMENT ON TABLE observations IS 'Geologist field observations - RLS enforced owner-only access';
COMMENT ON COLUMN observations.user_id IS 'Owner - used for RLS policy enforcement';
COMMENT ON COLUMN observations.visibility IS 'PRIVATE by default - SHARED_LINK and TEAM visibility to be implemented';
COMMENT ON TABLE observation_photos IS 'Photos attached to observations - inherits RLS from observations table';
