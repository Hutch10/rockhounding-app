-- ============================================================================
-- Migration 00002: Provenance Events
-- Additive post-baseline patch. Does not modify 20260608000000 or 00001.
--
-- Immutable provenance ledger with frozen owner_id RLS, per-actor idempotency,
-- entity-scoped chain_sequence, Option B hash durability (input_snapshot never
-- hashed), append-only redaction via privacy/system.redacted events.
-- ============================================================================

-- Reserved non-user actor UUIDs (actor_role disambiguates)
-- system:  00000000-0000-0000-0000-000000000001
-- harness: 00000000-0000-0000-0000-000000000002

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- Table: provenance_events
-- ----------------------------------------------------------------------------
CREATE TABLE public.provenance_events (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_role TEXT NOT NULL
    CHECK (actor_role IN ('user', 'moderator', 'harness', 'system')),
  hash_alg TEXT NOT NULL DEFAULT 'sha256-v1'
    CHECK (hash_alg = 'sha256-v1'),
  harness_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  policy_hash TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  evaluation_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  chain_hash TEXT NOT NULL,
  input_snapshot JSONB,
  output_summary JSONB NOT NULL,
  parent_event_id TEXT REFERENCES public.provenance_events(id) DEFERRABLE INITIALLY DEFERRED,
  chain_sequence BIGINT NOT NULL CHECK (chain_sequence >= 0),
  root_event_type TEXT,
  root_event_id TEXT,
  device_id UUID,
  client_operation_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_provenance_evaluation_hash_id CHECK (id = evaluation_hash),
  CONSTRAINT uq_provenance_entity_sequence UNIQUE (entity_type, entity_id, chain_sequence),
  CONSTRAINT uq_provenance_actor_client_operation UNIQUE (actor_id, client_operation_id)
);

COMMENT ON TABLE public.provenance_events IS
  'Immutable provenance ledger. owner_id frozen at ingest for RLS. input_snapshot is diagnostic only and never hashed.';

COMMENT ON COLUMN public.provenance_events.owner_id IS
  'Immutable custody owner written at ingest. Sole RLS owner key; survives entity deletion.';

COMMENT ON COLUMN public.provenance_events.input_snapshot IS
  'Optional diagnostic blob; purgeable after 90 days. Never included in hash verification (Option B).';

COMMENT ON COLUMN public.provenance_events.root_event_id IS
  'Semantic chain label only — not used for chain_sequence partitioning.';

CREATE INDEX idx_provenance_entity ON public.provenance_events (entity_type, entity_id);
CREATE INDEX idx_provenance_owner ON public.provenance_events (owner_id, occurred_at DESC);
CREATE INDEX idx_provenance_parent ON public.provenance_events (parent_event_id);
CREATE INDEX idx_provenance_root ON public.provenance_events (root_event_type, root_event_id);
CREATE INDEX idx_provenance_occurred ON public.provenance_events (occurred_at DESC);
CREATE INDEX idx_provenance_actor ON public.provenance_events (actor_id, occurred_at DESC);
CREATE INDEX idx_provenance_event_type ON public.provenance_events (event_type, occurred_at DESC);
CREATE INDEX idx_provenance_ingested ON public.provenance_events (ingested_at DESC);

-- ----------------------------------------------------------------------------
-- Immutability (mirrors moderation_audit_log pattern)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_provenance_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Provenance events are immutable and cannot be modified or deleted.';
END;
$$;

CREATE TRIGGER enforce_provenance_immutability
  BEFORE UPDATE OR DELETE ON public.provenance_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provenance_tampering();

-- TRUNCATE requires FOR EACH STATEMENT (not supported with FOR EACH ROW on hosted Postgres)
CREATE TRIGGER enforce_provenance_no_truncate
  BEFORE TRUNCATE ON public.provenance_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_provenance_tampering();

COMMENT ON TRIGGER enforce_provenance_immutability ON public.provenance_events IS
  'WORM semantics for forensic chain-of-custody. Corrections require compensating append events.';

