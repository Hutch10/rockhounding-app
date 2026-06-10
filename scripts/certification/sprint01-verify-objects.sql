SELECT 'locations_columns' AS check_group, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'locations'
  AND column_name IN ('trust_category', 'freshness_checked_at', 'freshness_status')
UNION ALL
SELECT 'profiles_columns' AS check_group, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('display_name', 'trust_level', 'preferences', 'is_admin')
ORDER BY check_group, column_name;

SELECT proname AS function_name, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'locations_v1_in_bbox';

SELECT id, name FROM public.locations LIMIT 3;
