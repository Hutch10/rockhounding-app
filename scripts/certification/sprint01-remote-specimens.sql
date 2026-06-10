SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'specimens'
ORDER BY ordinal_position;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
