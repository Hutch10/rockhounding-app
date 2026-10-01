/**
 * Environment Variable Validation
 * Ensures all required environment variables are present at runtime
 *
 * This file should be imported at application startup (e.g., in layout.tsx)
 * to fail fast if critical configuration is missing.
 */

/** Deleted / known-bad Supabase project refs — never allow as runtime target. */
export const DEAD_SUPABASE_PROJECT_REFS = ['vulsndadskalrmcgfyjm', 'hszoybzhslltwfksuokt'] as const;

/** Production Rockhounding v1 project ref. */
export const PRODUCTION_SUPABASE_PROJECT_REF = 'dcbjjvygjhmngwzuwdjj' as const;

export const LOCAL_SUPABASE_URLS = ['http://127.0.0.1:54321', 'http://localhost:54321'] as const;

export type RockyAtlasDataPlane = 'local' | 'preview' | 'production';

/**
 * Required environment variables for client-side
 */
const requiredClientEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

/**
 * Server-only secrets used by privileged backend routes (not the web client).
 * Optional at web runtime — absence must not block login or core Preview shell.
 */
const optionalServerEnvVars = ['SUPABASE_SERVICE_ROLE_KEY'] as const;

/**
 * Optional environment variables with defaults
 */
const optionalEnvVars = {
  EXPORTS_BUCKET: 'exports',
  STATE_PACKS_BUCKET: 'state-packs',
} as const;

function extractSupabaseProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const m = /^([a-z0-9-]+)\.supabase\.co$/i.exec(host);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isLocalSupabaseUrl(url: string): boolean {
  const normalized = url.replace(/\/$/, '');
  return (LOCAL_SUPABASE_URLS as readonly string[]).includes(normalized);
}

export function resolveDataPlane(env: NodeJS.ProcessEnv = process.env): RockyAtlasDataPlane {
  const explicit = env.ROCKY_ATLAS_DATA_PLANE?.trim().toLowerCase();
  if (explicit === 'local' || explicit === 'preview' || explicit === 'production') {
    return explicit;
  }
  if (env.VERCEL_ENV === 'production') return 'production';
  if (env.VERCEL_ENV === 'preview') return 'preview';
  return 'local';
}

/** True when URL host is the Production Supabase project ref. */
export function isProductionSupabaseUrl(url: string): boolean {
  const ref = extractSupabaseProjectRef(url);
  return ref === PRODUCTION_SUPABASE_PROJECT_REF;
}

/**
 * Isolation is required when explicitly flagged OR when running on Vercel Preview
 * (H3: Preview must never silently write Production).
 * Local day-to-day without the flag remains allowed.
 */
export function isNonProdIsolationRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ROCKY_REQUIRE_NONPROD_ISOLATION === '1') return true;
  if (env.VERCEL_ENV === 'preview') return true;
  return false;
}

/**
 * Fail-closed guard for sync/write paths under non-prod isolation.
 *
 * When isolation is required (`ROCKY_REQUIRE_NONPROD_ISOLATION=1` or `VERCEL_ENV=preview`),
 * POST /api/v1/sync/batch (and similar privileged writes) must not target Production Supabase.
 *
 * No-ops when neither applies — legitimate local day-to-day tests and intentional
 * Production work (after OWNER_GATE_PRODUCTION) are not blocked.
 */
export function assertSyncBatchNonProdTarget(env: NodeJS.ProcessEnv = process.env): void {
  if (!isNonProdIsolationRequired(env)) {
    return;
  }

  const candidates = [env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_URL].filter(
    (u): u is string => typeof u === 'string' && u.trim() !== ''
  );

  for (const url of candidates) {
    if (isProductionSupabaseUrl(url)) {
      throw new Error(
        `Fail-closed: ROCKY_REQUIRE_NONPROD_ISOLATION=1 forbids sync/batch targeting Production ` +
          `(${PRODUCTION_SUPABASE_PROJECT_REF}). Use local http://127.0.0.1:54321 or a non-prod data plane.`
      );
    }
  }

  const dataPlane = resolveDataPlane(env);
  if (dataPlane === 'production') {
    throw new Error(
      `Fail-closed: ROCKY_REQUIRE_NONPROD_ISOLATION=1 forbids ROCKY_ATLAS_DATA_PLANE=production ` +
        `(sync/batch would mutate Production).`
    );
  }
}

