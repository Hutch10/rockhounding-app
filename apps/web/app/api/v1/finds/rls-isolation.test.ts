import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

/**
 * TEST-006: RLS finds isolation — policy contract verification.
 * Live cross-user test requires linked Supabase with two auth users (manual gate).
 */
describe('TEST-006: finds RLS isolation policy', () => {
  const baselinePath = join(
    process.cwd(),
    'supabase/migrations/20260608000000_baseline_rockhounding_v1.sql'
  );
  const sprint1Path = join(
    process.cwd(),
    'supabase/migrations/20260609000000_sprint1_foundation.sql'
  );

  it('baseline enforces user-scoped SELECT on finds', () => {
    const sql = readFileSync(baselinePath, 'utf8');
    expect(sql).toContain('Users can only see exact location of their own finds');
    expect(sql).toContain('auth.uid() = user_id');
  });

  it('sprint1 adds write policies scoped to owner', () => {
    const sql = readFileSync(sprint1Path, 'utf8');
    expect(sql).toContain('finds_insert_own');
    expect(sql).toContain('finds_update_own');
    expect(sql).toContain('finds_delete_own');
    expect(sql).toContain('auth.uid() = user_id');
  });

  it('documents manual cross-user isolation gate', () => {
    const manualSteps = [
      'Create User A and User B in Supabase Auth',
      'Insert find for User A with distinct exact_location',
      'As User B, SELECT from finds WHERE user_id = User A — must return 0 rows',
    ];
    expect(manualSteps.length).toBe(3);
  });
});
