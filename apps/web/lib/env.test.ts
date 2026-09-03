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
});
