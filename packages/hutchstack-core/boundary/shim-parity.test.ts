/**
 * Phase 1 shim parity — golden fixtures must validate under Core and Rockhound shared schemas.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LedgerOperationSummarySchema as CoreLedgerSchema } from '@hutchstack/core-offline-ledger';
import {
  SyncBatchRequestSchema as CoreSyncBatchRequestSchema,
  SyncBatchResponseSchema as CoreSyncBatchResponseSchema,
} from '@hutchstack/core-sync-v1';
import { BaseTelemetryEventSchema as CoreBaseTelemetrySchema } from '@hutchstack/core-telemetry';
import {
  BaseTelemetryEventSchema as SharedBaseTelemetrySchema,
  SyncBatchRequestSchema as SharedSyncBatchRequestSchema,
  SyncBatchResponseSchema as SharedSyncBatchResponseSchema,
} from '../../../packages/shared/src/telemetry.ts';
import {
  SyncBatchRequestSchema as SharedSyncBatchFromV1,
  SyncBatchResponseSchema as SharedSyncBatchResponseFromV1,
} from '../../../packages/shared/src/v1-contract.ts';
import { describe, expect, it } from 'vitest';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');

function loadFixture(name: string): unknown {
  const raw = readFileSync(join(fixturesDir, name), 'utf-8');
  return JSON.parse(raw) as unknown;
}

describe('HutchStack Core Phase 1 shim parity', () => {
  it('sync-batch-request golden validates under Core and @rockhounding/shared shims', () => {
    const fixture = loadFixture('sync-batch-request.golden.json');
    expect(CoreSyncBatchRequestSchema.parse(fixture)).toBeTruthy();
    expect(SharedSyncBatchFromV1.parse(fixture)).toBeTruthy();
  });

  it('sync-batch-response golden validates under Core and @rockhounding/shared shims', () => {
    const fixture = loadFixture('sync-batch-response.golden.json');
    expect(CoreSyncBatchResponseSchema.parse(fixture)).toBeTruthy();
    expect(SharedSyncBatchResponseFromV1.parse(fixture)).toBeTruthy();
  });

  it('telemetry-event golden validates under Core and @rockhounding/shared shims', () => {
    const fixture = loadFixture('telemetry-event.golden.json');
    expect(CoreBaseTelemetrySchema.parse(fixture)).toBeTruthy();
    expect(SharedBaseTelemetrySchema.parse(fixture)).toBeTruthy();
  });

  it('ledger-operation-summary golden validates under Core schema', () => {
    const fixture = loadFixture('ledger-operation-summary.golden.json');
    expect(CoreLedgerSchema.parse(fixture)).toBeTruthy();
  });

  it('shared v1-contract and telemetry barrels re-export sync batch schemas', () => {
    expect(SharedSyncBatchFromV1).toBe(CoreSyncBatchRequestSchema);
    expect(SharedSyncBatchResponseFromV1).toBe(CoreSyncBatchResponseSchema);
    expect(SharedBaseTelemetrySchema).toBe(CoreBaseTelemetrySchema);
  });
});
