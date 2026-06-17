import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { WatchlistSpec } from './index';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures');

describe('@hutchstack/core-regression golden fixtures', () => {
  it('golden regression-watchlist matches WatchlistSpec shape', () => {
    const raw = readFileSync(join(fixturesDir, 'regression-watchlist.golden.json'), 'utf-8');
    const fixture = JSON.parse(raw) as WatchlistSpec;
    expect(fixture.items.length).toBeGreaterThan(0);
    expect(fixture.items[0]).toHaveProperty('blockPromote');
  });
});

describe('@hutchstack/core-regression (Phase 0)', () => {
  it('exports PACKAGE_VERSION', async () => {
    const mod = await import('./index');
    expect(mod.PACKAGE_VERSION).toBe('0.0.0-phase0');
  });
});
