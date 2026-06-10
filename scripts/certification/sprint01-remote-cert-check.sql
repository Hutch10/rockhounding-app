SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'locations'
  AND column_name IN ('trust_category', 'freshness_checked_at', 'freshness_status')
ORDER BY column_name;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('display_name', 'trust_level', 'preferences', 'is_admin')
ORDER BY column_name;

SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'locations_v1_in_bbox';

SELECT id, name, trust_category FROM public.locations LIMIT 5;
