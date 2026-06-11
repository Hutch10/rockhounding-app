/**
 * Migration 00001A contract tests — sync security hardening.
 *
 * Validates the additive SQL migration encodes ownership assertions required to
 * close SECURITY DEFINER / RLS-bypass IDOR paths. Full cross-user behavioral
 * proof runs on a disposable Supabase project during replay certification.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect, beforeAll } from 'vitest';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../../../../supabase/migrations/20260608000001_sync_security_hardening.sql'
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

describe('20260608000001_sync_security_hardening.sql', () => {
  let sql: string;

  beforeAll(() => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    sql = readMigration();
  });

  it('exists as additive migration without modifying baseline filename', () => {
    expect(sql).toContain('Migration 00001A: Sync Security Hardening');
    expect(sql).not.toContain('20260608000000_baseline_rockhounding_v1');
    const baselinePath = path.resolve(
      __dirname,
      '../../../../../supabase/migrations/20260608000000_baseline_rockhounding_v1.sql'
    );
    expect(fs.existsSync(baselinePath)).toBe(true);
  });

  describe('helper functions', () => {
    it('defines all four ownership helpers with SECURITY INVOKER', () => {
      for (const helper of [
        'sync_require_authenticated',
        'sync_assert_caller_is',
        'sync_assert_queue_owner',
        'sync_assert_conflict_owner',
      ]) {
        expect(sql).toMatch(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${helper}\\(`, 'i'));
        const block = extractFunctionBlock(sql, helper);
        const body = extractFunctionBody(sql, helper);
        expect(block).toMatch(/SECURITY INVOKER/i);
        expect(block).toMatch(/SET search_path = public, pg_temp/i);
        if (helper === 'sync_require_authenticated') {
          expect(body).toMatch(/auth\.uid\(\)/);
        } else {
          expect(body).toMatch(/sync_require_authenticated\(\)/);
        }
      }
    });

    it('sync_assert_caller_is rejects mismatched p_user_id', () => {
      const body = extractFunctionBody(sql, 'sync_assert_caller_is');
      expect(body).toMatch(/p_user_id IS DISTINCT FROM v_uid/);
      expect(body).toMatch(/ERRCODE = '42501'/);
    });

    it('sync_assert_queue_owner joins sync_queue.user_id to auth.uid()', () => {
      const body = extractFunctionBody(sql, 'sync_assert_queue_owner');
      expect(body).toMatch(/FROM public\.sync_queue/);
      expect(body).toMatch(/v_owner IS DISTINCT FROM v_uid/);
    });
  });

  describe('cross-user mutation denial (contract)', () => {
    it('User A cannot enqueue for User B — enqueue_sync_operation', () => {
      const block = extractFunctionBlock(sql, 'enqueue_sync_operation');
      const body = extractFunctionBody(sql, 'enqueue_sync_operation');
      expect(body).toMatch(/sync_assert_caller_is\(p_user_id\)/);
      expect(block).toMatch(/SECURITY DEFINER/i);
      expect(block).toMatch(/SET search_path = public, pg_temp/i);
      expect(body).toMatch(/INSERT INTO public\.sync_queue[\s\S]*v_uid/);
      expect(body).not.toMatch(/VALUES \(\s*p_user_id,/);
    });

    it('User A cannot read User B sync state — get_sync_state', () => {
      const body = extractFunctionBody(sql, 'get_sync_state');
      expect(body).toMatch(/sync_assert_caller_is\(p_user_id\)/);
    });

    it('User A cannot get User B sync batch — get_next_sync_batch', () => {
      const body = extractFunctionBody(sql, 'get_next_sync_batch');
      expect(body).toMatch(/sync_assert_caller_is\(p_user_id\)/);
    });

    it('User A cannot mark User B sync success — mark_sync_success', () => {
      const body = extractFunctionBody(sql, 'mark_sync_success');
      expect(body).toMatch(/sync_assert_queue_owner\(p_sync_id\)/);
    });

    it('User A cannot mark User B sync error — mark_sync_error', () => {
      const body = extractFunctionBody(sql, 'mark_sync_error');
      expect(body).toMatch(/sync_assert_queue_owner\(p_sync_id\)/);
    });

    it('User A cannot create conflict on User B queue item — create_sync_conflict', () => {
      const body = extractFunctionBody(sql, 'create_sync_conflict');
      expect(body).toMatch(/sync_assert_queue_owner\(p_sync_id\)/);
    });

    it('User A cannot resolve User B conflict — resolve_sync_conflict', () => {
      const body = extractFunctionBody(sql, 'resolve_sync_conflict');
      expect(body).toMatch(/sync_assert_conflict_owner\(p_conflict_id\)/);
      expect(body).toMatch(/resolved_by = v_uid/);
      expect(body).not.toMatch(/resolved_by = p_resolved_by/);
    });

    it('cleanup_old_sync_data is not callable by authenticated users', () => {
      expect(sql).toMatch(
        /REVOKE EXECUTE ON FUNCTION public\.cleanup_old_sync_data\(\) FROM PUBLIC, anon, authenticated/i
      );
      expect(sql).toMatch(
        /GRANT EXECUTE ON FUNCTION public\.cleanup_old_sync_data\(\) TO service_role/i
      );
    });
  });

  describe('own-user sync paths (contract)', () => {
    it('enqueue_sync_operation binds rows to authenticated caller', () => {
      const body = extractFunctionBody(sql, 'enqueue_sync_operation');
      expect(body).toMatch(/v_uid := public\.sync_assert_caller_is\(p_user_id\)/);
      expect(body).toMatch(/INSERT INTO public\.sync_state[\s\S]*v_uid/);
    });

    it('resolve_sync_conflict records auth.uid() as resolver', () => {
      const body = extractFunctionBody(sql, 'resolve_sync_conflict');
      expect(body).toMatch(/v_uid := public\.sync_require_authenticated\(\)/);
      expect(body).toMatch(/resolved_by = v_uid/);
    });

    it('all mutating RPCs retain SECURITY DEFINER with search_path hardening', () => {
      for (const fn of [
        'enqueue_sync_operation',
        'get_next_sync_batch',
        'mark_sync_success',
        'mark_sync_error',
        'create_sync_conflict',
        'resolve_sync_conflict',
        'get_sync_state',
        'cleanup_old_sync_data',
      ]) {
        const block = extractFunctionBlock(sql, fn);
        expect(block, `${fn} block`).toBeTruthy();
        expect(block).toMatch(/SECURITY DEFINER/i);
        expect(block).toMatch(/SET search_path = public, pg_temp/i);
      }
    });

    it('documents why SECURITY DEFINER is retained on COMMENT', () => {
      expect(sql).toMatch(/Ownership enforced via sync_assert_caller_is/);
      expect(sql).toMatch(/no RLS INSERT policy/);
      expect(sql).toMatch(/p_resolved_by ignored/);
    });
  });
});
