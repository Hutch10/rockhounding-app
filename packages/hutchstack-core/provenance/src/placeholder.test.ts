import { describe, expect, it } from 'vitest';

describe('@hutchstack/core-provenance (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });

  it('ProvenanceEmitter is interface-only', async () => {
    const mod = await import('./index');
    expect(mod.ProvenanceEmitter).toBeUndefined();
  });
});
