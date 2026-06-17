import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';

const policyDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/policy');
const jsonFixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');

function loadYaml<T>(name: string): T {
  return parseYaml(readFileSync(join(policyDir, name), 'utf-8')) as T;
}

describe('HutchStack Core Phase 1 policy YAML fixtures', () => {
  it('dashboard-base.yaml matches golden dashboard JSON structure', () => {
    const yaml = loadYaml<{ id: string; panels: Array<{ id: string }> }>('dashboard-base.yaml');
    const json = JSON.parse(
      readFileSync(join(jsonFixturesDir, 'ops-dashboard-base.golden.json'), 'utf-8')
    ) as { id: string; panels: Array<{ id: string }> };
    expect(yaml.panels.map((p) => p.id)).toEqual(json.panels.map((p) => p.id));
  });

  it('alerts-base.yaml includes P0 block-promote rules', () => {
    const yaml = loadYaml<{ alerts: Array<{ severity: string; blockPromote?: boolean }> }>(
      'alerts-base.yaml'
    );
    const p0 = yaml.alerts.filter((a) => a.severity === 'P0');
    expect(p0.length).toBeGreaterThan(0);
    expect(p0.some((a) => a.blockPromote)).toBe(true);
  });

  it('meta-003.yaml matches certification golden fixture id', () => {
    const yaml = loadYaml<{ id: string }>('meta-003.yaml');
    const json = JSON.parse(
      readFileSync(join(jsonFixturesDir, 'certification-gate.golden.json'), 'utf-8')
    ) as { id: string };
    expect(yaml.id).toBe(json.id);
  });

  it('regression-base.yaml includes R-01, R-02, R-09', () => {
    const yaml = loadYaml<{ items: Array<{ id: string }> }>('regression-base.yaml');
    const ids = yaml.items.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['R-01', 'R-02', 'R-09']));
  });

  it('readiness-v1.yaml links certification gate', () => {
    const yaml = loadYaml<{ gates: Array<{ id: string; linksTo?: string }> }>('readiness-v1.yaml');
    expect(yaml.gates.some((g) => g.linksTo === 'meta-003.yaml')).toBe(true);
  });
});
