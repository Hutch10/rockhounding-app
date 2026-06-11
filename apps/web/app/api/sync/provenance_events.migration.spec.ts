/**
 * Migration 00002 contract tests — provenance_events ledger.
 *
 * Validates hostile-review patches: frozen owner_id RLS, per-actor idempotency,
 * entity-scoped chain_sequence, Option B hash durability, append-only redaction.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect, beforeAll } from 'vitest';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../supabase/migrations/20260608000002_provenance_events.sql'
);

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, 'utf8');
}

function extractFunctionBlock(sql: string, functionName: string): string {
  const pattern = new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]*?\\$\\$;`,
    'i'
  );
  const match = sql.match(pattern);
  if (match == null) {
    throw new Error(`Function block not found: ${functionName}`);
  }
  return match[0];
}

function extractFunctionBody(sql: string, functionName: string): string {
  const block = extractFunctionBlock(sql, functionName);
  const bodyMatch = block.match(/\$\$\s*([\s\S]*?)\s*\$\$;/);
  if (bodyMatch == null || bodyMatch[1] == null) {
    throw new Error(`Function body not found: ${functionName}`);
  }
  return bodyMatch[1];
}

describe('20260608000002_provenance_events.sql', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    sql = readMigration();
  });

  it('exists as additive migration without modifying baseline or 00001', () => {
    expect(sql).toContain('Migration 00002: Provenance Events');
    expect(sql).not.toContain('20260608000000_baseline_rockhounding_v1');
    expect(sql).not.toContain('sync_security_hardening');
  });

  describe('schema', () => {
    it('defines required columns on provenance_events', () => {
      const tableBlock = sql.match(/CREATE TABLE public\.provenance_events \([\s\S]*?\);/)?.[0];
      expect(tableBlock).toBeTruthy();
      for (const col of [
        'owner_id UUID NOT NULL',
        'actor_id UUID NOT NULL',
        'entity_type TEXT NOT NULL',
        'entity_id TEXT NOT NULL',
        'client_operation_id UUID NOT NULL',
        'event_hash TEXT NOT NULL',
        'chain_hash TEXT NOT NULL',
        'chain_sequence BIGINT NOT NULL',
        'output_summary JSONB NOT NULL',
        'input_snapshot JSONB',
        'evaluation_hash TEXT NOT NULL',
        'input_hash TEXT NOT NULL',
        'output_hash TEXT NOT NULL',
      ]) {
        expect(tableBlock).toContain(col);
      }
    });

    it('uses per-actor idempotency UNIQUE(actor_id, client_operation_id)', () => {
      expect(sql).toMatch(/UNIQUE \(actor_id, client_operation_id\)/i);
      expect(sql).not.toMatch(/UNIQUE \(client_operation_id\)\s+WHERE/i);
    });

    it('sequences per entity via uq_provenance_entity_sequence', () => {
      expect(sql).toMatch(/UNIQUE \(entity_type, entity_id, chain_sequence\)/i);
      const assignBody = extractFunctionBody(sql, 'provenance_assign_chain_sequence');
      expect(assignBody).toMatch(/entity_type = p_entity_type/);
      expect(assignBody).toMatch(/entity_id = p_entity_id/);
      expect(assignBody).not.toMatch(/root_event_id/);
    });

    it('documents root_event_id as semantic only', () => {
      expect(sql).toMatch(/root_event_id IS[\s\S]*Semantic chain label only/i);
    });
  });

  describe('immutability and RLS', () => {
    it('prevents UPDATE and DELETE on provenance_events', () => {
      expect(sql).toMatch(/prevent_provenance_tampering/i);
      expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.provenance_events/i);
      expect(sql).toMatch(/BEFORE TRUNCATE ON public\.provenance_events/i);
    });

    it('owner_id RLS survives deleted parent entity — no domain joins', () => {
      expect(sql).toMatch(/CREATE POLICY provenance_owner_read[\s\S]*owner_id = auth\.uid\(\)/i);
      const rlsSection = sql.slice(sql.indexOf('ENABLE ROW LEVEL SECURITY'));
      expect(rlsSection).not.toMatch(/FROM public\.specimens/);
      expect(rlsSection).not.toMatch(/FROM public\.finds/);
      expect(sql).toMatch(/owner_id frozen at ingest/i);
    });

    it('revokes direct INSERT from authenticated users', () => {
      expect(sql).toMatch(
        /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.provenance_events FROM PUBLIC, anon, authenticated/i
      );
      const policies = sql.match(/CREATE POLICY[\s\S]*/)?.[0] ?? '';
      expect(policies).not.toMatch(/FOR INSERT/);
    });
  });

  describe('hash durability (Option B)', () => {
    it('input_snapshot purge does not break verification — never in hash functions', () => {
      for (const fn of [
        'provenance_compute_input_hash',
        'provenance_compute_output_hash',
        'provenance_compute_evaluation_hash',
        'provenance_compute_event_hash',
        'provenance_verify_event_hashes',
      ]) {
        const block = extractFunctionBlock(sql, fn);
        expect(block, fn).not.toMatch(/input_snapshot/i);
      }
    });

    it('verify_provenance_chain documents input_snapshot exclusion', () => {
      const body = extractFunctionBody(sql, 'verify_provenance_chain');
      expect(body).toMatch(/provenance_verify_event_hashes/);
      expect(body).toMatch(/input_snapshot_excluded/);
    });
  });

  describe('idempotency spoof prevention', () => {
    it('User B cannot burn User A client_operation_id — per-actor namespace', () => {
      const appendBody = extractFunctionBody(sql, 'append_provenance_event');
      expect(appendBody).toMatch(/pe\.actor_id = p_actor_id/);
      expect(appendBody).toMatch(/pe\.client_operation_id = p_client_operation_id/);
      expect(appendBody).toMatch(/provenance_assert_user_actor\(p_actor_id\)/);
    });
  });

  describe('sequence isolation', () => {
    it('assigns chain_sequence per (entity_type, entity_id) only', () => {
      const body = extractFunctionBody(sql, 'provenance_assign_chain_sequence');
      expect(body).toMatch(/pg_advisory_xact_lock/);
      expect(body).toMatch(/MAX\(pe\.chain_sequence\)/);
      expect(body).not.toMatch(/root_event_id/);
    });

    it('append validates parent entity matches partition not root', () => {
      const body = extractFunctionBody(sql, 'append_provenance_event');
      expect(body).toMatch(/v_parent_entity_type IS DISTINCT FROM p_entity_type/);
      expect(body).toMatch(/provenance_assign_chain_sequence\(p_entity_type, p_entity_id\)/);
    });
  });

  describe('redaction', () => {
    it('append-only redaction events without ledger mutation', () => {
      expect(sql).toMatch(/privacy\.redacted/);
      expect(sql).toMatch(/system\.redacted/);
      expect(sql).toMatch(/provenance_events_public/);
      expect(sql).toMatch(/provenance_public_summary/);
      expect(sql).toMatch(/provenance_redacted_field_keys/);
      const viewBlock = sql.match(
        /CREATE OR REPLACE VIEW public\.provenance_events_public[\s\S]*?FROM public\.provenance_events pe;/
      )?.[0];
      expect(viewBlock).not.toMatch(/input_snapshot/);
    });

    it('redaction does not break chain verification — base table unchanged', () => {
      const verifyBody = extractFunctionBody(sql, 'verify_provenance_chain');
      expect(verifyBody).toMatch(/FROM public\.provenance_events pe/);
      expect(verifyBody).not.toMatch(/provenance_events_public/);
      expect(sql).not.toMatch(/UPDATE public\.provenance_events/i);
    });
  });

  describe('RPC security', () => {
    it('own-user append succeeds via user actor assertion', () => {
      const body = extractFunctionBody(sql, 'append_provenance_event');
      expect(body).toMatch(/p_actor_role = 'user'/);
      expect(body).toMatch(/v_owner_id := v_uid/);
      expect(body).toMatch(/provenance_assert_user_actor\(p_actor_id\)/);
    });

    it('cross-user append fails — actor_id must match auth.uid()', () => {
      const body = extractFunctionBody(sql, 'provenance_assert_user_actor');
      expect(body).toMatch(/p_actor_id IS DISTINCT FROM v_uid/);
      expect(body).toMatch(/ERRCODE = '42501'/);
    });

    it('SECURITY DEFINER RPCs use search_path hardening', () => {
      for (const fn of [
        'append_provenance_event',
        'append_provenance_events_batch',
        'get_provenance_chain',
        'verify_provenance_chain',
        'get_latest_provenance_event',
      ]) {
        const block = extractFunctionBlock(sql, fn);
        expect(block, fn).toMatch(/SECURITY DEFINER/i);
        expect(block, fn).toMatch(/SET search_path = public, pg_temp/i);
      }
    });

    it('read RPCs assert owner or admin', () => {
      for (const fn of [
        'get_provenance_chain',
        'verify_provenance_chain',
        'get_latest_provenance_event',
      ]) {
        const body = extractFunctionBody(sql, fn);
        expect(body, fn).toMatch(/provenance_assert_owner_or_admin/);
      }
    });
  });
});
