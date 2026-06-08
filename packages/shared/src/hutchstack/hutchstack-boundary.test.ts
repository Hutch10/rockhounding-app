/* eslint-disable */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const hutchstackRoot = fileURLToPath(new URL('.', import.meta.url));

const SERVER_ONLY_PREFIXES = ['server', join('hash', 'node.ts')];

function isClientSafeModule(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.endsWith('.test.ts')) return false;
  if (normalized.startsWith('server/')) return false;
  if (normalized === 'hash/node.ts') return false;
  return normalized.endsWith('.ts');
}

function collectClientModules(dir: string, base: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(base, full);
    if (statSync(full).isDirectory()) {
      if (rel === 'server') continue;
      files.push(...collectClientModules(full, base));
    } else if (isClientSafeModule(rel)) {
      files.push(full);
    }
  }
  return files;
}

describe('HutchStack client/server boundary', () => {
  it('client-safe hutchstack modules do not import node:crypto', () => {
    const clientFiles = collectClientModules(hutchstackRoot, hutchstackRoot);
    expect(clientFiles.length).toBeGreaterThan(5);

    for (const file of clientFiles) {
      const content = readFileSync(file, 'utf8');
      expect(content, relative(hutchstackRoot, file)).not.toMatch(/from ['"]node:crypto['"]/);
      expect(content, relative(hutchstackRoot, file)).not.toMatch(/from ['"]\.\/server\//);
      expect(content, relative(hutchstackRoot, file)).not.toMatch(/from ['"]\.\/hash\/node['"]/);
    }
  });

  it('server hash module uses node:crypto', () => {
    const nodeHash = readFileSync(join(hutchstackRoot, 'hash', 'node.ts'), 'utf8');
    expect(nodeHash).toMatch(/node:crypto/);
  });

  it('main shared index does not export server-only harness symbols', () => {
    const indexPath = fileURLToPath(new URL('../index.ts', import.meta.url));
    const content = readFileSync(indexPath, 'utf8');
    expect(content).not.toMatch(/runHarnessEvaluation/);
    expect(content).not.toMatch(/hashCanonical/);
    expect(content).not.toMatch(/computePolicyHash/);
    expect(content).not.toMatch(/from ['"]\.\/hutchstack\/server['"]/);
  });

  it('client hutchstack index does not re-export server entry', () => {
    const clientIndex = readFileSync(join(hutchstackRoot, 'index.ts'), 'utf8');
    expect(clientIndex).not.toMatch(/runHarnessEvaluation/);
    expect(clientIndex).not.toMatch(/hash\/node/);
    expect(clientIndex).not.toMatch(/\.\/server/);
  });
});
