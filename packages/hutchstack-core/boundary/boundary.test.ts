/**
 * Phase 1 boundary — apps/web must not import @hutchstack/core-* directly.
 * @rockhounding/shared is the approved shim layer for contract re-exports.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCAN_DIRS = [join(ROOT, 'apps/web')];

const IMPORT_PATTERN = /@hutchstack\/core-/;

const APPROVED_SHIM_FILES = new Set([
  'packages/shared/src/v1-contract.ts',
  'packages/shared/src/telemetry.ts',
  'packages/shared/src/sync-engine.ts',
]);

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function relativePath(full: string): string {
  return full
    .replace(ROOT + '\\', '')
    .replace(ROOT + '/', '')
    .replace(/\\/g, '/');
}

describe('HutchStack Core Phase 1 boundary', () => {
  it('apps/web does not import @hutchstack/core-* packages', () => {
    const violations: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of collectSourceFiles(dir)) {
        const content = readFileSync(file, 'utf-8');
        if (IMPORT_PATTERN.test(content)) {
          violations.push(relativePath(file));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('shared shim files are the only production sources importing @hutchstack/core-*', () => {
    const sharedDir = join(ROOT, 'packages/shared/src');
    const importers: string[] = [];

    for (const file of collectSourceFiles(sharedDir)) {
      const content = readFileSync(file, 'utf-8');
      if (IMPORT_PATTERN.test(content)) {
        importers.push(relativePath(file));
      }
    }

    expect(new Set(importers)).toEqual(APPROVED_SHIM_FILES);
  });

  it('certified sync path files exist', () => {
    const orchestrator = join(ROOT, 'apps/web/lib/sync/orchestrator.ts');
    const batchRoute = join(ROOT, 'apps/web/app/api/v1/sync/batch');
    expect(statSync(orchestrator).isFile()).toBe(true);
    expect(statSync(batchRoute).isDirectory()).toBe(true);
  });
});
