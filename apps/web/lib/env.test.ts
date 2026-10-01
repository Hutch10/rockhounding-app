import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGci.test.anon',
};

describe('validateEnv minimum-privilege contract', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('passes with Supabase client vars only (no Mapbox or service role)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE_ENV.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).not.toThrow();
  });

  it('rejects invalid Mapbox token format when provided', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE_ENV.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'sk.secret-token');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_MAPBOX_TOKEN must start with pk/);
  });

  it('accepts optional public Mapbox pk token when provided', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE_ENV.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test.mapbox.token');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).not.toThrow();
  });

  it('rejects deleted/dead Supabase project refs', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://vulsndadskalrmcgfyjm.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/deleted\/dead Supabase project ref/);
  });

  it('accepts local Docker Supabase http URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_ATLAS_DATA_PLANE', 'local');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).not.toThrow();
  });

  it('rejects Preview==Production when isolation required', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dcbjjvygjhmngwzuwdjj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_ATLAS_DATA_PLANE', 'preview');
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/must not equal Production/);
  });

  it('rejects browser-exposed service-role NEXT_PUBLIC_ var', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE_ENV.NEXT_PUBLIC_SUPABASE_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGci.service.role.key.material');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/Browser-exposed service-role/);
  });

  it('fails local isolation when Production URL used with ROCKY_REQUIRE_NONPROD_ISOLATION', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dcbjjvygjhmngwzuwdjj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_ATLAS_DATA_PLANE', 'local');
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '1');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(
      /requires NEXT_PUBLIC_SUPABASE_URL to be http:\/\/127\.0\.0\.1:54321/
    );
  });

  it('assertSyncBatchNonProdTarget no-ops when isolation flag unset (local tests OK)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dcbjjvygjhmngwzuwdjj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '');
    vi.stubEnv('VERCEL_ENV', '');

    const { assertSyncBatchNonProdTarget } = await import('./env');
    expect(() => assertSyncBatchNonProdTarget()).not.toThrow();
  });

  it('assertSyncBatchNonProdTarget fails on Vercel Preview targeting Production (H3)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dcbjjvygjhmngwzuwdjj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '');
    vi.stubEnv('VERCEL_ENV', 'preview');

    const { assertSyncBatchNonProdTarget } = await import('./env');
    expect(() => assertSyncBatchNonProdTarget()).toThrow(
      /forbids sync\/batch targeting Production/
    );
  });

  it('validateEnv rejects Vercel Preview pointing at Production without explicit flag', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dcbjjvygjhmngwzuwdjj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('ROCKY_ATLAS_DATA_PLANE', 'preview');

    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/Preview isolation required/);
  });
  it('assertSyncBatchNonProdTarget allows local URL under isolation', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_ATLAS_DATA_PLANE', 'local');
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '1');

    const { assertSyncBatchNonProdTarget } = await import('./env');
    expect(() => assertSyncBatchNonProdTarget()).not.toThrow();
  });

  it('assertSyncBatchNonProdTarget fails when sync would target Production under isolation', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dcbjjvygjhmngwzuwdjj.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '1');

    const { assertSyncBatchNonProdTarget } = await import('./env');
    expect(() => assertSyncBatchNonProdTarget()).toThrow(
      /forbids sync\/batch targeting Production/
    );
  });

  it('assertSyncBatchNonProdTarget fails when data plane is production under isolation', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', BASE_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    vi.stubEnv('ROCKY_ATLAS_DATA_PLANE', 'production');
    vi.stubEnv('ROCKY_REQUIRE_NONPROD_ISOLATION', '1');

    const { assertSyncBatchNonProdTarget } = await import('./env');
    expect(() => assertSyncBatchNonProdTarget()).toThrow(
      /forbids ROCKY_ATLAS_DATA_PLANE=production/
    );
  });

  it('isProductionSupabaseUrl distinguishes Production from local/preview refs', async () => {
    const { isProductionSupabaseUrl } = await import('./env');
    expect(isProductionSupabaseUrl('https://dcbjjvygjhmngwzuwdjj.supabase.co')).toBe(true);
    expect(isProductionSupabaseUrl('http://127.0.0.1:54321')).toBe(false);
    expect(isProductionSupabaseUrl('https://example.supabase.co')).toBe(false);
  });
});
