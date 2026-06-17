import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { IncidentTemplate } from './index';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-ops-incident golden fixtures', () => {
  it('golden incident-template matches IncidentTemplate shape', () => {
    const raw = readFileSync(join(fixturesDir, 'incident-template.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as IncidentTemplate;
    expect(fixture.sections.length).toBeGreaterThan(0);
    expect(['P0', 'P1', 'P2', 'P3']).toContain(fixture.severity);
  });
});

describe('@hutchstack/core-ops-incident (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });
});
