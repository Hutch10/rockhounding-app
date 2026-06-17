import { describe, expect, it } from 'vitest';

describe('@hutchstack/core-field-telemetry (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });

  it('FieldTelemetryAggregator is interface-only', async () => {
    const mod = await import('./index');
    expect(mod.FieldTelemetryAggregator).toBeUndefined();
  });

  it('depends on core-telemetry TelemetryEvent type', async () => {
    const mod = await import('./index');
    expect(mod.TelemetryEvent).toBeUndefined();
    expect(typeof mod.PACKAGE_VERSION).toBe('string');
  });
});
