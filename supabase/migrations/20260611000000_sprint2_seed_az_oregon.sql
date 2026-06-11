-- DB-012: Idempotent AZ + Oregon canon seed (20+ sites each, all trust tiers + prohibited)

-- Showcase sites for trust badge E2E (fixed UUIDs)
INSERT INTO public.locations (
  id, name, description, latitude, longitude, geom, fuzzy_geom,
  access_status, difficulty_rating, is_verified, source_tier, trust_category,
  freshness_status, metadata
) VALUES
  ('22222222-2222-2222-2222-222222222201', 'AZ Official — Quartzsite', 'Official BLM reference site', 33.66, -114.23,
   ST_SetSRID(ST_MakePoint(-114.23, 33.66), 4326)::geography, ST_SetSRID(ST_MakePoint(-114.24, 33.67), 4326)::geography,
   'allowed', 2, true, 'OFFICIAL', 'official', 'fresh', '{"seed":"sprint2","state":"AZ","top_materials":["Quartz"]}'::jsonb),
  ('22222222-2222-2222-2222-222222222202', 'AZ Verified — Burro Creek', 'Verified community-corroborated site', 34.12, -113.45,
   ST_SetSRID(ST_MakePoint(-113.45, 34.12), 4326)::geography, ST_SetSRID(ST_MakePoint(-113.46, 34.13), 4326)::geography,
   'caution', 3, true, 'SECONDARY', 'verified', 'fresh', '{"seed":"sprint2","state":"AZ","top_materials":["Agate"]}'::jsonb),
  ('22222222-2222-2222-2222-222222222203', 'AZ Community — Apache Leap', 'Community-staged report', 33.08, -110.98,
   ST_SetSRID(ST_MakePoint(-110.98, 33.08), 4326)::geography, ST_SetSRID(ST_MakePoint(-110.99, 33.09), 4326)::geography,
   'allowed', 2, false, 'COMMUNITY_STAGED', 'community', 'aging', '{"seed":"sprint2","state":"AZ","top_materials":["Obsidian"]}'::jsonb),
  ('22222222-2222-2222-2222-222222222204', 'AZ Unverified — Mystery Wash', 'Single-source unverified claim', 34.50, -111.80,
   ST_SetSRID(ST_MakePoint(-111.80, 34.50), 4326)::geography, ST_SetSRID(ST_MakePoint(-111.81, 34.51), 4326)::geography,
   'unknown', 4, false, 'SECONDARY', 'unverified', 'unknown', '{"seed":"sprint2","state":"AZ","top_materials":["Jasper"]}'::jsonb),
  ('22222222-2222-2222-2222-222222222205', 'AZ Prohibited — Grand Canyon NP', 'National park — collecting prohibited', 36.05, -112.14,
   ST_SetSRID(ST_MakePoint(-112.14, 36.05), 4326)::geography, ST_SetSRID(ST_MakePoint(-112.15, 36.06), 4326)::geography,
   'prohibited', 5, true, 'OFFICIAL', 'official', 'fresh', '{"seed":"sprint2","state":"AZ","collecting_summary":"Collecting strictly prohibited."}'::jsonb),
  ('33333333-3333-3333-3333-333333333301', 'OR Official — Richardson Ranch', 'Official fee-dig site reference', 44.10, -120.55,
   ST_SetSRID(ST_MakePoint(-120.55, 44.10), 4326)::geography, ST_SetSRID(ST_MakePoint(-120.56, 44.11), 4326)::geography,
   'allowed', 1, true, 'OFFICIAL', 'official', 'fresh', '{"seed":"sprint2","state":"OR","top_materials":["Thunderegg"]}'::jsonb),
  ('33333333-3333-3333-3333-333333333302', 'OR Verified — Glass Butte', 'Verified obsidian field', 43.55, -120.82,
   ST_SetSRID(ST_MakePoint(-120.82, 43.55), 4326)::geography, ST_SetSRID(ST_MakePoint(-120.83, 43.56), 4326)::geography,
   'allowed', 2, true, 'SECONDARY', 'verified', 'fresh', '{"seed":"sprint2","state":"OR","top_materials":["Obsidian"]}'::jsonb),
  ('33333333-3333-3333-3333-333333333303', 'OR Community — Hampton Butte', 'Community report site', 43.72, -120.65,
   ST_SetSRID(ST_MakePoint(-120.65, 43.72), 4326)::geography, ST_SetSRID(ST_MakePoint(-120.66, 43.73), 4326)::geography,
   'caution', 3, false, 'COMMUNITY_STAGED', 'community', 'aging', '{"seed":"sprint2","state":"OR","top_materials":["Petrified Wood"]}'::jsonb),
  ('33333333-3333-3333-3333-333333333304', 'OR Unverified — Coast Agate Beach', 'Unverified beach report', 44.02, -124.10,
   ST_SetSRID(ST_MakePoint(-124.10, 44.02), 4326)::geography, ST_SetSRID(ST_MakePoint(-124.11, 44.03), 4326)::geography,
   'unknown', 2, false, 'SECONDARY', 'unverified', 'unknown', '{"seed":"sprint2","state":"OR","top_materials":["Agate"]}'::jsonb),
  ('33333333-3333-3333-3333-333333333305', 'OR Prohibited — Crater Lake NP', 'National park — collecting prohibited', 42.94, -122.17,
   ST_SetSRID(ST_MakePoint(-122.17, 42.94), 4326)::geography, ST_SetSRID(ST_MakePoint(-122.18, 42.95), 4326)::geography,
   'prohibited', 4, true, 'OFFICIAL', 'official', 'fresh', '{"seed":"sprint2","state":"OR","collecting_summary":"Collecting strictly prohibited."}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  access_status = EXCLUDED.access_status,
  trust_category = EXCLUDED.trust_category,
  fuzzy_geom = EXCLUDED.fuzzy_geom,
  metadata = EXCLUDED.metadata;

-- Bulk AZ sites (22 additional)
DO $$
DECLARE
  i int;
  lon numeric;
  lat numeric;
  statuses text[] := ARRAY['allowed','caution','restricted','allowed','caution'];
  trusts text[] := ARRAY['official','verified','community','unverified','verified'];
  tiers text[] := ARRAY['OFFICIAL','SECONDARY','COMMUNITY_STAGED','SECONDARY','SECONDARY'];
BEGIN
  FOR i IN 1..22 LOOP
    lon := -114.0 + (i * 0.15);
    lat := 32.5 + (i * 0.12);
    INSERT INTO public.locations (
      id, name, latitude, longitude, geom, fuzzy_geom,
      access_status, difficulty_rating, is_verified, source_tier, trust_category,
      freshness_status, metadata
    ) VALUES (
      ('aaaaaaaa-aaaa-aaaa-aaaa-' || lpad(i::text, 12, '0'))::uuid,
      'AZ Seed Site ' || i,
      lat, lon,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(lon + 0.01, lat + 0.01), 4326)::geography,
      statuses[1 + (i % 5)]::public.access_status,
      1 + (i % 5),
      (i % 3) = 0,
      tiers[1 + (i % 5)]::public.source_tier,
      trusts[1 + (i % 5)],
      'fresh',
      jsonb_build_object('seed', 'sprint2', 'state', 'AZ', 'top_materials', jsonb_build_array('Quartz'))
    )
    ON CONFLICT (id) DO UPDATE SET
      access_status = EXCLUDED.access_status,
      trust_category = EXCLUDED.trust_category;
  END LOOP;
