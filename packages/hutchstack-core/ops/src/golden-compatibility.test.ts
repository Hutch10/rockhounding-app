import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { AlertRule, DashboardSpec } from './index';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-ops golden fixtures', () => {
  it('golden ops-dashboard-base fixture matches DashboardSpec shape', () => {
    const raw = readFileSync(join(fixturesDir, 'ops-dashboard-base.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as DashboardSpec;
    expect(fixture.panels.length).toBeGreaterThan(0);
    expect(fixture.panels[0]).toHaveProperty('id');
    expect(fixture.panels[0]).toHaveProperty('source');
  });

  it('golden ops-alert-rule fixture matches AlertRule shape', () => {
    const raw = readFileSync(join(fixturesDir, 'ops-alert-rule.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as AlertRule;
    expect(['P0', 'P1', 'P2', 'P3']).toContain(fixture.severity);
    expect(fixture).toHaveProperty('condition');
  });
});

describe('@hutchstack/core-ops (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });
});
