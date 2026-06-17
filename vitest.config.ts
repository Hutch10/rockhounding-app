import path from 'path';

import { defineConfig } from 'vitest/config';

const core = (name: string): string =>
  path.resolve(__dirname, `./packages/hutchstack-core/${name}/src/index.ts`);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@': path.resolve(__dirname, './apps/web'),
      '@hutchstack/core-offline-ledger': core('offline-ledger'),
      '@hutchstack/core-sync-v1': core('sync-v1'),
      '@hutchstack/core-telemetry': core('telemetry'),
      '@hutchstack/core-field-telemetry': core('field-telemetry'),
      '@hutchstack/core-provenance': core('provenance'),
      '@hutchstack/core-ops': core('ops'),
      '@hutchstack/core-ops-incident': core('ops-incident'),
      '@hutchstack/core-certification': core('certification'),
      '@hutchstack/core-regression': core('regression'),
      '@hutchstack/core-readiness': core('readiness'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.config.{js,ts}', '**/*.d.ts', '**/types.ts'],
    },
  },
});
