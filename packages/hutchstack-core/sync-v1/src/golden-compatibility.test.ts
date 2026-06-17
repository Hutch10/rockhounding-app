import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SyncBatchRequestSchema as CoreSyncBatchRequestSchema,
  SyncBatchResponseSchema as CoreSyncBatchResponseSchema,
} from '@hutchstack/core-sync-v1';
import { describe, expect, it } from 'vitest';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-sync-v1 golden compatibility (Core schemas)', () => {
  it('golden sync-batch-request validates against Core SyncBatchRequestSchema', () => {
    const raw = readFileSync(join(fixturesDir, 'sync-batch-request.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as unknown;
    expect(CoreSyncBatchRequestSchema.parse(fixture)).toBeTruthy();
  });

  it('golden sync-batch-response validates against Core SyncBatchResponseSchema', () => {
    const raw = readFileSync(join(fixturesDir, 'sync-batch-response.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as unknown;
    expect(CoreSyncBatchResponseSchema.parse(fixture)).toBeTruthy();
  });
});

describe('@hutchstack/core-sync-v1 (Phase 1)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.1.0-phase1');
  });
});
