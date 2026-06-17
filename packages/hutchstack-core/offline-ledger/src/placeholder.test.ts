import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LedgerOperationSummarySchema } from '@hutchstack/core-offline-ledger';
import { describe, expect, it } from 'vitest';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-offline-ledger golden compatibility (Core schemas)', () => {
  it('golden ledger-operation-summary validates against Core LedgerOperationSummarySchema', () => {
    const raw = readFileSync(join(fixturesDir, 'ledger-operation-summary.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as unknown;
    expect(LedgerOperationSummarySchema.parse(fixture)).toBeTruthy();
  });

  it('QUEUE_ITEM_TO_CORE_STATUS maps DONE to APPLIED', async () => {
    const mod = await import('./index');
    expect(mod.QUEUE_ITEM_TO_CORE_STATUS.DONE).toBe('APPLIED');
    expect(mod.QUEUE_ITEM_TO_CORE_STATUS.FAILED_TERMINAL).toBe('FAILED');
  });
});

describe('@hutchstack/core-offline-ledger (Phase 1)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.1.0-phase1');
  });
});
