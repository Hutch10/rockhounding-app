SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT COUNT(*) AS location_table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'locations';

SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'locations_v1_in_bbox';
