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
    'PENDING', 'SYNCING', 'SYNCED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED'
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

-- Indexes for common queries
CREATE INDEX idx_find_logs_user_id ON public.find_logs(user_id);
CREATE INDEX idx_find_logs_field_session_id ON public.find_logs(field_session_id);
CREATE INDEX idx_find_logs_material_type ON public.find_logs(material_type);
CREATE INDEX idx_find_logs_quality_rating ON public.find_logs(quality_rating);
CREATE INDEX idx_find_logs_identification_confidence ON public.find_logs(identification_confidence);
CREATE INDEX idx_find_logs_state ON public.find_logs(state);
CREATE INDEX idx_find_logs_created_at ON public.find_logs(created_at DESC);
CREATE INDEX idx_find_logs_user_session ON public.find_logs(user_id, field_session_id);
CREATE INDEX idx_find_logs_sync_status ON public.find_logs(sync_status);

-- Geospatial index for location queries
CREATE INDEX idx_find_logs_location_point ON public.find_logs USING gist(location_point);

-- JSON indexes for metadata queries
CREATE INDEX idx_find_logs_photos_count ON public.find_logs(photos_count);
CREATE INDEX idx_find_logs_is_favorite ON public.find_logs(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_find_logs_is_private ON public.find_logs(is_private) WHERE is_private = true;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_find_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER find_logs_timestamp_trigger
BEFORE UPDATE ON public.find_logs
FOR EACH ROW
EXECUTE FUNCTION update_find_logs_timestamp();

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

-- View: User find log summary statistics
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

-- View: User find statistics by material
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

-- View: Session find statistics
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

COMMENT ON COLUMN public.find_logs.material_type IS 'Type of material: MINERAL, ROCK, CRYSTAL, FOSSIL, GEODE, SPECIMEN, ORE, METEORITE, GEMSTONE, UNKNOWN';
COMMENT ON COLUMN public.find_logs.identification_confidence IS 'Confidence in material identification: CERTAIN, VERY_LIKELY, LIKELY, POSSIBLE, UNCERTAIN, GUESS, UNIDENTIFIED';
COMMENT ON COLUMN public.find_logs.quality_rating IS 'Condition quality rating: PRISTINE, EXCELLENT, VERY_GOOD, GOOD, FAIR, POOR, FRAGMENTARY';
COMMENT ON COLUMN public.find_logs.location_point IS 'PostGIS point for geospatial queries';
COMMENT ON COLUMN public.find_logs.state IS 'Find lifecycle state: DRAFT, SUBMITTED, VERIFIED, ARCHIVED, DELETED';
COMMENT ON COLUMN public.find_logs.sync_status IS 'Synchronization state: PENDING, SYNCING, SYNCED, CONFLICT, FAILED, RETRY_SCHEDULED';
COMMENT ON COLUMN public.find_logs.specimen_ids IS 'Array of linked Specimen entity IDs';