/**
 * Validate that all required environment variables are present
 * Throws an error if any are missing or unsafe
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing: string[] = [];

  for (const varName of requiredClientEnvVars) {
    if (!env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
        missing.map((v) => `  - ${v}`).join('\n') +
        `\n\nPlease copy .env.example to .env.local and fill in the values.\n` +
        `See /docs/deployment.md for more information.`
    );
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serverUrl = env.SUPABASE_URL ?? '';

  for (const [label, url] of [
    ['NEXT_PUBLIC_SUPABASE_URL', supabaseUrl],
    ['SUPABASE_URL', serverUrl],
  ] as const) {
    if (!url) continue;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`${label} is not a valid URL`);
    }

    const isLocal = isLocalSupabaseUrl(url.replace(/\/$/, ''));
    if (!isLocal && parsed.protocol !== 'https:') {
      throw new Error(
        `${label} must use https:// (or local http://127.0.0.1:54321)\nGot: ${parsed.protocol}`
      );
    }

    const ref = extractSupabaseProjectRef(url);
    if (ref && (DEAD_SUPABASE_PROJECT_REFS as readonly string[]).includes(ref)) {
      throw new Error(
        `${label} points to deleted/dead Supabase project ref "${ref}". ` +
          `Use local http://127.0.0.1:54321 or Production ${PRODUCTION_SUPABASE_PROJECT_REF} deliberately.`
      );
    }
  }

  // Browser must never receive service-role material via NEXT_PUBLIC_*
  for (const key of Object.keys(env)) {
    if (key.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|service_role/i.test(key) && env[key]) {
      throw new Error(
        `Browser-exposed service-role key is forbidden (${key}). Remove NEXT_PUBLIC_ service-role vars.`
      );
    }
  }

  const dataPlane = resolveDataPlane(env);
  const publicRef = extractSupabaseProjectRef(supabaseUrl);

  if (dataPlane === 'local') {
    if (!isLocalSupabaseUrl(supabaseUrl.replace(/\/$/, ''))) {
      // Soft-warn path for existing apps/web/.env.local pointing at Production during day-to-day
      // work: fail hard only when isolation is required (flag or Vercel Preview).
      if (isNonProdIsolationRequired(env)) {
        throw new Error(
          `ROCKY_ATLAS_DATA_PLANE=local (or default local) with non-prod isolation required ` +
            `requires NEXT_PUBLIC_SUPABASE_URL to be http://127.0.0.1:54321 (got non-local URL).`
        );
      }
    }
  }

  if (dataPlane === 'preview' || env.VERCEL_ENV === 'preview') {
    if (publicRef === PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error(
        `Preview isolation required: NEXT_PUBLIC_SUPABASE_URL must not equal Production ` +
          `(${PRODUCTION_SUPABASE_PROJECT_REF}). Point Preview at local tunnel / non-prod.`
      );
    }
  }

  const mapboxToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (mapboxToken != null && mapboxToken !== '' && !mapboxToken.startsWith('pk.')) {
    throw new Error(
      `NEXT_PUBLIC_MAPBOX_TOKEN must start with pk.\n` + `Got: ${mapboxToken.substring(0, 10)}...`
    );
  }

  if (typeof window === 'undefined') {
    for (const varName of optionalServerEnvVars) {
      const value = env[varName];
      if (value != null && value !== '' && value.length < 20) {
        throw new Error(`${varName} appears too short to be a valid key`);
      }
    }
  }

  if (typeof window === 'undefined') {
    const exportsBucket = env.EXPORTS_BUCKET || optionalEnvVars.EXPORTS_BUCKET;
    const statePacksBucket = env.STATE_PACKS_BUCKET || optionalEnvVars.STATE_PACKS_BUCKET;

    if (exportsBucket === optionalEnvVars.EXPORTS_BUCKET) {
      console.warn(`⚠️  Using default EXPORTS_BUCKET: ${exportsBucket}`);
    }
    if (statePacksBucket === optionalEnvVars.STATE_PACKS_BUCKET) {
      console.warn(`⚠️  Using default STATE_PACKS_BUCKET: ${statePacksBucket}`);
    }
  }
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: keyof typeof process.env): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: keyof typeof optionalEnvVars): string {
  return process.env[key] || optionalEnvVars[key];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Validate environment on module load (server-side only)
 */
if (typeof window === 'undefined') {
  try {
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error);
    if (isProduction()) {
      process.exit(1);
    }
  }
}
