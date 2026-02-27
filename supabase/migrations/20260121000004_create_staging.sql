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

-- Comments
COMMENT ON TABLE locations_staging IS 'Staging area for user submissions and bulk imports - requires admin approval';
COMMENT ON COLUMN locations_staging.moderation_status IS 'Approval workflow: PENDING → APPROVED/REJECTED';
COMMENT ON COLUMN locations_staging.promoted_to_location_id IS 'Links to public locations table after approval';
