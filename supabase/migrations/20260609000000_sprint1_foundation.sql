-- Sprint 1 Foundation (DB-001, DB-003, AUTH-004 partial)
-- Profiles V1 columns, location trust/freshness, finds RLS, bbox RPC

BEGIN;

-- ─── DB-001: profiles V1 columns ───────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.trust_level IS 'Contributor tier 1-4 per HutchStack trust policy';
COMMENT ON COLUMN public.profiles.preferences IS 'User preferences JSON per ProfileV1 contract';

-- ─── DB-003: location trust presentation ───────────────────────────────────
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS source_tier public.source_tier DEFAULT 'SECONDARY';

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS trust_category text NOT NULL DEFAULT 'unverified'
  CHECK (trust_category IN ('official', 'verified', 'community', 'unverified'));

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS freshness_checked_at timestamptz;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS freshness_status text NOT NULL DEFAULT 'unknown'
  CHECK (freshness_status IN ('fresh', 'aging', 'stale', 'unknown'));

UPDATE public.locations
SET trust_category = 'official'
WHERE source_tier = 'OFFICIAL' AND trust_category = 'unverified';

UPDATE public.locations
SET trust_category = 'verified'
WHERE is_verified = true
  AND COALESCE(source_tier::text, '') <> 'OFFICIAL'
  AND trust_category = 'unverified';

UPDATE public.locations
SET trust_category = 'community'
WHERE source_tier = 'COMMUNITY_STAGED'
  AND trust_category = 'unverified';

-- ─── AUTH-004: finds write policies ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finds' AND policyname = 'finds_insert_own'
  ) THEN
    CREATE POLICY finds_insert_own ON public.finds
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finds' AND policyname = 'finds_update_own'
  ) THEN
    CREATE POLICY finds_update_own ON public.finds
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finds' AND policyname = 'finds_delete_own'
  ) THEN
    CREATE POLICY finds_delete_own ON public.finds
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── API-001: bbox list RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.locations_v1_in_bbox(
  p_min_lon double precision,
  p_min_lat double precision,
  p_max_lon double precision,
  p_max_lat double precision,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  latitude double precision,
  longitude double precision,
  fuzzy_lat double precision,
  fuzzy_lon double precision,
  access_status public.access_status,
  difficulty_rating integer,
  is_verified boolean,
  trust_category text,
  freshness_checked_at timestamptz,
  freshness_status text,
  metadata jsonb,
  source_tier text,
  top_materials text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.name,
    l.description,
    ST_Y(l.geom::geometry)::double precision AS latitude,
    ST_X(l.geom::geometry)::double precision AS longitude,
    ST_Y(l.fuzzy_geom::geometry)::double precision AS fuzzy_lat,
    ST_X(l.fuzzy_geom::geometry)::double precision AS fuzzy_lon,
    l.access_status,
    l.difficulty_rating,
    l.is_verified,
    l.trust_category,
    l.freshness_checked_at,
    l.freshness_status,
    l.metadata,
    l.source_tier::text AS source_tier,
    COALESCE(
      (
        SELECT array_agg(sub.name ORDER BY sub.name)
        FROM (
          SELECT m.name
          FROM location_materials lm
          JOIN materials m ON m.id = lm.material_id
          WHERE lm.location_id = l.id
          LIMIT 3
        ) sub
      ),
      ARRAY[]::text[]
    ) AS top_materials
  FROM public.locations l
  WHERE l.fuzzy_geom IS NOT NULL
    AND ST_Intersects(
      l.fuzzy_geom,
      ST_MakeEnvelope(p_min_lon, p_min_lat, p_max_lon, p_max_lat, 4326)::geography
    )
  LIMIT LEAST(GREATEST(p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public.locations_v1_in_bbox(double precision, double precision, double precision, double precision, integer) TO anon, authenticated;

-- ─── AUTH-004: enable RLS on V1 tables flagged by audit-rls ────────────────
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sync_operations_own ON public.sync_operations;
CREATE POLICY sync_operations_own ON public.sync_operations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trips_own ON public.trips;
CREATE POLICY trips_own ON public.trips
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.trip_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trip_targets_via_trip ON public.trip_targets;
CREATE POLICY trip_targets_via_trip ON public.trip_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );

ALTER TABLE public.find_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS find_media_via_find ON public.find_media;
CREATE POLICY find_media_via_find ON public.find_media
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.finds f WHERE f.id = find_id AND f.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.finds f WHERE f.id = find_id AND f.user_id = auth.uid())
  );

ALTER TABLE public.find_classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS find_classifications_via_find ON public.find_classifications;
CREATE POLICY find_classifications_via_find ON public.find_classifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.finds f WHERE f.id = find_id AND f.user_id = auth.uid())
  );

ALTER TABLE public.specimen_taxonomy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS specimen_taxonomy_public_read ON public.specimen_taxonomy;
CREATE POLICY specimen_taxonomy_public_read ON public.specimen_taxonomy
  FOR SELECT USING (true);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS regions_public_read ON public.regions;
CREATE POLICY regions_public_read ON public.regions FOR SELECT USING (true);

ALTER TABLE public.land_parcels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS land_parcels_public_read ON public.land_parcels;
CREATE POLICY land_parcels_public_read ON public.land_parcels FOR SELECT USING (true);

ALTER TABLE public.access_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_rules_public_read ON public.access_rules;
CREATE POLICY access_rules_public_read ON public.access_rules FOR SELECT USING (true);

ALTER TABLE public.land_access_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS land_access_zones_public_read ON public.land_access_zones;
CREATE POLICY land_access_zones_public_read ON public.land_access_zones FOR SELECT USING (true);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_config_admin ON public.system_config;
CREATE POLICY system_config_admin ON public.system_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moderation_cases_reporter ON public.moderation_cases;
CREATE POLICY moderation_cases_reporter ON public.moderation_cases
  FOR SELECT USING (reporter_id = auth.uid() OR assigned_to = auth.uid());

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moderation_events_via_case ON public.moderation_events;
CREATE POLICY moderation_events_via_case ON public.moderation_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.moderation_cases c
      WHERE c.id = case_id AND (c.reporter_id = auth.uid() OR c.assigned_to = auth.uid())
    )
  );

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS embeddings_deny_all ON public.embeddings;
CREATE POLICY embeddings_deny_all ON public.embeddings FOR SELECT USING (false);

COMMIT;
