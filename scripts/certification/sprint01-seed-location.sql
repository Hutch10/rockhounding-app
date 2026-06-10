-- Sprint 1 operational cert: minimal test location with fuzzy_geom for bbox RPC
INSERT INTO public.locations (
  id,
  name,
  description,
  latitude,
  longitude,
  geom,
  fuzzy_geom,
  access_status,
  difficulty_rating,
  is_verified,
  source_tier,
  trust_category,
  freshness_status,
  metadata
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Sprint 1 Cert Test Site',
  'Operational certification seed location',
  45.0,
  -120.0,
  ST_SetSRID(ST_MakePoint(-120.0, 45.0), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-120.01, 45.01), 4326)::geography,
  'allowed',
  2,
  true,
  'OFFICIAL',
  'official',
  'fresh',
  '{"cert": "sprint01"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  fuzzy_geom = EXCLUDED.fuzzy_geom,
  trust_category = EXCLUDED.trust_category;
