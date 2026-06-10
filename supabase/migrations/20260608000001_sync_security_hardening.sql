-- ============================================================================
-- Migration 00001A: Sync Security Hardening
-- Additive post-baseline patch. Does not modify 20260608000000 baseline.
--
-- Strategy (Option A): retain SECURITY DEFINER on sync RPCs so privileged
-- writes (e.g. sync_conflicts INSERT without an RLS INSERT policy) remain
-- possible, but enforce caller ownership via explicit auth.uid() assertions
-- before any mutation. This closes the IDOR path where DEFINER bypassed RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: require authenticated session
-- SECURITY INVOKER: when called from a DEFINER RPC, runs as the JWT caller.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_require_authenticated()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated'
      USING ERRCODE = '28000';
  END IF;
  RETURN v_uid;
END;
$$;

COMMENT ON FUNCTION public.sync_require_authenticated() IS
  'Returns auth.uid() or raises if the session is anonymous. Used by sync RPC hardening helpers.';

-- ----------------------------------------------------------------------------
-- Helper: caller must match explicit p_user_id parameter
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_assert_caller_is(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := public.sync_require_authenticated();
BEGIN
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: sync user mismatch'
      USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END;
$$;

COMMENT ON FUNCTION public.sync_assert_caller_is(UUID) IS
  'Ensures p_user_id equals auth.uid(). Prevents cross-user enqueue/read RPC spoofing.';

-- ----------------------------------------------------------------------------
-- Helper: caller must own sync_queue row (RLS-visible under INVOKER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_assert_queue_owner(p_sync_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := public.sync_require_authenticated();
  v_owner UUID;
BEGIN
  SELECT sq.user_id
  INTO v_owner
  FROM public.sync_queue sq
  WHERE sq.sync_id = p_sync_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sync operation not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: not queue owner'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_owner;
END;
$$;

COMMENT ON FUNCTION public.sync_assert_queue_owner(UUID) IS
  'Ensures auth.uid() owns sync_queue row. INVOKER + RLS prevents cross-tenant sync_id probing.';

-- ----------------------------------------------------------------------------
-- Helper: caller must own conflict via sync_queue join
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_assert_conflict_owner(p_conflict_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := public.sync_require_authenticated();
  v_sync_id UUID;
  v_owner UUID;
BEGIN
  SELECT sc.sync_id, sq.user_id
  INTO v_sync_id, v_owner
  FROM public.sync_conflicts sc
  JOIN public.sync_queue sq ON sq.sync_id = sc.sync_id
  WHERE sc.conflict_id = p_conflict_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conflict not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: not conflict owner'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_sync_id;
END;
$$;

COMMENT ON FUNCTION public.sync_assert_conflict_owner(UUID) IS
  'Ensures auth.uid() owns the sync_queue row linked to a conflict.';

GRANT EXECUTE ON FUNCTION public.sync_require_authenticated() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_assert_caller_is(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_assert_queue_owner(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_assert_conflict_owner(UUID) TO authenticated, service_role;

-- ============================================================================
-- Hardened sync RPCs (same public signatures as baseline)
-- SECURITY DEFINER retained; ownership assertions run before writes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_sync_operation(
  p_user_id UUID,
  p_device_id UUID,
  p_entity_type sync_entity_type,
  p_entity_id UUID,
  p_operation_type sync_operation_type,
  p_priority sync_priority,
  p_delta JSONB DEFAULT NULL,
  p_full_entity JSONB DEFAULT NULL,
  p_client_version INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sync_id UUID;
  v_uid UUID;
BEGIN
  v_uid := public.sync_assert_caller_is(p_user_id);

  INSERT INTO public.sync_queue (
    user_id,
    device_id,
    entity_type,
    entity_id,
    operation_type,
    priority,
    client_version,
    delta,
    full_entity
  ) VALUES (
    v_uid,
    p_device_id,
    p_entity_type,
    p_entity_id,
    p_operation_type,
    p_priority,
    p_client_version,
    p_delta,
    p_full_entity
  )
  RETURNING sync_id INTO v_sync_id;

  INSERT INTO public.sync_state (user_id, device_id)
  VALUES (v_uid, p_device_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN v_sync_id;
END;
$$;

COMMENT ON FUNCTION public.enqueue_sync_operation(
  UUID, UUID, sync_entity_type, UUID, sync_operation_type, sync_priority, JSONB, JSONB, INTEGER
) IS
  'SECURITY DEFINER: required for queue/state writes without widening table RLS. '
  'Ownership enforced via sync_assert_caller_is(p_user_id) = auth.uid() before INSERT.';

CREATE OR REPLACE FUNCTION public.get_next_sync_batch(
  p_user_id UUID,
  p_device_id UUID,
  p_batch_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  sync_id UUID,
  entity_type sync_entity_type,
  entity_id UUID,
  operation_type sync_operation_type,
  priority sync_priority,
  client_version INTEGER,
  delta JSONB,
  full_entity JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.sync_assert_caller_is(p_user_id);

  RETURN QUERY
  SELECT
    sq.sync_id,
    sq.entity_type,
    sq.entity_id,
    sq.operation_type,
    sq.priority,
    sq.client_version,
    sq.delta,
    sq.full_entity
  FROM public.sync_queue_pending sq
  WHERE sq.user_id = p_user_id
    AND sq.device_id = p_device_id
  LIMIT p_batch_size;
END;
$$;

COMMENT ON FUNCTION public.get_next_sync_batch(UUID, UUID, INTEGER) IS
  'SECURITY DEFINER: batch read helper. Caller must match p_user_id via auth.uid().';

CREATE OR REPLACE FUNCTION public.mark_sync_success(
  p_sync_id UUID,
  p_server_version INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.sync_assert_queue_owner(p_sync_id);

  UPDATE public.sync_queue
  SET
    status = 'success',
    server_version = p_server_version,
    synced_at = NOW(),
    updated_at = NOW()
  WHERE sync_id = p_sync_id;
END;
$$;

COMMENT ON FUNCTION public.mark_sync_success(UUID, INTEGER) IS
  'SECURITY DEFINER: status transition. sync_assert_queue_owner prevents cross-user completion.';

CREATE OR REPLACE FUNCTION public.mark_sync_error(
  p_sync_id UUID,
  p_error_message TEXT,
  p_error_code VARCHAR(50) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry_at TIMESTAMPTZ;
BEGIN
  PERFORM public.sync_assert_queue_owner(p_sync_id);

  SELECT retry_count, max_retries
  INTO v_retry_count, v_max_retries
  FROM public.sync_queue
  WHERE sync_id = p_sync_id;

  v_next_retry_at := NOW() + (INTERVAL '1 second' * POWER(2, v_retry_count));

  IF v_retry_count < v_max_retries THEN
    UPDATE public.sync_queue
    SET
      status = 'retry',
      retry_count = retry_count + 1,
      next_retry_at = v_next_retry_at,
      error_message = p_error_message,
      error_code = p_error_code,
      last_attempt_at = NOW(),
      updated_at = NOW()
    WHERE sync_id = p_sync_id;
  ELSE
    UPDATE public.sync_queue
    SET
      status = 'error',
      error_message = p_error_message,
      error_code = p_error_code,
      last_attempt_at = NOW(),
      updated_at = NOW()
    WHERE sync_id = p_sync_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.mark_sync_error(UUID, TEXT, VARCHAR) IS
  'SECURITY DEFINER: retry/error transition. sync_assert_queue_owner prevents cross-user mutation.';

CREATE OR REPLACE FUNCTION public.create_sync_conflict(
  p_sync_id UUID,
  p_entity_type sync_entity_type,
  p_entity_id UUID,
  p_client_version INTEGER,
  p_server_version INTEGER,
  p_client_data JSONB,
  p_server_data JSONB,
  p_conflicting_fields TEXT[],
  p_resolution_strategy conflict_resolution_strategy DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflict_id UUID;
BEGIN
  PERFORM public.sync_assert_queue_owner(p_sync_id);

  UPDATE public.sync_queue
  SET status = 'conflict', updated_at = NOW()
  WHERE sync_id = p_sync_id;

  INSERT INTO public.sync_conflicts (
    sync_id,
    entity_type,
    entity_id,
    client_version,
    server_version,
    client_data,
    server_data,
    conflicting_fields,
    resolution_strategy
  ) VALUES (
    p_sync_id,
    p_entity_type,
    p_entity_id,
    p_client_version,
    p_server_version,
    p_client_data,
    p_server_data,
    p_conflicting_fields,
    p_resolution_strategy
  )
  RETURNING conflict_id INTO v_conflict_id;

  RETURN v_conflict_id;
END;
$$;

COMMENT ON FUNCTION public.create_sync_conflict(
  UUID, sync_entity_type, UUID, INTEGER, INTEGER, JSONB, JSONB, TEXT[], conflict_resolution_strategy
) IS
  'SECURITY DEFINER: inserts sync_conflicts (no RLS INSERT policy). '
  'Queue ownership asserted before UPDATE/INSERT.';

CREATE OR REPLACE FUNCTION public.resolve_sync_conflict(
  p_conflict_id UUID,
  p_resolved_by UUID,
  p_resolution_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sync_id UUID;
  v_uid UUID;
BEGIN
  v_uid := public.sync_require_authenticated();
  v_sync_id := public.sync_assert_conflict_owner(p_conflict_id);

  -- p_resolved_by kept for API compatibility; auth uses auth.uid() only.
  UPDATE public.sync_conflicts
  SET
    resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = v_uid,
    resolution_data = p_resolution_data
  WHERE conflict_id = p_conflict_id;

  UPDATE public.sync_queue
  SET status = 'success', synced_at = NOW(), updated_at = NOW()
  WHERE sync_id = v_sync_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_sync_conflict(UUID, UUID, JSONB) IS
  'SECURITY DEFINER: resolves conflicts. p_resolved_by ignored; resolved_by := auth.uid(). '
  'sync_assert_conflict_owner prevents cross-user resolution.';

CREATE OR REPLACE FUNCTION public.get_sync_state(p_user_id UUID)
RETURNS TABLE (
  is_syncing BOOLEAN,
  is_online BOOLEAN,
  pending_count INTEGER,
  syncing_count INTEGER,
  conflict_count INTEGER,
  error_count INTEGER,
  last_sync_at TIMESTAMPTZ,
  connection_quality connection_quality
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.sync_assert_caller_is(p_user_id);

  RETURN QUERY
  SELECT
    ss.is_syncing,
    ss.is_online,
    ss.pending_count,
    ss.syncing_count,
    ss.conflict_count,
    ss.error_count,
    ss.last_sync_at,
    ss.connection_quality
  FROM public.sync_state ss
  WHERE ss.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_sync_state(UUID) IS
  'SECURITY DEFINER: read sync_state counters. Caller must match p_user_id via auth.uid().';

CREATE OR REPLACE FUNCTION public.cleanup_old_sync_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.sync_queue
  WHERE status IN ('success', 'cancelled')
    AND synced_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  DELETE FROM public.sync_history
  WHERE completed_at < NOW() - INTERVAL '90 days';

  DELETE FROM public.sync_idempotency_keys
  WHERE expires_at < NOW();

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_sync_data() IS
  'SECURITY DEFINER: global retention cleanup. EXECUTE revoked from authenticated; '
  'service_role only. Not owner-scoped — must not be callable by end users.';

-- Privilege lockdown: maintenance RPC is not part of offline-first client surface.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_sync_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_sync_data() TO service_role;
