import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BaseTelemetryEventSchema } from '@hutchstack/core-telemetry';
import { describe, expect, it } from 'vitest';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-telemetry golden compatibility (Core schemas)', () => {
  it('golden telemetry-event validates against Core BaseTelemetryEventSchema', () => {
    const raw = readFileSync(join(fixturesDir, 'telemetry-event.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as unknown;
    expect(BaseTelemetryEventSchema.parse(fixture)).toBeTruthy();
  });

  it('field-ops catalog includes sync_queue_depth and quick_log_completed', async () => {
    const mod = await import('./index');
    const names = mod.FIELD_OPS_EVENT_CATALOG.map((e: { eventName: string }) => e.eventName);
    expect(names).toContain('sync_queue_depth');
    expect(names).toContain('quick_log_completed');
  });
});

describe('@hutchstack/core-telemetry (Phase 1)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.1.0-phase1');
  });
});
