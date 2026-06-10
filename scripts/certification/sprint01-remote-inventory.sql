SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name
LIMIT 50;

SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version
LIMIT 20;
