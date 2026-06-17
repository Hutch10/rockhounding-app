import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { CertificationGate } from './index';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-certification golden fixtures', () => {
  it('golden certification-gate matches CertificationGate shape', () => {
    const raw = readFileSync(join(fixturesDir, 'certification-gate.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as CertificationGate;
    expect(fixture.id).toBe('META-003');
    expect(fixture.sections.length).toBeGreaterThan(0);
    expect(fixture.blockers.some((b) => b.failClosed)).toBe(true);
  });
});

describe('@hutchstack/core-certification (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });
});
