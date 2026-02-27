/**
 * Environment Variable Validation
 * Ensures all required environment variables are present at runtime
 * 
 * This file should be imported at application startup (e.g., in layout.tsx)
 * to fail fast if critical configuration is missing.
 */

/**
 * Required environment variables for client-side
 */
const requiredClientEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_MAPBOX_TOKEN',
] as const;

/**
 * Required environment variables for server-side only
 */
const requiredServerEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/**
 * Optional environment variables with defaults
 */
const optionalEnvVars = {
  EXPORTS_BUCKET: 'exports',
  STATE_PACKS_BUCKET: 'state-packs',
} as const;

/**
 * Validate that all required environment variables are present
 * Throws an error if any are missing
 */
export function validateEnv() {
  const missing: string[] = [];

  // Check client-side vars (NEXT_PUBLIC_*)
  for (const varName of requiredClientEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check server-side vars (only on server)
  if (typeof window === 'undefined') {
    for (const varName of requiredServerEnvVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
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

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL must start with https://\n` +
      `Got: ${supabaseUrl}`
    );
  }

  // Validate Mapbox token format
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (mapboxToken && !mapboxToken.startsWith('pk.')) {
    throw new Error(
      `NEXT_PUBLIC_MAPBOX_TOKEN must start with pk.\n` +
      `Got: ${mapboxToken.substring(0, 10)}...`
    );
  }

  // Warn if using default bucket names
  if (typeof window === 'undefined') {
    const exportsBucket = process.env.EXPORTS_BUCKET || optionalEnvVars.EXPORTS_BUCKET;
    const statePacksBucket = process.env.STATE_PACKS_BUCKET || optionalEnvVars.STATE_PACKS_BUCKET;

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
export function getOptionalEnv(
  key: keyof typeof optionalEnvVars
): string {
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
      // In production, fail hard
      process.exit(1);
    }
  }
}
