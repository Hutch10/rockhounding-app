import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ReadinessScorecard } from './index';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-readiness golden fixtures', () => {
  it('golden readiness-scorecard matches ReadinessScorecard shape', () => {
    const raw = readFileSync(join(fixturesDir, 'readiness-scorecard.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as ReadinessScorecard;
    expect(fixture.gates.some((g) => g.critical)).toBe(true);
    expect(['reliability', 'field', 'ops', 'certification']).toContain(fixture.gates[0]?.group);
  });
});

describe('@hutchstack/core-readiness (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });
});