-- ----------------------------------------------------------------------------
-- Canonical JSON + SHA-256 helpers (Option B — no input_snapshot)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provenance_canonical_wrap(p_payload JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object('_canonical', 'canonical-v1', 'payload', p_payload);
$$;

CREATE OR REPLACE FUNCTION public.provenance_sha256_hex(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(extensions.digest(convert_to(p_text, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.provenance_canonical_jsonb_sorted(p_val JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result JSONB;
  v_key TEXT;
  v_elem JSONB;
  v_arr JSONB := '[]'::JSONB;
  i INT;
BEGIN
  IF p_val IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_val) = 'object' THEN
    v_result := '{}'::JSONB;
    FOR v_key IN
      SELECT key FROM jsonb_object_keys(p_val) AS key ORDER BY key
    LOOP
      v_result := v_result || jsonb_build_object(
        v_key,
        public.provenance_canonical_jsonb_sorted(p_val -> v_key)
      );
    END LOOP;
    RETURN v_result;
  ELSIF jsonb_typeof(p_val) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(p_val) - 1 LOOP
      v_arr := v_arr || jsonb_build_array(
        public.provenance_canonical_jsonb_sorted(p_val -> i)
      );
    END LOOP;
    RETURN v_arr;
  ELSE
    RETURN p_val;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.provenance_hash_canonical(p_payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.provenance_sha256_hex(
    public.provenance_canonical_wrap(
      public.provenance_canonical_jsonb_sorted(p_payload)
    )::TEXT
  );
$$;

-- Option B: input_hash uses immutable metadata + output_summary only (never input_snapshot)
CREATE OR REPLACE FUNCTION public.provenance_compute_input_hash(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_owner_id UUID,
  p_actor_id UUID,
  p_actor_role TEXT,
  p_policy_version TEXT,
  p_harness_version TEXT,
  p_output_summary JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.provenance_hash_canonical(jsonb_build_object(
    'event_type', p_event_type,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'owner_id', p_owner_id::TEXT,
    'actor_id', p_actor_id::TEXT,
    'actor_role', p_actor_role,
    'policy_version', p_policy_version,
    'harness_version', p_harness_version,
    'canonical_summary', public.provenance_canonical_jsonb_sorted(p_output_summary)
  ));
$$;

CREATE OR REPLACE FUNCTION public.provenance_compute_output_hash(
  p_event_type TEXT,
  p_output_summary JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.provenance_hash_canonical(jsonb_build_object(
    'event_type', p_event_type,
    'output_summary', public.provenance_canonical_jsonb_sorted(p_output_summary)
  ));
$$;

CREATE OR REPLACE FUNCTION public.provenance_compute_evaluation_hash(
  p_input_hash TEXT,
  p_output_hash TEXT,
  p_policy_hash TEXT,
  p_entity_id TEXT,
  p_harness_version TEXT,
  p_policy_version TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.provenance_hash_canonical(jsonb_build_object(
    'input_hash', p_input_hash,
    'output_hash', p_output_hash,
    'policy_hash', p_policy_hash,
    'entity_id', p_entity_id,
    'harness_version', p_harness_version,
    'policy_version', p_policy_version
  ));
$$;

CREATE OR REPLACE FUNCTION public.provenance_compute_event_hash(
  p_evaluation_hash TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_chain_sequence BIGINT,
  p_parent_event_id TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.provenance_hash_canonical(jsonb_build_object(
    'evaluation_hash', p_evaluation_hash,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'chain_sequence', p_chain_sequence,
    'parent_event_id', p_parent_event_id
  ));
$$;

CREATE OR REPLACE FUNCTION public.provenance_compute_chain_hash(
  p_parent_chain_hash TEXT,
  p_event_hash TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_parent_chain_hash IS NULL THEN p_event_hash
    ELSE public.provenance_hash_canonical(jsonb_build_object(
      'parent_chain_hash', p_parent_chain_hash,
      'event_hash', p_event_hash
    ))
  END;
$$;

-- ----------------------------------------------------------------------------
-- Auth helpers (00001A pattern)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provenance_require_authenticated()
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

CREATE OR REPLACE FUNCTION public.provenance_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.provenance_assert_owner_or_admin(p_owner_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := public.provenance_require_authenticated();
BEGIN
  IF p_owner_id IS DISTINCT FROM v_uid AND NOT public.provenance_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: not provenance owner'
      USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.provenance_assert_user_actor(p_actor_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := public.provenance_require_authenticated();
BEGIN
  IF p_actor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: actor_id must match auth.uid() for user role'
      USING ERRCODE = '42501';
  END IF;
  RETURN v_uid;
END;
$$;

-- System/harness actors require service_role (JWT role claim)
CREATE OR REPLACE FUNCTION public.provenance_assert_privileged_actor(p_actor_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: % events require service_role', p_actor_role
      USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Assign chain_sequence per (entity_type, entity_id) — never per root_event_id
CREATE OR REPLACE FUNCTION public.provenance_assign_chain_sequence(
  p_entity_type TEXT,
  p_entity_id TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_entity_type || ':' || p_entity_id, 0));

  SELECT COALESCE(MAX(pe.chain_sequence), -1) + 1
  INTO v_seq
  FROM public.provenance_events pe
  WHERE pe.entity_type = p_entity_type
    AND pe.entity_id = p_entity_id;

  RETURN v_seq;
END;
$$;

-- Verify stored hashes (Option B — input_snapshot excluded by construction)
CREATE OR REPLACE FUNCTION public.provenance_verify_event_hashes(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_owner_id UUID,
  p_actor_id UUID,
  p_actor_role TEXT,
  p_policy_version TEXT,
  p_harness_version TEXT,
  p_policy_hash TEXT,
  p_output_summary JSONB,
  p_input_hash TEXT,
  p_output_hash TEXT,
  p_evaluation_hash TEXT,
  p_chain_sequence BIGINT,
  p_parent_event_id TEXT,
  p_event_hash TEXT,
  p_chain_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_input TEXT;
  v_output TEXT;
  v_eval TEXT;
  v_event TEXT;
  v_chain TEXT;
  v_parent_chain TEXT;
BEGIN
  v_input := public.provenance_compute_input_hash(
    p_event_type, p_entity_type, p_entity_id, p_owner_id, p_actor_id, p_actor_role,
    p_policy_version, p_harness_version, p_output_summary
  );
  IF v_input IS DISTINCT FROM p_input_hash THEN
    RETURN FALSE;
  END IF;

  v_output := public.provenance_compute_output_hash(p_event_type, p_output_summary);
  IF v_output IS DISTINCT FROM p_output_hash THEN
    RETURN FALSE;
  END IF;

  v_eval := public.provenance_compute_evaluation_hash(
    p_input_hash, p_output_hash, p_policy_hash, p_entity_id, p_harness_version, p_policy_version
  );
  IF v_eval IS DISTINCT FROM p_evaluation_hash THEN
    RETURN FALSE;
  END IF;

  v_event := public.provenance_compute_event_hash(
    p_evaluation_hash, p_entity_type, p_entity_id, p_chain_sequence, p_parent_event_id
  );
  IF v_event IS DISTINCT FROM p_event_hash THEN
    RETURN FALSE;
  END IF;

  IF p_chain_sequence = 0 THEN
    IF p_parent_event_id IS NOT NULL THEN
      RETURN FALSE;
    END IF;
    v_chain := p_event_hash;
  ELSE
    IF p_parent_event_id IS NULL THEN
      RETURN FALSE;
    END IF;
    SELECT pe.chain_hash INTO v_parent_chain
    FROM public.provenance_events pe
    WHERE pe.id = p_parent_event_id;

    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;

    v_chain := public.provenance_compute_chain_hash(v_parent_chain, p_event_hash);
  END IF;

  RETURN v_chain IS NOT DISTINCT FROM p_chain_hash;
END;
$$;

-- ----------------------------------------------------------------------------
-- Redaction helpers (append-only; never UPDATE ledger rows)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provenance_redacted_field_keys(p_target_event_id TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(array_agg(DISTINCT field), ARRAY[]::TEXT[])
  FROM (
    SELECT jsonb_array_elements_text(pe.output_summary -> 'redacted_fields') AS field
    FROM public.provenance_events pe
    WHERE pe.event_type IN ('privacy.redacted', 'system.redacted')
      AND pe.output_summary ->> 'target_event_id' = p_target_event_id
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.provenance_public_summary(
  p_event_id TEXT,
  p_summary JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_keys TEXT[];
  v_key TEXT;
  v_result JSONB := p_summary;
BEGIN
  v_keys := public.provenance_redacted_field_keys(p_event_id);
  IF v_keys IS NULL THEN
    RETURN v_result;
  END IF;
  FOREACH v_key IN ARRAY v_keys LOOP
    v_result := v_result - v_key;
  END LOOP;
  RETURN v_result;
END;
$$;

-- Public view: hides redacted output_summary keys; never exposes input_snapshot
CREATE OR REPLACE VIEW public.provenance_events_public
WITH (security_invoker = true)
AS
SELECT
  pe.id,
  pe.owner_id,
  pe.actor_id,
  pe.entity_type,
  pe.entity_id,
  pe.event_type,
  pe.actor_role,
  pe.hash_alg,
  pe.harness_version,
  pe.policy_version,
  pe.policy_hash,
  pe.input_hash,
  pe.output_hash,
  pe.evaluation_hash,
  pe.event_hash,
  pe.chain_hash,
  public.provenance_public_summary(pe.id, pe.output_summary) AS output_summary,
  pe.parent_event_id,
  pe.chain_sequence,
  pe.root_event_type,
  pe.root_event_id,
  pe.device_id,
  pe.client_operation_id,
  pe.occurred_at,
  pe.ingested_at,
  pe.created_at
FROM public.provenance_events pe;

COMMENT ON VIEW public.provenance_events_public IS
  'Owner-scoped via base table RLS. Masks fields listed in append-only privacy/system.redacted events.';

-- ----------------------------------------------------------------------------
-- Core RPC: append_provenance_event
-- SECURITY DEFINER: INSERT without authenticated table INSERT grant.
-- owner_id set server-side; chain_hash/event_hash computed server-side.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_provenance_event(
  p_actor_id UUID,
  p_actor_role TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_event_type TEXT,
  p_policy_version TEXT,
  p_policy_hash TEXT,
  p_harness_version TEXT,
  p_output_summary JSONB,
  p_input_hash TEXT,
  p_output_hash TEXT,
  p_evaluation_hash TEXT,
  p_client_operation_id UUID,
  p_occurred_at TIMESTAMPTZ,
  p_input_snapshot JSONB DEFAULT NULL,
  p_parent_event_id TEXT DEFAULT NULL,
  p_root_event_type TEXT DEFAULT NULL,
  p_root_event_id TEXT DEFAULT NULL,
  p_device_id UUID DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_owner_id UUID;
  v_existing_id TEXT;
  v_chain_sequence BIGINT;
  v_event_hash TEXT;
  v_chain_hash TEXT;
  v_parent_owner UUID;
  v_parent_entity_type TEXT;
  v_parent_entity_id TEXT;
  v_parent_chain TEXT;
BEGIN
  -- Idempotency: per-actor namespace prevents cross-user burn
  SELECT pe.id INTO v_existing_id
  FROM public.provenance_events pe
  WHERE pe.actor_id = p_actor_id
    AND pe.client_operation_id = p_client_operation_id;

  IF FOUND THEN
    RETURN v_existing_id;
  END IF;

  -- Resolve owner_id and actor auth
  IF p_actor_role = 'user' THEN
    v_uid := public.provenance_assert_user_actor(p_actor_id);
    v_owner_id := v_uid;
  ELSIF p_actor_role = 'moderator' THEN
    v_uid := public.provenance_require_authenticated();
    IF NOT public.provenance_is_admin() THEN
      RAISE EXCEPTION 'Forbidden: moderator provenance requires admin'
        USING ERRCODE = '42501';
    END IF;
    IF p_owner_id IS NULL THEN
      RAISE EXCEPTION 'owner_id required for moderator actor'
        USING ERRCODE = '22023';
    END IF;
    v_owner_id := p_owner_id;
  ELSIF p_actor_role IN ('system', 'harness') THEN
    PERFORM public.provenance_assert_privileged_actor(p_actor_role);
    IF p_owner_id IS NULL THEN
      RAISE EXCEPTION 'owner_id required for % actor', p_actor_role
        USING ERRCODE = '22023';
    END IF;
    v_owner_id := p_owner_id;
  ELSE
    RAISE EXCEPTION 'Invalid actor_role: %', p_actor_role
      USING ERRCODE = '22023';
  END IF;

  -- Redaction events: admin or service_role only
  IF p_event_type IN ('privacy.redacted', 'system.redacted') THEN
    IF p_actor_role = 'user' OR (p_actor_role = 'moderator' AND NOT public.provenance_is_admin()) THEN
      RAISE EXCEPTION 'Forbidden: redaction events require admin or service_role'
        USING ERRCODE = '42501';
    END IF;
    IF p_output_summary ->> 'target_event_id' IS NULL THEN
      RAISE EXCEPTION 'redaction events require output_summary.target_event_id'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Parent validation: same entity partition (not root_event_id)
  IF p_parent_event_id IS NOT NULL THEN
    SELECT pe.owner_id, pe.entity_type, pe.entity_id, pe.chain_hash
    INTO v_parent_owner, v_parent_entity_type, v_parent_entity_id, v_parent_chain
    FROM public.provenance_events pe
    WHERE pe.id = p_parent_event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent_event_id not found'
        USING ERRCODE = 'P0002';
    END IF;

    IF v_parent_entity_type IS DISTINCT FROM p_entity_type
       OR v_parent_entity_id IS DISTINCT FROM p_entity_id THEN
      RAISE EXCEPTION 'parent event entity mismatch'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Sequence per (entity_type, entity_id) only
  v_chain_sequence := public.provenance_assign_chain_sequence(p_entity_type, p_entity_id);

  IF v_chain_sequence = 0 AND p_parent_event_id IS NOT NULL THEN
    RAISE EXCEPTION 'parent_event_id must be null for chain_sequence 0'
      USING ERRCODE = '22023';
  END IF;

  IF v_chain_sequence > 0 AND p_parent_event_id IS NULL THEN
    RAISE EXCEPTION 'parent_event_id required for chain_sequence > 0'
      USING ERRCODE = '22023';
  END IF;

  v_event_hash := public.provenance_compute_event_hash(
    p_evaluation_hash, p_entity_type, p_entity_id, v_chain_sequence, p_parent_event_id
  );

  IF v_chain_sequence = 0 THEN
    v_chain_hash := v_event_hash;
  ELSE
    v_chain_hash := public.provenance_compute_chain_hash(v_parent_chain, v_event_hash);
  END IF;

  IF NOT public.provenance_verify_event_hashes(
    p_event_type, p_entity_type, p_entity_id, v_owner_id, p_actor_id, p_actor_role,
    p_policy_version, p_harness_version, p_policy_hash, p_output_summary,
    p_input_hash, p_output_hash, p_evaluation_hash,
    v_chain_sequence, p_parent_event_id, v_event_hash, v_chain_hash
  ) THEN
    RAISE EXCEPTION 'Hash verification failed'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.provenance_events (
    id, owner_id, actor_id, entity_type, entity_id, event_type, actor_role,
    hash_alg, harness_version, policy_version, policy_hash,
    input_hash, output_hash, evaluation_hash, event_hash, chain_hash,
    input_snapshot, output_summary, parent_event_id, chain_sequence,
    root_event_type, root_event_id, device_id, client_operation_id,
    occurred_at
  ) VALUES (
    p_evaluation_hash, v_owner_id, p_actor_id, p_entity_type, p_entity_id, p_event_type, p_actor_role,
    'sha256-v1', p_harness_version, p_policy_version, p_policy_hash,
    p_input_hash, p_output_hash, p_evaluation_hash, v_event_hash, v_chain_hash,
    p_input_snapshot, p_output_summary, p_parent_event_id, v_chain_sequence,
    p_root_event_type, p_root_event_id, p_device_id, p_client_operation_id,
    p_occurred_at
  );

  RETURN p_evaluation_hash;
END;
$$;

COMMENT ON FUNCTION public.append_provenance_event IS
  'SECURITY DEFINER: append-only provenance ingest. owner_id frozen at ingest. '
  'UNIQUE(actor_id, client_operation_id) prevents idempotency burn. input_snapshot never hashed.';

-- ----------------------------------------------------------------------------
-- Batch append
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_provenance_events_batch(
  p_events JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event JSONB;
  v_ids JSONB := '[]'::JSONB;
  v_id TEXT;
BEGIN
  IF jsonb_typeof(p_events) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_events must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  FOR v_event IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    v_id := public.append_provenance_event(
      (v_event ->> 'actor_id')::UUID,
      v_event ->> 'actor_role',
      v_event ->> 'entity_type',
      v_event ->> 'entity_id',
      v_event ->> 'event_type',
      v_event ->> 'policy_version',
      v_event ->> 'policy_hash',
      v_event ->> 'harness_version',
      v_event -> 'output_summary',
      v_event ->> 'input_hash',
      v_event ->> 'output_hash',
      v_event ->> 'evaluation_hash',
      (v_event ->> 'client_operation_id')::UUID,
      (v_event ->> 'occurred_at')::TIMESTAMPTZ,
      v_event -> 'input_snapshot',
      v_event ->> 'parent_event_id',
      v_event ->> 'root_event_type',
      v_event ->> 'root_event_id',
      NULLIF(v_event ->> 'device_id', '')::UUID,
      NULLIF(v_event ->> 'owner_id', '')::UUID
    );
    v_ids := v_ids || jsonb_build_array(v_id);
  END LOOP;

  RETURN jsonb_build_object('ids', v_ids, 'count', jsonb_array_length(v_ids));
END;
$$;

-- ----------------------------------------------------------------------------
-- Read / verify RPCs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_provenance_chain(
  p_entity_type TEXT,
  p_entity_id TEXT
)
RETURNS SETOF public.provenance_events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT pe.owner_id INTO v_owner_id
  FROM public.provenance_events pe
  WHERE pe.entity_type = p_entity_type
    AND pe.entity_id = p_entity_id
  ORDER BY pe.chain_sequence ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM public.provenance_assert_owner_or_admin(v_owner_id);

  RETURN QUERY
  SELECT pe.*
  FROM public.provenance_events pe
  WHERE pe.entity_type = p_entity_type
    AND pe.entity_id = p_entity_id
  ORDER BY pe.chain_sequence ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_provenance_chain(
  p_entity_type TEXT,
  p_entity_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
  v_row RECORD;
  v_break_index BIGINT := NULL;
  v_ok BOOLEAN := TRUE;
BEGIN
  SELECT pe.owner_id INTO v_owner_id
  FROM public.provenance_events pe
  WHERE pe.entity_type = p_entity_type
    AND pe.entity_id = p_entity_id
  ORDER BY pe.chain_sequence ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', TRUE, 'event_count', 0, 'message', 'empty chain');
  END IF;

  PERFORM public.provenance_assert_owner_or_admin(v_owner_id);

  FOR v_row IN
    SELECT *
    FROM public.provenance_events pe
    WHERE pe.entity_type = p_entity_type
      AND pe.entity_id = p_entity_id
    ORDER BY pe.chain_sequence ASC
  LOOP
    IF NOT public.provenance_verify_event_hashes(
      v_row.event_type, v_row.entity_type, v_row.entity_id, v_row.owner_id,
      v_row.actor_id, v_row.actor_role, v_row.policy_version, v_row.harness_version,
      v_row.policy_hash, v_row.output_summary, v_row.input_hash, v_row.output_hash,
      v_row.evaluation_hash, v_row.chain_sequence, v_row.parent_event_id,
      v_row.event_hash, v_row.chain_hash
    ) THEN
      v_ok := FALSE;
      v_break_index := v_row.chain_sequence;
      EXIT;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', v_ok,
    'break_index', v_break_index,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'input_snapshot_excluded', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_latest_provenance_event(
  p_entity_type TEXT,
  p_entity_id TEXT
)
RETURNS public.provenance_events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result public.provenance_events;
  v_owner_id UUID;
BEGIN
  SELECT pe.* INTO v_result
  FROM public.provenance_events pe
  WHERE pe.entity_type = p_entity_type
    AND pe.entity_id = p_entity_id
  ORDER BY pe.chain_sequence DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  PERFORM public.provenance_assert_owner_or_admin(v_result.owner_id);
  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.provenance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY provenance_owner_read ON public.provenance_events
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY provenance_admin_read ON public.provenance_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated — RPC-only append path

-- ----------------------------------------------------------------------------
-- Privileges
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.provenance_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.provenance_events TO authenticated;
GRANT SELECT ON public.provenance_events_public TO authenticated;

GRANT EXECUTE ON FUNCTION public.append_provenance_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_provenance_events_batch TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_provenance_chain TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_provenance_chain TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_provenance_event TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.provenance_require_authenticated TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provenance_assert_owner_or_admin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provenance_assert_user_actor TO authenticated, service_role;
