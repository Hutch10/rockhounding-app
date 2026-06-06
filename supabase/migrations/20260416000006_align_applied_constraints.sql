-- Migration: Align sync_status constraints with V1 Contract
-- Drop specific old constraints and replace them to allow 'APPLIED'.
-- Normalize existing 'SYNCED' strings to 'APPLIED'.

BEGIN;

-- 1. Drop existing CHECK constraints explicitly by name
-- We only drop the exact constraints we intend to recreate.
ALTER TABLE IF EXISTS field_sessions DROP CONSTRAINT IF EXISTS field_sessions_sync_status_check;
ALTER TABLE IF EXISTS find_logs DROP CONSTRAINT IF EXISTS find_logs_sync_status_check;
ALTER TABLE IF EXISTS session_events DROP CONSTRAINT IF EXISTS session_events_sync_status_check;
ALTER TABLE IF EXISTS raw_captures DROP CONSTRAINT IF EXISTS raw_captures_sync_status_check;
ALTER TABLE IF EXISTS specimens DROP CONSTRAINT IF EXISTS specimens_sync_status_check;
ALTER TABLE IF EXISTS storage_locations DROP CONSTRAINT IF EXISTS storage_locations_sync_status_check;
ALTER TABLE IF EXISTS tags DROP CONSTRAINT IF EXISTS tags_sync_status_check;
ALTER TABLE IF EXISTS collection_groups DROP CONSTRAINT IF EXISTS collection_groups_sync_status_check;

-- 2. Update Enum types safely using system catalogs
DO $$
BEGIN
    -- capture_sync_status: 'SYNCED' -> 'APPLIED'
    IF EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'capture_sync_status' AND e.enumlabel = 'SYNCED'
    ) THEN
        ALTER TYPE capture_sync_status RENAME VALUE 'SYNCED' TO 'APPLIED';
    END IF;

    -- sync_status: 'synced' -> 'applied'
    IF EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'sync_status' AND e.enumlabel = 'synced'
    ) THEN
        ALTER TYPE sync_status RENAME VALUE 'synced' TO 'applied';
    END IF;

    -- sync_status: 'SYNCED' -> 'APPLIED'
    IF EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'sync_status' AND e.enumlabel = 'SYNCED'
    ) THEN
        ALTER TYPE sync_status RENAME VALUE 'SYNCED' TO 'APPLIED';
    END IF;
END $$;

-- 3. Normalize existing data across known TEXT tables safely
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'field_sessions') THEN
        UPDATE field_sessions SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'find_logs') THEN
        UPDATE find_logs SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_events') THEN
        UPDATE session_events SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'raw_captures') THEN
        UPDATE raw_captures SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specimens') THEN
        UPDATE specimens SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'storage_locations') THEN
        UPDATE storage_locations SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tags') THEN
        UPDATE tags SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collection_groups') THEN
        UPDATE collection_groups SET sync_status = 'APPLIED' WHERE sync_status IN ('SYNCED', 'synced');
    END IF;
END $$;

-- 4. Re-add check constraints supporting 'APPLIED' conditionally if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'field_sessions') THEN
        ALTER TABLE field_sessions ADD CONSTRAINT field_sessions_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'find_logs') THEN
        ALTER TABLE find_logs ADD CONSTRAINT find_logs_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_events') THEN
        ALTER TABLE session_events ADD CONSTRAINT session_events_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'raw_captures') THEN
        ALTER TABLE raw_captures ADD CONSTRAINT raw_captures_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specimens') THEN
        ALTER TABLE specimens ADD CONSTRAINT specimens_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'storage_locations') THEN
        ALTER TABLE storage_locations ADD CONSTRAINT storage_locations_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tags') THEN
        ALTER TABLE tags ADD CONSTRAINT tags_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collection_groups') THEN
        ALTER TABLE collection_groups ADD CONSTRAINT collection_groups_sync_status_check 
          CHECK (sync_status IN ('PENDING', 'SYNCING', 'APPLIED', 'CONFLICT', 'FAILED', 'RETRY_SCHEDULED', 'QUEUED', 'LOCAL_ONLY'));
    END IF;
END $$;

COMMIT;