END $$;

-- Bulk Oregon sites (22 additional)
DO $$
DECLARE
  i int;
  lon numeric;
  lat numeric;
  statuses text[] := ARRAY['allowed','caution','restricted','allowed','caution'];
  trusts text[] := ARRAY['official','verified','community','unverified','verified'];
  tiers text[] := ARRAY['OFFICIAL','SECONDARY','COMMUNITY_STAGED','SECONDARY','SECONDARY'];
BEGIN
  FOR i IN 1..22 LOOP
    lon := -123.5 + (i * 0.12);
    lat := 42.5 + (i * 0.10);
    INSERT INTO public.locations (
      id, name, latitude, longitude, geom, fuzzy_geom,
      access_status, difficulty_rating, is_verified, source_tier, trust_category,
      freshness_status, metadata
    ) VALUES (
      ('bbbbbbbb-bbbb-bbbb-bbbb-' || lpad(i::text, 12, '0'))::uuid,
      'OR Seed Site ' || i,
      lat, lon,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(lon + 0.01, lat + 0.01), 4326)::geography,
      statuses[1 + (i % 5)]::public.access_status,
      1 + (i % 5),
      (i % 3) = 0,
      tiers[1 + (i % 5)]::public.source_tier,
      trusts[1 + (i % 5)],
      'fresh',
      jsonb_build_object('seed', 'sprint2', 'state', 'OR', 'top_materials', jsonb_build_array('Agate'))
    )
    ON CONFLICT (id) DO UPDATE SET
      access_status = EXCLUDED.access_status,
      trust_category = EXCLUDED.trust_category;
  END LOOP;
END $$;
