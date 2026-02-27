import { createBrowserClient } from '@supabase/ssr';

function getEnvValue(value: string | undefined): string | null {
  if (value == null || value.trim().length === 0) {
    return null;
  }
  return value;
}

export function createClient() {
  const supabaseUrl = getEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = getEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createBrowserClient(
    supabaseUrl ?? 'https://placeholder.supabase.co',
    supabaseKey ?? 'placeholder-anon-key'
  );
}
