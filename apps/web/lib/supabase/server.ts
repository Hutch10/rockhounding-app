import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getEnvValue(value: string | undefined): string | null {
  if (value == null || value.trim().length === 0) {
    return null;
  }
  return value;
}

export function createClient() {
  const cookieStore = cookies();
  const supabaseUrl = getEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = getEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createServerClient(
    supabaseUrl ?? 'https://placeholder.supabase.co',
    supabaseKey ?? 'placeholder-anon-key',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
